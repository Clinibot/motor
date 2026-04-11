import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/supabase/rateLimit';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { createLogger, getRequestId } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/retell/calcom/check
 * Finds the next active (non-cancelled) booking for a given phone number.
 * The Cal.com API key is passed in the x-cal-api-key header (not the URL).
 */
export async function POST(request: NextRequest) {
    const log = createLogger('calcom/check', getRequestId(request));
    try {
        // Endpoint secret guard — if FACTORY_CALCOM_SECRET is set, every request must supply it
        const factorySecret = process.env.FACTORY_CALCOM_SECRET;
        if (factorySecret && request.headers.get('x-factory-secret') !== factorySecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const calApiKey = request.headers.get('x-cal-api-key');
        if (!calApiKey) {
            return NextResponse.json({ success: false, error: 'Missing cal_api_key' }, { status: 400 });
        }

        // Rate limit: 60 checks per minute per workspace (keyed by first 16 chars of API key)
        const supabaseAdmin = createSupabaseAdmin();
        const rl = await checkRateLimit(supabaseAdmin, `calcom:check:${calApiKey.slice(0, 16)}`, 60, 60,
            'Demasiadas consultas en poco tiempo. Por favor espera un momento.');
        if (rl) return rl;

        const body = await request.json();
        const args = (body.args as Record<string, unknown>) || body;
        const rawPhone: string = (args.phone_number as string) || '';

        if (!rawPhone) {
            return NextResponse.json({ success: false, error: 'Missing phone_number parameter' }, { status: 400 });
        }

        const normalizedPhone = rawPhone.replace(/[\s\-().]/g, '');

        const bookingsRes = await fetchWithTimeout(
            'https://api.cal.com/v2/bookings?status=upcoming&limit=50',
            {
                headers: {
                    'cal-api-version': '2026-02-25',
                    'Authorization': `Bearer ${calApiKey}`,
                },
            }
        );

        if (!bookingsRes.ok) {
            const errText = await bookingsRes.text();
            log.error('Bookings fetch failed', { status: bookingsRes.status, detail: errText.slice(0, 200) });
            return NextResponse.json({ success: false, error: 'No se pudo consultar las citas.' }, { status: 502 });
        }

        const bookingsData = await bookingsRes.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allBookings: any[] = bookingsData?.data || bookingsData?.bookings || [];

        // Filter to active (non-cancelled) only
        const activeBookings = allBookings.filter((b: { status?: string }) => {
            const s = (b.status || '').toLowerCase();
            return s !== 'cancelled' && s !== 'canceled';
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matched = activeBookings.find((b: any) => {
            const attendees: { phoneNumber?: string; phone?: string }[] = b.attendees || [];
            return attendees.some((a) => {
                const ap = (a.phoneNumber || a.phone || '').replace(/[\s\-().]/g, '');
                return ap && ap === normalizedPhone;
            });
        });

        if (!matched) {
            return NextResponse.json({
                success: false,
                message: `No se encontró ninguna cita activa para el número ${rawPhone}.`,
            });
        }

        const startTime: string = matched.start || matched.startTime || '';
        let formattedDate = startTime;
        try {
            formattedDate = new Date(startTime).toLocaleDateString('es-ES', {
                weekday: 'long', day: 'numeric', month: 'long',
                hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid',
            });
        } catch { /* keep raw */ }

        return NextResponse.json({
            success: true,
            message: `Tienes una cita el ${formattedDate}, hora de Madrid.`,
            booking_uid: matched.uid,
            start: startTime,
        });

    } catch (err: unknown) {
        log.error('Unhandled error', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: 'Error interno al consultar la cita.' }, { status: 500 });
    }
}
