import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { claimIdempotencyKey } from '@/lib/supabase/idempotency';

export const dynamic = 'force-dynamic';

const IDEMPOTENCY_TTL_MS = 30_000;

/**
 * POST /api/retell/calcom/cancel
 * Called by the Retell agent's `cancel_appointment` custom tool.
 * Searches Cal.com for an upcoming booking by the caller's phone number and cancels it.
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
                    return ap && ap === normalizedPhone;
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

        // If already cancelled (found via phone search), return success immediately
        if (bookingStatus === 'cancelled' || bookingStatus === 'canceled') {
            return NextResponse.json({
                success: true,
                message: 'La cita ya estaba cancelada anteriormente. No hay ninguna cita activa pendiente.',
            });
        }

        // Idempotency guard: if Retell double-fires the tool, skip the Cal.com call.
        // Uses Supabase (not in-memory) so it works across all serverless instances.
        const supabaseAdmin = createSupabaseAdmin();
        const iKey = `calcom:cancel:${bookingUid}`;
        const idempotencyResult = await claimIdempotencyKey(supabaseAdmin, iKey, IDEMPOTENCY_TTL_MS);

        if (idempotencyResult === 'duplicate') {
            console.warn(`[calcom/cancel] Duplicate call blocked for uid=${bookingUid}`);
            return NextResponse.json({
                success: true,
                message: 'La cita ya ha sido cancelada en esta sesión.',
            });
        }

        // Cancel the booking.
        // cancelSubsequentBookings: false — only cancel THIS booking, not future recurrences,
        // to avoid sending multiple cancellation emails for recurring events.
        const cancelBody = { cancellationReason: 'Cancelado por el usuario a través del asistente virtual.', cancelSubsequentBookings: false };
        console.log(`[calcom/cancel] Cancelling booking uid=${bookingUid}`, JSON.stringify(cancelBody));
        const cancelRes = await fetch(
            `https://api.cal.com/v2/bookings/${bookingUid}/cancel`,
            {
                method: 'POST',
                headers: {
                    'cal-api-version': '2026-02-25',
                    'Authorization': `Bearer ${calApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cancelBody),
            }
        );

        if (!cancelRes.ok) {
            const errText = await cancelRes.text();
            console.error(`[calcom/cancel] Cal.com ${cancelRes.status} for uid=${bookingUid}:`, errText);

            // Cal.com returns 400 "Can't cancel booking" sometimes when the booking is already cancelled
            // (e.g. Retell double-executes the tool). Verify the actual booking status before failing.
            if (cancelRes.status === 400) {
                const verifyRes = await fetch(
                    `https://api.cal.com/v2/bookings/${bookingUid}`,
                    { headers: { 'cal-api-version': '2026-02-25', 'Authorization': `Bearer ${calApiKey}` } }
                );
                if (verifyRes.ok) {
                    const verifyData = await verifyRes.json();
                    const status = (verifyData?.data?.status || verifyData?.status || '').toLowerCase();
                    if (status === 'cancelled' || status === 'canceled') {
                        console.warn(`[calcom/cancel] Booking ${bookingUid} is already cancelled — returning success`);
                        return NextResponse.json({
                            success: true,
                            message: 'La cita ya había sido cancelada anteriormente. No hay ninguna cita activa pendiente.',
                        });
                    }
                }
                // Booking exists and is NOT cancelled — this is a real error
                console.error(`[calcom/cancel] Real 400 error for uid=${bookingUid}:`, errText);
            }

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
