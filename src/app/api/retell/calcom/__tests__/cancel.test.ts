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
import { POST } from '../cancel/route';

// ── helpers ───────────────────────────────────────────────────────────────────

const CAL_API_KEY = 'cal-api-key-test-1234567890';

function makeRequest(args: Record<string, unknown>, extraHeaders: Record<string, string> = {}) {
    return new NextRequest('http://localhost/api/retell/calcom/cancel', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-cal-api-key': CAL_API_KEY,
            ...extraHeaders,
        },
        body: JSON.stringify({ args }),
    });
}

// A minimal Cal.com bookings list response with one active booking matching +34612345678
function makeBookingsResponse(overrides: Record<string, unknown> = {}) {
    return {
        ok: true,
        json: async () => ({
            data: [{
                uid: 'booking-uid-abc',
                status: 'accepted',
                start: '2026-06-01T10:00:00.000+02:00',
                attendees: [{ name: 'Ana García', phoneNumber: '+34612345678' }],
                ...overrides,
            }],
        }),
    };
}

function cancelOkResponse() {
    return { ok: true, json: async () => ({ status: 'cancelled' }) };
}

function httpErrResponse(status: number, text: string) {
    return { ok: false, status, text: async () => text };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/retell/calcom/cancel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.FACTORY_CALCOM_SECRET;
        mocks.checkRateLimit.mockResolvedValue(null);
        mocks.claimIdempotencyKey.mockResolvedValue('claimed');
        mocks.releaseIdempotencyKey.mockResolvedValue(undefined);
    });

    it('devuelve 400 si falta x-cal-api-key', async () => {
        const req = new NextRequest('http://localhost/api/retell/calcom/cancel', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ args: { phone_number: '+34612345678' } }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('devuelve 400 si faltan phone_number y booking_uid', async () => {
        const res = await POST(makeRequest({}));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error).toMatch(/phone_number|booking_uid/i);
    });

    it('devuelve 502 si Cal.com no responde al buscar citas por teléfono', async () => {
        mocks.fetchWithTimeout.mockResolvedValueOnce(httpErrResponse(503, 'Service Unavailable'));

        const res = await POST(makeRequest({ phone_number: '+34612345678' }));
        expect(res.status).toBe(502);
    });

    it('devuelve success=false si no hay cita activa para el teléfono', async () => {
        mocks.fetchWithTimeout.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [] }), // empty list
        });

        const res = await POST(makeRequest({ phone_number: '+34612345678' }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(false);
        expect(body.message).toMatch(/no se encontró/i);
    });

    it('cancela directamente por booking_uid sin buscar por teléfono', async () => {
        mocks.fetchWithTimeout.mockResolvedValueOnce(cancelOkResponse());

        const res = await POST(makeRequest({ booking_uid: 'booking-uid-abc' }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        // Only one call: the cancel, no bookings list
        expect(mocks.fetchWithTimeout).toHaveBeenCalledOnce();
    });

    it('cancela correctamente cuando se busca por teléfono y lo encuentra', async () => {
        mocks.fetchWithTimeout
            .mockResolvedValueOnce(makeBookingsResponse())  // bookings list
            .mockResolvedValueOnce(cancelOkResponse());     // cancel request

        const res = await POST(makeRequest({ phone_number: '+34612345678' }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.message).toMatch(/cancelada correctamente/i);
    });

    it('bloquea llamada duplicada y devuelve 200 sin llamar a Cal.com cancel', async () => {
        mocks.fetchWithTimeout.mockResolvedValueOnce(makeBookingsResponse());  // bookings list search still runs
        mocks.claimIdempotencyKey.mockResolvedValueOnce('duplicate');

        const res = await POST(makeRequest({ phone_number: '+34612345678' }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        // Only the bookings list call; the cancel call was skipped
        expect(mocks.fetchWithTimeout).toHaveBeenCalledOnce();
    });

    it('libera idempotencia y devuelve 502 cuando Cal.com cancel falla con 5xx', async () => {
        mocks.fetchWithTimeout
            .mockResolvedValueOnce(makeBookingsResponse())                 // bookings list
            .mockResolvedValueOnce(httpErrResponse(503, 'unavailable'));   // cancel → error

        const res = await POST(makeRequest({ phone_number: '+34612345678' }));

        expect(res.status).toBe(502);
        expect(mocks.releaseIdempotencyKey).toHaveBeenCalledOnce();
    });

    it('devuelve success cuando Cal.com cancel retorna 400 pero la cita ya estaba cancelada', async () => {
        mocks.fetchWithTimeout
            .mockResolvedValueOnce(makeBookingsResponse())                              // bookings list
            .mockResolvedValueOnce(httpErrResponse(400, "Can't cancel booking"))       // cancel → 400
            .mockResolvedValueOnce({                                                    // verify → already cancelled
                ok: true,
                json: async () => ({ data: { status: 'cancelled' } }),
            });

        const res = await POST(makeRequest({ phone_number: '+34612345678' }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.message).toMatch(/ya había sido cancelada/i);
        // Idempotency key should NOT be released (operation effectively succeeded)
        expect(mocks.releaseIdempotencyKey).not.toHaveBeenCalled();
    });

    it('normaliza teléfono con espacios y guiones antes de comparar', async () => {
        mocks.fetchWithTimeout.mockResolvedValueOnce(makeBookingsResponse()) // phone in DB: +34612345678
            .mockResolvedValueOnce(cancelOkResponse());

        // Phone passed with spaces and dashes
        const res = await POST(makeRequest({ phone_number: '+34 612-345-678' }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
    });
});
