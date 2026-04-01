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
        const directUid: string = (args.booking_uid as string) || '';

        // Normalize phone: strip spaces, dashes. Keep + prefix.
        const normalizedPhone = rawPhone.replace(/[\s\-().]/g, '');

        let bookingUid: string = directUid;
        let startTime = '';
        let bookingStatus = '';

        // If no uid provided, search by phone
        if (!bookingUid) {
            if (!rawPhone) {
                return NextResponse.json({ success: false, error: 'Se requiere phone_number o booking_uid.' }, { status: 400 });
            }

            const bookingsRes = await fetch(
                'https://api.cal.com/v2/bookings?limit=50',
                { headers: { 'cal-api-version': '2026-02-25', 'Authorization': `Bearer ${calApiKey}` } }
            );

            if (!bookingsRes.ok) {
                const errText = await bookingsRes.text();
                console.error('[calcom/cancel] fetch failed:', bookingsRes.status, errText);
                return NextResponse.json({ success: false, error: 'No se pudo consultar las citas en Cal.com.' }, { status: 502 });
            }

            const bookingsData = await bookingsRes.json();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const allBookings: any[] = bookingsData?.data || bookingsData?.bookings || [];
            const active = allBookings.filter((b: { status?: string }) => {
                const s = (b.status || '').toLowerCase();
                return s !== 'cancelled' && s !== 'canceled';
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const matched = active.find((b: any) => {
                const attendees: { phoneNumber?: string; phone?: string }[] = b.attendees || [];
                return attendees.some((a) => {
                    const ap = (a.phoneNumber || a.phone || '').replace(/[\s\-().]/g, '');
                    return ap && (ap.endsWith(normalizedPhone) || normalizedPhone.endsWith(ap));
                });
            });

            if (!matched) {
                return NextResponse.json({
                    success: false,
                    message: `No se encontró ninguna cita activa para el número ${rawPhone}. Verifica que el número sea correcto.`
                });
            }

            bookingUid = matched.uid;
            startTime = matched.start || matched.startTime || '';
            bookingStatus = matched.status || '';
        }

        // If already cancelled, return success immediately
        if (bookingStatus === 'cancelled' || bookingStatus === 'canceled') {
            return NextResponse.json({
                success: true,
                message: 'La cita ya estaba cancelada anteriormente. No hay ninguna cita activa pendiente.',
            });
        }

        // 3. Cancel the booking
        const cancelRes = await fetch(
            `https://api.cal.com/v2/bookings/${bookingUid}/cancel`,
            {
                method: 'POST',
                headers: {
                    'cal-api-version': '2026-02-25',
                    'Authorization': `Bearer ${calApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cancellationReason: 'Cancelado por el usuario a través del asistente virtual.', cancelSubsequentBookings: true }),
            }
        );

        if (!cancelRes.ok) {
            const errText = await cancelRes.text();
            console.error('[calcom/cancel] Cal.com cancel failed:', cancelRes.status, errText);
            return NextResponse.json(
                { success: false, error: `No se pudo cancelar la cita (Cal.com ${cancelRes.status}): ${errText.slice(0, 200)}` },
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
