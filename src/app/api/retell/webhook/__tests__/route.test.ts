import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── hoisted mocks ─────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
    fromAdmin: vi.fn(),
    checkRateLimit: vi.fn(),
    verifyRetellWebhook: vi.fn(),
    reportFactoryError: vi.fn(),
    fetchGlobal: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
    env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    },
}));

vi.mock('@/lib/supabase/admin', () => ({
    createSupabaseAdmin: vi.fn(() => ({ from: mocks.fromAdmin })),
}));

vi.mock('@/lib/supabase/rateLimit', () => ({
    checkRateLimit: mocks.checkRateLimit,
}));

vi.mock('@/lib/retell/webhookAuth', () => ({
    verifyRetellWebhook: mocks.verifyRetellWebhook,
}));

vi.mock('@/lib/alerts/alertNotifier', () => ({
    reportFactoryError: mocks.reportFactoryError,
}));

// Stub global fetch (used for fire-and-forget threshold check after call_analyzed)
vi.stubGlobal('fetch', mocks.fetchGlobal);

// Import handler AFTER all vi.mock calls
import { POST } from '../route';

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Chainable Supabase query mock.
 * Terminal ops (single, insert, upsert) all resolve to { data, error }.
 * The object itself is thenable so `await from().insert([...])` also works.
 */
function makeQuery(data: unknown = null, error: unknown = null) {
    const resolver = Promise.resolve({ data, error });
    const q: Record<string, unknown> = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() => resolver),
        maybeSingle: vi.fn(() => resolver),
        insert: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        // Awaiting the query object directly (for insert/upsert chains)
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => resolver.then(res, rej),
        catch: (rej: (e: unknown) => unknown) => resolver.catch(rej),
    };
    return q;
}

const AGENT_RECORD = { id: 'agent-db-id', workspace_id: 'ws-test-123' };
const WORKSPACE_RECORD = { retell_api_key: 'retell-api-key-test' };

/** Minimal valid Retell call_ended payload */
function makePayload(callOverrides: Record<string, unknown> = {}, event = 'call_ended') {
    return {
        event,
        call: {
            agent_id: 'retell-agent-xyz',
            call_id: 'call-test-123',
            call_status: 'ended',
            call_type: 'phone_call',
            direction: 'inbound',
            from_number: '+34612345678',
            to_number: '+34911234567',
            start_timestamp: 1_000_000,
            end_timestamp: 1_060_000,
            call_cost: { combined_cost: 500 },
            ...callOverrides,
        },
    };
}

function makeRequest(body: unknown, signature = 'valid-sig') {
    return new NextRequest('http://localhost/api/retell/webhook', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-retell-signature': signature,
        },
        body: JSON.stringify(body),
    });
}

/**
 * Sets up fromAdmin for the full happy-path sequence:
 * 1. agents lookup, 2. workspaces lookup, 3. webhook_logs insert,
 * 4. calls select (existing), 5. calls upsert
 */
