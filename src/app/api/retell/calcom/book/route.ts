import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { claimIdempotencyKey, releaseIdempotencyKey } from '@/lib/supabase/idempotency';

export const dynamic = 'force-dynamic';

const IDEMPOTENCY_TTL_MS = 60_000;

function bookingKey(eventTypeId: string, startTime: string, identity: string): string {
    return `calcom:book:${eventTypeId}|${startTime}|${identity}`;
}

/**
 * POST /api/retell/calcom/book?event_type_id=...
 * Called by the Retell agent's `book_appointment` custom tool.
 * Accepts the exact ISO slot string from Cal.com availability and creates the booking.
 * The Cal.com API key is passed in the x-cal-api-key header (not the URL).
 */
export async function POST(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;

        // Endpoint secret guard — if FACTORY_CALCOM_SECRET is set, every request must supply it
        const factorySecret = process.env.FACTORY_CALCOM_SECRET;
        if (factorySecret && searchParams.get('fs') !== factorySecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const calApiKey = request.headers.get('x-cal-api-key');
        const eventTypeId = searchParams.get('event_type_id');

        if (!calApiKey || !eventTypeId) {
            return NextResponse.json({ success: false, error: 'Missing cal_api_key or event_type_id' }, { status: 400 });
        }

        const rawText = await request.text();
        console.log('[calcom/book] Raw body:', rawText);

        let body: Record<string, unknown> = {};
        try {
            body = JSON.parse(rawText);
        } catch {
            return NextResponse.json({ success: false, error: `Body is not valid JSON: ${rawText.slice(0, 200)}` }, { status: 400 });
        }

        console.log('[calcom/book] Parsed body keys:', Object.keys(body));

        // Retell wraps custom tool parameters inside body.args
        const args = (body.args as Record<string, unknown>) || body;

        const start_time = args.start_time as string;
        const name = args.name as string;
        const email = args.email as string;
        const phone = args.phone as string;

        if (!start_time || !name) {
            return NextResponse.json({ success: false, error: `Missing fields — received args keys: ${Object.keys(args).join(', ')}` }, { status: 400 });
        }

        // Validate that start_time is a parseable ISO date
        const parsedDate = new Date(start_time);
        if (isNaN(parsedDate.getTime())) {
            return NextResponse.json({
                success: false,
                error: `Formato de fecha inválido: "${start_time}". Debe ser ISO 8601 con offset, ej: "2026-04-07T10:00:00.000+02:00".`
            }, { status: 400 });
        }

        // Use a placeholder email if none provided or invalid format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const safeEmail = email && emailRegex.test(email) ? email : 'sin-email@reserva.local';

        // Normalize phone to E.164: if no + prefix, assume Spanish (+34)
        let safePhone = phone ? phone.replace(/[\s\-().]/g, '') : '';
        if (safePhone && !safePhone.startsWith('+')) {
            safePhone = '+34' + safePhone;
        }

        console.log(`[calcom/book] Booking event ${eventTypeId} at ${start_time} for ${name} <${safeEmail}> ${safePhone}`);

        // Idempotency: block duplicate tool executions from Retell within 60 s.
        // Uses Supabase (not in-memory) so it works across all serverless instances.
        const supabaseAdmin = createSupabaseAdmin();
        const iKey = bookingKey(eventTypeId, start_time, safeEmail || safePhone);
        const idempotencyResult = await claimIdempotencyKey(supabaseAdmin, iKey, IDEMPOTENCY_TTL_MS);

        if (idempotencyResult === 'duplicate') {
            console.warn(`[calcom/book] Duplicate call blocked for key=${iKey}`);
            return NextResponse.json({
                success: true,
                message: 'La cita ya fue registrada en esta sesión. Recibirás el correo de confirmación en breve.',
            });
        }

        const bookingBody: Record<string, unknown> = {
            start: start_time,
            eventTypeId: parseInt(eventTypeId, 10),
            attendee: {
                name,
                email: safeEmail,
                timeZone: 'Europe/Madrid',
                language: 'es',
                ...(safePhone ? { phoneNumber: safePhone } : {}),
            },
            bookingFieldsResponses: {
                email: safeEmail,
                name,
                ...(safePhone ? { attendeePhoneNumber: safePhone } : {}),
            },
        };

        const res = await fetch('https://api.cal.com/v2/bookings', {
            method: 'POST',
            headers: {
                'cal-api-version': '2026-02-25',
                'Authorization': `Bearer ${calApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingBody),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error('[calcom/book] Cal.com API error:', res.status, errText);
            console.error('[calcom/book] Sent body:', JSON.stringify(bookingBody));

            // Release the idempotency lock so the agent can retry on real errors
            await releaseIdempotencyKey(supabaseAdmin, iKey);

            let userMsg = `Cal.com ${res.status}: ${errText.slice(0, 300)}`;
            if (res.status === 409 || errText.includes('already has booking') || errText.includes('not available')) {
                userMsg = 'Ese horario acaba de ocuparse. Por favor elige otro.';
            }
            return NextResponse.json({ success: false, error: userMsg }, { status: 400 });
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
