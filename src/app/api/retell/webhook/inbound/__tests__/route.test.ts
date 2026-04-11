import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── hoisted mocks ─────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
    fromAdmin: vi.fn(),
    createSupabaseAdminFn: vi.fn(),
    verifyRetellWebhook: vi.fn(),
    fetchWithTimeout: vi.fn(),
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
    // Delegate to mocks.createSupabaseAdminFn so tests can make it throw
    createSupabaseAdmin: (...args: unknown[]) => mocks.createSupabaseAdminFn(...args),
}));

vi.mock('@/lib/retell/webhookAuth', () => ({
    verifyRetellWebhook: mocks.verifyRetellWebhook,
}));

vi.mock('@/lib/fetch-with-timeout', () => ({
    fetchWithTimeout: mocks.fetchWithTimeout,
}));

vi.mock('@/lib/logger', () => ({
    createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    getRequestId: vi.fn(() => 'req-test-id'),
}));

// Stub global fetch (used directly for OpenAI calls)
vi.stubGlobal('fetch', mocks.fetchGlobal);

// Import AFTER all vi.mock calls
import { POST } from '../route';

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Chainable Supabase query mock — mirrors the helper in webhook/__tests__/route.test.ts.
 * Terminal ops (single, maybeSingle) resolve to { data, error }.
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
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => resolver.then(res, rej),
        catch: (rej: (e: unknown) => unknown) => resolver.catch(rej),
    };
    return q;
}

const CAL_CONFIG = {
    enableCalBooking: true,
    calApiKey: 'cal-api-key-test',
    calEventId: '456',
    calSearchDays: '5',
    calTimezone: 'Europe/Madrid',
};

const AGENT_RECORD = {
    id: 'agent-db-id',
    workspace_id: 'ws-test-123',
    configuration: CAL_CONFIG,
};

const WORKSPACE_RECORD = { retell_api_key: 'retell-api-key-test' };

const CAL_SLOTS = {
    data: { '2026-04-15': [{ start: '2026-04-15T09:00:00.000+02:00' }] },
};

/** Sets up the two standard DB lookups: agents → workspaces */
function setupDbLookups(agentOverride?: unknown) {
    mocks.fromAdmin
        .mockImplementationOnce(() => makeQuery(agentOverride ?? AGENT_RECORD))
        .mockImplementationOnce(() => makeQuery(WORKSPACE_RECORD));
}

function makeRequest(body: unknown, signature = 'valid-sig') {
    return new NextRequest('http://localhost/api/retell/webhook/inbound', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-retell-signature': signature,
        },
        body: JSON.stringify(body),
    });
}