function setupHappyPath({
    existingCall = null as unknown,
    upsertError = null as unknown,
} = {}) {
    mocks.fromAdmin
        .mockImplementationOnce(() => makeQuery(AGENT_RECORD))           // 1. agents
        .mockImplementationOnce(() => makeQuery(WORKSPACE_RECORD))       // 2. workspaces
        .mockImplementationOnce(() => makeQuery(null))                   // 3. webhook_logs insert
        .mockImplementationOnce(() => makeQuery(existingCall))           // 4. calls select
        .mockImplementationOnce(() => makeQuery(null, upsertError));     // 5. calls upsert
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/retell/webhook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.checkRateLimit.mockResolvedValue(null);          // allow
        mocks.verifyRetellWebhook.mockResolvedValue(true);     // valid signature
        mocks.reportFactoryError.mockResolvedValue(undefined);
        mocks.fetchGlobal.mockResolvedValue({ ok: true });     // threshold check
    });

    // ── Input validation ───────────────────────────────────────────────────────

    it('devuelve 400 si el body no es JSON válido', async () => {
        const req = new NextRequest('http://localhost/api/retell/webhook', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-retell-signature': 'sig' },
            body: 'not-json',
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('devuelve 400 si falta agent_id en el payload', async () => {
        const res = await POST(makeRequest({ event: 'call_ended', call: {} }));
        expect(res.status).toBe(400);
    });

    // ── Agent lookup ───────────────────────────────────────────────────────��───

    it('devuelve 200 con warning si el agente no existe en la BD', async () => {
        mocks.fromAdmin
            .mockImplementationOnce(() => makeQuery(null))   // agents → not found
            .mockImplementationOnce(() => makeQuery(null));  // webhook_logs insert

        const res = await POST(makeRequest(makePayload()));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.warning).toMatch(/not found/i);
    });

    // ── Signature verification ─────────────────────────────────────────────────

    it('devuelve 401 si la firma es inválida', async () => {
        mocks.fromAdmin
            .mockImplementationOnce(() => makeQuery(AGENT_RECORD))
            .mockImplementationOnce(() => makeQuery(WORKSPACE_RECORD));
        mocks.verifyRetellWebhook.mockResolvedValueOnce(false);

        const res = await POST(makeRequest(makePayload(), 'bad-signature'));
        expect(res.status).toBe(401);
    });

    // ── Rate limiting ──────────────────────────────────────────────────────────

    it('devuelve 429 si se supera el rate limit', async () => {
        mocks.fromAdmin
            .mockImplementationOnce(() => makeQuery(AGENT_RECORD))
            .mockImplementationOnce(() => makeQuery(WORKSPACE_RECORD));
        mocks.checkRateLimit.mockResolvedValueOnce(
            new Response(JSON.stringify({ success: false, error: 'Too many requests' }), { status: 429 })
        );

        const res = await POST(makeRequest(makePayload()));
        expect(res.status).toBe(429);
    });

    // ── Happy path: call_ended ─────────────────────────────────────────────────

    it('procesa call_ended y devuelve 200', async () => {
        setupHappyPath();

        const res = await POST(makeRequest(makePayload()));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.received).toBe(true);
    });

    it('calcula duración y guarda el coste correctamente', async () => {
        setupHappyPath();

        await POST(makeRequest(makePayload()));

        // Verify upsert was called with computed fields
        const upsertCall = mocks.fromAdmin.mock.calls[4]; // 5th from() call = calls.upsert
        expect(upsertCall).toBeDefined();
        const upsertQuery = mocks.fromAdmin.mock.results[4].value;
        // The upsert mock function was called with the call record
        expect(upsertQuery.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                duration_ms: 60_000,           // end - start = 1_060_000 - 1_000_000
                call_cost: 5,                  // combined_cost 500 / 100
                customer_number: '+34612345678', // inbound → from_number
                workspace_id: 'ws-test-123',
            }),
            expect.any(Object)
        );
    });

    it('detecta customer_number según dirección: outbound usa to_number', async () => {
        setupHappyPath();

        await POST(makeRequest(makePayload({ direction: 'outbound' })));

        const upsertQuery = mocks.fromAdmin.mock.results[4].value;
        expect(upsertQuery.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ customer_number: '+34911234567' }),
            expect.any(Object)
        );
    });

    it('detecta customer_number como "Web Call" para web_call', async () => {
        setupHappyPath();

        await POST(makeRequest(makePayload({ call_type: 'web_call', direction: undefined, from_number: undefined })));

        const upsertQuery = mocks.fromAdmin.mock.results[4].value;
        expect(upsertQuery.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ customer_number: 'Web Call' }),
            expect.any(Object)
        );
    });

    // ── Happy path: call_analyzed ──────────────────────────────────────────────

    it('procesa call_analyzed, hace upsert y dispara threshold check (fire-and-forget)', async () => {
        setupHappyPath();

        const payload = makePayload({
            call_analysis: {
                custom_analysis_data: { nombre: 'Ana García', interes: 'alto' },
            },
        }, 'call_analyzed');

        const res = await POST(makeRequest(payload));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.received).toBe(true);
        // Threshold check should have been fired
        expect(mocks.fetchGlobal).toHaveBeenCalledWith(
            expect.stringContaining('/api/alerts/check-thresholds'),
            expect.any(Object)
        );
    });

    it('NO dispara threshold check para call_ended', async () => {
        setupHappyPath();

        await POST(makeRequest(makePayload({}, 'call_ended')));

        expect(mocks.fetchGlobal).not.toHaveBeenCalled();
    });

    // ── Merging logic ──────────────────────────────────────────────────────────

    it('preserva custom_variables existentes si el nuevo evento no trae análisis', async () => {
        const existingCall = {
            call_analysis: {
                custom_variables: { nombre: 'Carlos', telefono: '+34600111222' },
            },
        };
        setupHappyPath({ existingCall });

        // call_ended with no call_analysis — should keep existing vars
        await POST(makeRequest(makePayload({ call_analysis: undefined })));

        const upsertQuery = mocks.fromAdmin.mock.results[4].value;
        expect(upsertQuery.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                call_analysis: expect.objectContaining({
                    custom_variables: { nombre: 'Carlos', telefono: '+34600111222' },
                }),
            }),
            expect.any(Object)
        );
    });

    it('parchea variable de teléfono con valor "0" usando el número real del cliente', async () => {
        setupHappyPath();

        const payload = makePayload({
            call_analysis: {
                custom_variables: { telefono_cliente: '0', nombre: 'Pedro' },
            },
        });

        await POST(makeRequest(payload));

        const upsertQuery = mocks.fromAdmin.mock.results[4].value;
        expect(upsertQuery.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                call_analysis: expect.objectContaining({
                    custom_variables: expect.objectContaining({
                        telefono_cliente: '+34612345678', // patched from from_number
                        nombre: 'Pedro',                 // unchanged
                    }),
                }),
            }),
            expect.any(Object)
        );
    });

    // ── Error handling ─────────────────────────────────────────────────────────

    it('devuelve 200 (no 500) cuando el upsert falla — evita reintento de Retell', async () => {
        const upsertError = { message: 'connection timeout', code: '08006' };
        setupHappyPath({ upsertError });
        // 6th from() call: webhook_logs insert for the error
        mocks.fromAdmin.mockImplementationOnce(() => makeQuery(null));

        const res = await POST(makeRequest(makePayload()));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.warning).toMatch(/not persisted/i);
        expect(mocks.reportFactoryError).toHaveBeenCalledOnce();
    });
});
