import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/retell/calcom/cancel?cal_api_key=...
 * Called by the Retell agent's `cancel_appointment` custom tool.
 * Searches Cal.com for an upcoming booking by the caller's phone number and cancels it.
 */
export async function POST(request: NextRequest) {
    try {
        const calApiKey = request.nextUrl.searchParams.get('cal_api_key');
        if (!calApiKey) {
            return NextResponse.json({ success: false, error: 'Missing cal_api_key' }, { status: 400 });
        }

        const body = await request.json();
        // Retell wraps custom tool parameters inside body.args
        const args = (body.args as Record<string, unknown>) || body;
        const rawPhone: string = (args.phone_number as string) || '';

        if (!rawPhone) {
            return NextResponse.json({ success: false, error: 'Missing phone_number parameter' }, { status: 400 });
        }

        // Normalize phone: strip spaces, dashes. Keep + prefix.
        const normalizedPhone = rawPhone.replace(/[\s\-().]/g, '');

        // 1. Fetch upcoming bookings from Cal.com v2
        const bookingsRes = await fetch(
            'https://api.cal.com/v2/bookings?status=upcoming&limit=50',
            {
                headers: {
                    'cal-api-version': '2024-08-13',
                    'Authorization': `Bearer ${calApiKey}`,
                },
            }
        );

        if (!bookingsRes.ok) {
            const errText = await bookingsRes.text();
            console.error('Cal.com bookings fetch failed:', bookingsRes.status, errText);
            return NextResponse.json(
                { success: false, error: 'No se pudo consultar las citas en Cal.com.' },
                { status: 502 }
            );
        }

        const bookingsData = await bookingsRes.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bookings: any[] = bookingsData?.data || bookingsData?.bookings || [];

        if (bookings.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No se encontraron citas próximas en la agenda.'
            });
        }

        // 2. Find a booking where the attendee's phone matches the caller's number
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matchedBooking = bookings.find((b: any) => {
            const attendees: { phoneNumber?: string; phone?: string }[] = b.attendees || [];
            return attendees.some((a) => {
                const attendeePhone = (a.phoneNumber || a.phone || '').replace(/[\s\-().]/g, '');
                if (!attendeePhone) return false;
                // Match if one ends with the other (handles country code variants)
                return attendeePhone.endsWith(normalizedPhone) || normalizedPhone.endsWith(attendeePhone);
            });
        });

        if (!matchedBooking) {
            return NextResponse.json({
                success: false,
                message: `No se encontró ninguna cita asociada al número ${rawPhone}. Verifica que el número sea correcto.`
            });
        }

        const bookingUid: string = matchedBooking.uid;
        const startTime: string = matchedBooking.start || matchedBooking.startTime || '';

        // 3. Cancel the booking
        const cancelRes = await fetch(
            `https://api.cal.com/v2/bookings/${bookingUid}/cancel`,
            {
                method: 'POST',
                headers: {
                    'cal-api-version': '2024-08-13',
                    'Authorization': `Bearer ${calApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: 'Cancelado por el usuario a través del asistente virtual.' }),
            }
        );

        if (!cancelRes.ok) {
            const errText = await cancelRes.text();
            console.error('Cal.com cancel failed:', cancelRes.status, errText);
            return NextResponse.json(
                { success: false, error: 'No se pudo cancelar la cita. Inténtalo de nuevo más tarde.' },
                { status: 502 }
            );
        }

        // Format the start time for voice feedback
        let formattedDate = startTime;
        try {
            const d = new Date(startTime);
            formattedDate = d.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Madrid',
            });
        } catch {
            // keep raw if formatting fails
        }

        return NextResponse.json({
            success: true,
            message: `La cita del ${formattedDate} ha sido cancelada correctamente. El usuario recibirá una confirmación por correo electrónico.`,
        });

    } catch (err: unknown) {
        console.error('Error in calcom cancel route:', err);
        return NextResponse.json(
            { success: false, error: 'Error interno al procesar la cancelación.' },
            { status: 500 }
        );
    }
}