function makePayload(callInboundOverrides: Record<string, unknown> = {}) {
    return {
        call_inbound: {
            agent_id: 'retell-agent-xyz',
            ...callInboundOverrides,
        },
    };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/retell/webhook/inbound', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Re-set default behaviors for every test
        mocks.createSupabaseAdminFn.mockReturnValue({ from: mocks.fromAdmin });
        mocks.verifyRetellWebhook.mockResolvedValue(true);
        mocks.fetchWithTimeout.mockResolvedValue({
            ok: true,
            json: async () => CAL_SLOTS,
            text: async () => '',
        });
        // Default OpenAI response (used as fallback; tests can override with Once)
        mocks.fetchGlobal.mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'texto disponibilidad' } }] }),
            text: async () => '',
        });
        process.env.OPENAI_API_KEY = 'test-openai-key';
    });

    afterEach(() => {
        delete process.env.OPENAI_API_KEY;
    });

    // ── Input validation ──────────────────────────────────────────────────────

    it('devuelve 500 si el body no es JSON válido (JSON.parse dentro del try principal)', async () => {
        // Nota: a diferencia de webhook/route.ts, aquí JSON.parse está dentro del try general.
        // Si falla, agent_id no está seteado → el catch devuelve 500.
        const req = new NextRequest('http://localhost/api/retell/webhook/inbound', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-retell-signature': 'sig' },
            body: 'not-json',
        });
        const res = await POST(req);
        expect(res.status).toBe(500);
    });

    it('devuelve 400 si call_inbound está ausente en el payload', async () => {
        const res = await POST(makeRequest({ other: 'data' }));
        expect(res.status).toBe(400);
    });

    it('devuelve 400 si call_inbound.agent_id está ausente', async () => {
        const res = await POST(makeRequest({ call_inbound: { other: 'field' } }));
        expect(res.status).toBe(400);
    });

    // ── Supabase init failure ─────────────────────────────────────────────────

    it('devuelve 200 con _debug: supabase_env_missing si createSupabaseAdmin lanza', async () => {
        mocks.createSupabaseAdminFn.mockImplementationOnce(() => {
            throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
        });

        const res = await POST(makeRequest(makePayload()));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.call_inbound.dynamic_variables._debug).toBe('supabase_env_missing');
        // override_agent_id debe preservarse aunque falle Supabase
        expect(body.call_inbound.override_agent_id).toBe('retell-agent-xyz');
    });

    // ── Agent lookup ──────────────────────────────────────────────────────────

    it('devuelve 200 con _debug: agent_not_found si el agente no existe en la BD', async () => {
        mocks.fromAdmin.mockImplementationOnce(() => makeQuery(null, { message: 'Row not found' }));

        const res = await POST(makeRequest(makePayload()));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.call_inbound.dynamic_variables._debug).toBe('agent_not_found');
        expect(body.call_inbound.override_agent_id).toBe('retell-agent-xyz');
    });

    it('devuelve _debug: agent_not_found si el campo configuration es null', async () => {
        mocks.fromAdmin.mockImplementationOnce(() =>
            makeQuery({ id: 'x', workspace_id: 'ws-x', configuration: null })
        );

        const res = await POST(makeRequest(makePayload()));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.call_inbound.dynamic_variables._debug).toBe('agent_not_found');
    });

    // ── Signature verification ────────────────────────────────────────────────

    it('devuelve 200 con _debug: signature_invalid si la firma es inválida', async () => {
        setupDbLookups();
        mocks.verifyRetellWebhook.mockResolvedValueOnce(false);

        const res = await POST(makeRequest(makePayload(), 'bad-sig'));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.call_inbound.dynamic_variables._debug).toBe('signature_invalid');
        expect(body.call_inbound.override_agent_id).toBe('retell-agent-xyz');
    });

    // ── Cal.com configuration check ───────────────────────────────────────────

    it('devuelve _debug: cal_not_configured si enableCalBooking es false', async () => {
        setupDbLookups({
            ...AGENT_RECORD,
            configuration: { ...CAL_CONFIG, enableCalBooking: false },
        });

        const res = await POST(makeRequest(makePayload()));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.call_inbound.dynamic_variables._debug).toMatch(/^cal_not_configured/);
        expect(body.call_inbound.dynamic_variables._debug).toContain('enabled=false');
    });

    it('devuelve _debug: cal_not_configured si calApiKey no está configurada', async () => {
        setupDbLookups({
            ...AGENT_RECORD,
            configuration: { ...CAL_CONFIG, calApiKey: '' },
        });

        const res = await POST(makeRequest(makePayload()));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.call_inbound.dynamic_variables._debug).toMatch(/^cal_not_configured/);
        expect(body.call_inbound.dynamic_variables._debug).toContain('key=false');
    });

    it('devuelve _debug: cal_not_configured si calEventId no está configurado', async () => {
        setupDbLookups({
            ...AGENT_RECORD,
            configuration: { ...CAL_CONFIG, calEventId: '' },
        });

        const res = await POST(makeRequest(makePayload()));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.call_inbound.dynamic_variables._debug).toMatch(/^cal_not_configured/);
        expect(body.call_inbound.dynamic_variables._debug).toContain('event=false');
    });

    // ── Cal.com fetch ─────────────────────────────────────────────────────────

    it('devuelve _debug: calcom_error si la llamada a Cal.com falla con 404', async () => {
        setupDbLookups();
        mocks.fetchWithTimeout.mockResolvedValueOnce({
            ok: false,
            status: 404,
            text: async () => 'Event type not found',
        });

        const res = await POST(makeRequest(makePayload()));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.call_inbound.dynamic_variables._debug).toMatch(/^calcom_error/);
        expect(body.call_inbound.dynamic_variables._debug).toContain('404');
        expect(body.call_inbound.dynamic_variables._debug).toContain('456'); // calEventId en el mensaje
    });

    it('llama a Cal.com con eventTypeId y timezone correctos', async () => {
        setupDbLookups();

        await POST(makeRequest(makePayload()));

        expect(mocks.fetchWithTimeout).toHaveBeenCalledOnce();
        const [calUrl] = mocks.fetchWithTimeout.mock.calls[0] as [string, ...unknown[]];
        expect(calUrl).toContain('eventTypeId=456');
        expect(calUrl).toContain('Europe%2FMadrid');
    });

    // ── OpenAI key ────────────────────────────────────────────────────────────

    it('devuelve _debug: missing_openai_key si OPENAI_API_KEY no está configurada', async () => {
        setupDbLookups();
        delete process.env.OPENAI_API_KEY;

        const res = await POST(makeRequest(makePayload()));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.call_inbound.dynamic_variables._debug).toBe('missing_openai_key');
    });

    // ── Happy path ────────────────────────────────────────────────────────────

    it('procesa la llamada entrante y devuelve variables dinámicas', async () => {
        setupDbLookups();

        const res = await POST(makeRequest(makePayload()));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.call_inbound.override_agent_id).toBe('retell-agent-xyz');
        expect(body.call_inbound.dynamic_variables).toHaveProperty('disponibilidad_mas_temprana');
        expect(body.call_inbound.dynamic_variables).toHaveProperty('consultar_disponibilidad');
        expect(body.call_inbound.dynamic_variables._debug).toBeUndefined();
    });

    it('las variables dinámicas contienen el texto generado por OpenAI', async () => {
        setupDbLookups();
        // Override default responses with distinct specific texts
        mocks.fetchGlobal
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: 'martes quince a las nueve' } }] }),
                text: async () => '',
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Martes 15 de abril: a las nueve de la mañana.' } }],
                }),
                text: async () => '',
            });

        const res = await POST(makeRequest(makePayload()));
        const body = await res.json();

        expect(body.call_inbound.dynamic_variables.disponibilidad_mas_temprana).toBe(
            'martes quince a las nueve'
        );
        expect(body.call_inbound.dynamic_variables.consultar_disponibilidad).toBe(
            'Martes 15 de abril: a las nueve de la mañana.'
        );
    });

    it('hace exactamente dos llamadas paralelas a OpenAI', async () => {
        setupDbLookups();

        await POST(makeRequest(makePayload()));

        expect(mocks.fetchGlobal).toHaveBeenCalledTimes(2);
        const urls = mocks.fetchGlobal.mock.calls.map(([url]: [string]) => url);
        expect(urls[0]).toContain('openai.com');
        expect(urls[1]).toContain('openai.com');
    });

    it('devuelve variables vacías (sin romper la llamada) si OpenAI falla', async () => {
        setupDbLookups();
        // Override both parallel OpenAI calls with failures
        mocks.fetchGlobal
            .mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'Rate limit exceeded' })
            .mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'Rate limit exceeded' });

        const res = await POST(makeRequest(makePayload()));
        const body = await res.json();

        // Must return 200 so Retell still starts the call
        expect(res.status).toBe(200);
        expect(body.call_inbound.dynamic_variables.disponibilidad_mas_temprana).toBe('');
        expect(body.call_inbound.dynamic_variables.consultar_disponibilidad).toBe('');
        expect(body.call_inbound.dynamic_variables._debug).toBeUndefined();
    });
});
