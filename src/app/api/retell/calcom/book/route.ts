import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/retell/calcom/book?cal_api_key=...&event_type_id=...
 * Called by the Retell agent's `book_appointment` custom tool.
 * Accepts the exact ISO slot string from Cal.com availability and creates the booking.
 */
export async function POST(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const calApiKey = searchParams.get('cal_api_key');
        const eventTypeId = searchParams.get('event_type_id');

        if (!calApiKey || !eventTypeId) {
            return NextResponse.json({ success: false, error: 'Missing cal_api_key or event_type_id' }, { status: 400 });
        }

        const body = await request.json();
        const { start_time, name, email, phone } = body;

        if (!start_time || !name || !email) {
            return NextResponse.json({ success: false, error: 'Missing required fields: start_time, name, email' }, { status: 400 });
        }

        // Validate that start_time is a parseable ISO date
        const parsedDate = new Date(start_time);
        if (isNaN(parsedDate.getTime())) {
            return NextResponse.json({
                success: false,
                error: `Formato de fecha inválido: "${start_time}". Debe ser ISO 8601 con offset, ej: "2026-04-07T10:00:00.000+02:00".`
            }, { status: 400 });
        }

        console.log(`[calcom/book] Booking event ${eventTypeId} at ${start_time} for ${name} <${email}> ${phone || ''}`);

        const bookingBody: Record<string, unknown> = {
            start: start_time,
            eventTypeId: parseInt(eventTypeId, 10),
            attendee: {
                name,
                email,
                timeZone: 'Europe/Madrid',
                language: 'es',
                ...(phone ? { phoneNumber: phone } : {}),
            },
        };

        const res = await fetch('https://api.cal.com/v2/bookings', {
            method: 'POST',
            headers: {
                'cal-api-version': '2024-08-13',
                'Authorization': `Bearer ${calApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingBody),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error('[calcom/book] Cal.com API error:', res.status, errText);

            let userMsg = 'No se pudo confirmar la cita. ';
            if (res.status === 409 || errText.includes('already has booking') || errText.includes('not available')) {
                userMsg += 'Ese horario acaba de ocuparse. Por favor elige otro.';
            } else {
                userMsg += 'Por favor inténtalo de nuevo.';
            }
            return NextResponse.json({ success: false, error: userMsg }, { status: res.status });
        }

        const data = await res.json();
        const booking = data?.data || data;
        const confirmedStart: string = booking?.start || start_time;

        let formattedDate = confirmedStart;
        try {
            formattedDate = new Date(confirmedStart).toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Madrid',
            });
        } catch { /* keep raw */ }

        return NextResponse.json({
            success: true,
            message: `Perfecto. Tu cita está confirmada para el ${formattedDate}, hora de Madrid. Recibirás un correo de confirmación en unos minutos.`,
            booking_uid: booking?.uid,
        });

    } catch (err: unknown) {
        console.error('[calcom/book] Internal error:', err);
        return NextResponse.json({ success: false, error: 'Error interno al procesar la reserva.' }, { status: 500 });
    }
}
