import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── hoisted mocks ─────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
    checkRateLimit: vi.fn(),
    claimIdempotencyKey: vi.fn(),
    releaseIdempotencyKey: vi.fn(),
    fetchWithTimeout: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
    env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    },
}));

vi.mock('@/lib/supabase/admin', () => ({
    createSupabaseAdmin: vi.fn(() => ({})),
}));

vi.mock('@/lib/supabase/rateLimit', () => ({
    checkRateLimit: mocks.checkRateLimit,
}));

vi.mock('@/lib/supabase/idempotency', () => ({
    claimIdempotencyKey: mocks.claimIdempotencyKey,
    releaseIdempotencyKey: mocks.releaseIdempotencyKey,
}));

vi.mock('@/lib/fetch-with-timeout', () => ({
    fetchWithTimeout: mocks.fetchWithTimeout,
}));

// Import handler AFTER all vi.mock calls
import { POST } from '../book/route';

// ── helpers ───────────────────────────────────────────────────────────────────

const CAL_API_KEY = 'cal-api-key-test-1234567890';
const EVENT_TYPE_ID = '42';

function makeRequest(args: Record<string, unknown>, extraHeaders: Record<string, string> = {}) {
    return new NextRequest(
        `http://localhost/api/retell/calcom/book?event_type_id=${EVENT_TYPE_ID}`,
        {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-cal-api-key': CAL_API_KEY,
                ...extraHeaders,
            },
            body: JSON.stringify({ args }),
        }
    );
}

function calOkResponse(uid = 'booking-uid-123', start = '2026-05-15T10:00:00.000+02:00') {
    return { ok: true, json: async () => ({ data: { uid, start } }) };
}

function calErrResponse(status: number, text: string) {
    return { ok: false, status, text: async () => text };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/retell/calcom/book', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.FACTORY_CALCOM_SECRET;
        mocks.checkRateLimit.mockResolvedValue(null);       // not rate limited
        mocks.claimIdempotencyKey.mockResolvedValue('claimed');
        mocks.releaseIdempotencyKey.mockResolvedValue(undefined);
        mocks.fetchWithTimeout.mockResolvedValue(calOkResponse());
    });

    it('devuelve 400 si falta x-cal-api-key', async () => {
        const req = new NextRequest(
            `http://localhost/api/retell/calcom/book?event_type_id=${EVENT_TYPE_ID}`,
            {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ args: { start_time: '2026-05-15T10:00:00.000+02:00', name: 'Ana' } }),
            }
        );
        const res = await POST(req);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toMatch(/cal_api_key/i);
    });

    it('devuelve 400 si falta event_type_id en la URL', async () => {
        const req = new NextRequest('http://localhost/api/retell/calcom/book', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-cal-api-key': CAL_API_KEY },
            body: JSON.stringify({ args: { start_time: '2026-05-15T10:00:00.000+02:00', name: 'Ana' } }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('devuelve 400 si start_time no es una fecha ISO válida', async () => {
        const res = await POST(makeRequest({ start_time: 'mañana a las diez', name: 'Ana' }));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error).toMatch(/ISO 8601/i);
    });

    it('devuelve 400 si falta name en los args', async () => {
        const res = await POST(makeRequest({ start_time: '2026-05-15T10:00:00.000+02:00' }));
        expect(res.status).toBe(400);
    });

    it('bloquea llamada duplicada y devuelve 200 sin llamar a Cal.com', async () => {
        mocks.claimIdempotencyKey.mockResolvedValueOnce('duplicate');

        const res = await POST(makeRequest({ start_time: '2026-05-15T10:00:00.000+02:00', name: 'Ana' }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mocks.fetchWithTimeout).not.toHaveBeenCalled();
    });

    it('crea la cita correctamente y devuelve booking_uid', async () => {
        const res = await POST(makeRequest({
            start_time: '2026-05-15T10:00:00.000+02:00',
            name: 'Ana García',
            email: 'ana@example.com',
        }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.booking_uid).toBe('booking-uid-123');
        expect(mocks.releaseIdempotencyKey).not.toHaveBeenCalled();
    });

    it('normaliza teléfono sin prefijo añadiendo +34', async () => {
        await POST(makeRequest({
            start_time: '2026-05-15T10:00:00.000+02:00',
            name: 'Ana García',
            phone: '612345678',
        }));

        const sentBody = JSON.parse(mocks.fetchWithTimeout.mock.calls[0][1].body);
        expect(sentBody.attendee.phoneNumber).toBe('+34612345678');
    });

    it('respeta prefijo + existente sin modificarlo', async () => {
        await POST(makeRequest({
            start_time: '2026-05-15T10:00:00.000+02:00',
            name: 'Ana García',
            phone: '+34612345678',
        }));

        const sentBody = JSON.parse(mocks.fetchWithTimeout.mock.calls[0][1].body);
        expect(sentBody.attendee.phoneNumber).toBe('+34612345678');
    });

    it('usa email placeholder cuando el email tiene formato inválido', async () => {
        await POST(makeRequest({
            start_time: '2026-05-15T10:00:00.000+02:00',
            name: 'Ana García',
            email: 'not-valid',
        }));

        const sentBody = JSON.parse(mocks.fetchWithTimeout.mock.calls[0][1].body);
        expect(sentBody.attendee.email).toBe('sin-email@reserva.local');
    });

    it('libera la clave de idempotencia y devuelve 400 cuando Cal.com falla', async () => {
        mocks.fetchWithTimeout.mockResolvedValueOnce(calErrResponse(500, 'Internal Server Error'));

        const res = await POST(makeRequest({ start_time: '2026-05-15T10:00:00.000+02:00', name: 'Ana' }));

        expect(res.status).toBe(400);
        expect(mocks.releaseIdempotencyKey).toHaveBeenCalledOnce();
    });

    it('devuelve mensaje "horario ocupado" cuando Cal.com responde 409', async () => {
        mocks.fetchWithTimeout.mockResolvedValueOnce(calErrResponse(409, 'already has booking at this time'));

        const res = await POST(makeRequest({ start_time: '2026-05-15T10:00:00.000+02:00', name: 'Ana' }));
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error).toMatch(/horario acaba de ocuparse/i);
    });

    it('devuelve 401 si el factory secret no coincide', async () => {
        process.env.FACTORY_CALCOM_SECRET = 'correct-secret';

        const res = await POST(makeRequest(
            { start_time: '2026-05-15T10:00:00.000+02:00', name: 'Ana' },
            { 'x-factory-secret': 'wrong-secret' }
        ));

        expect(res.status).toBe(401);
        expect(mocks.fetchWithTimeout).not.toHaveBeenCalled();
    });
});
