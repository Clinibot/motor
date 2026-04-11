import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── hoisted mocks (available inside vi.mock factories) ────────────────────────
const mocks = vi.hoisted(() => ({
    // Retell SDK
    llmCreate: vi.fn(),
    llmUpdate: vi.fn(),
    agentCreate: vi.fn(),
    agentUpdate: vi.fn(),
    agentPublish: vi.fn(),
    voiceList: vi.fn(),
    phoneNumberUpdate: vi.fn(),
    // Supabase server (session)
    getSession: vi.fn(),
    // Supabase admin (queryable via from())
    fromAdmin: vi.fn(),
    // Supabase admin rpc (used by resolveUserWorkspace and checkRateLimit)
    rpcAdmin: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
    env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    },
}));

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() =>
        Promise.resolve({ auth: { getSession: mocks.getSession } })
    ),
}));

vi.mock('@/lib/supabase/admin', () => ({
    createSupabaseAdmin: vi.fn(() => ({ from: mocks.fromAdmin, rpc: mocks.rpcAdmin })),
}));

vi.mock('retell-sdk', () => ({
    // Must use regular function (not arrow) so `new Retell(...)` works in Vitest v4.
    default: vi.fn().mockImplementation(function () {
        return {
            llm: { create: mocks.llmCreate, update: mocks.llmUpdate },
            agent: {
                create: mocks.agentCreate,
                update: mocks.agentUpdate,
                publish: mocks.agentPublish,
            },
            voice: { list: mocks.voiceList },
            phoneNumber: { update: mocks.phoneNumberUpdate },
        };
    }),
}));

vi.mock('@/lib/retell/sip-enrichment', () => ({
    enrichSipCredentials: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/alerts/alertNotifier', () => ({
    reportFactoryError: vi.fn().mockResolvedValue(undefined),
}));

// Import handlers AFTER all vi.mock calls
import { POST, PATCH } from '../route';

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Creates a Supabase-style chainable query mock.
 * - Chaining methods (select/eq/not/order/limit/update/delete) return `this`.
 * - Terminal methods (single/insert) return a resolved promise.
 * - The chain itself is awaitable via `then`/`catch` (used by update/delete chains).
 */
function makeQuery(data: unknown = null, error: unknown = null) {
    const resolver = Promise.resolve({ data, error });
    const q: Record<string, unknown> = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data, error }),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data, error }),
        // Makes `await chain` work for update(...).eq(...) patterns
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
            resolver.then(resolve, reject),
        catch: (reject: (e: unknown) => unknown) => resolver.catch(reject),
        finally: (cb: () => unknown) => resolver.finally(cb),
    };
    return q;
}

function makeRequest(body: unknown, method = 'POST') {
    return new Request('http://localhost/api/retell/agent', {
        method,
        headers: { 'content-type': 'application/json', host: 'localhost' },
        body: JSON.stringify(body),
    });
}

// ── fixtures ──────────────────────────────────────────────────────────────────

// Must match the shape Supabase returns: { data: { session: { user: { id } } } }
const SESSION_USER = { session: { user: { id: 'user-123' } } };

const BASE_POST_PAYLOAD = {
    agentName: 'Agente de Prueba',
    companyName: 'Empresa Test',
    agentType: 'Inbound',
    prompt: 'Eres un asistente de prueba.',
    workspace_id: 'ws-test-123',
    enableTransfer: false,
    transferDestinations: [],
};

const CURRENT_AGENT_FIXTURE = {
    id: 'agent-db-id',
    workspace_id: 'ws-test-123',
    retell_agent_id: 'retell-agent-xyz',
    retell_llm_id: 'retell-llm-abc',
    configuration: {
        voiceId: '11labs-Adrian',
        voiceName: 'Adrian',
    },
};

// ── POST tests ────────────────────────────────────────────────────────────────

describe('POST /api/retell/agent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default happy-path values; individual tests override with mockResolvedValueOnce
        mocks.getSession.mockResolvedValue({ data: SESSION_USER });
        mocks.voiceList.mockResolvedValue([]);
        mocks.llmCreate.mockResolvedValue({ llm_id: 'llm-new-123' });
        mocks.agentCreate.mockResolvedValue({ agent_id: 'agent-new-456' });
        mocks.agentPublish.mockResolvedValue(undefined);
        // Default: any from() call returns empty/null (safe fallback)
        mocks.fromAdmin.mockImplementation(() => makeQuery(null));
        // Default: rpc calls return "allowed" (true) so rate limiting passes
        mocks.rpcAdmin.mockResolvedValue({ data: true, error: null });
    });

    it('devuelve 401 cuando no hay sesión activa', async () => {
        mocks.getSession.mockResolvedValueOnce({ data: { session: null } });

        const res = await POST(makeRequest(BASE_POST_PAYLOAD));
        const body = await res.json();

        expect(res.status).toBe(401);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/Unauthorized/i);
    });

    it('devuelve 400 cuando el workspace no tiene Retell API Key', async () => {
        mocks.getSession.mockResolvedValueOnce({ data: SESSION_USER });
        // workspace query returns no api key
        mocks.fromAdmin.mockImplementationOnce(() =>
            makeQuery(null, { message: 'no rows returned' })
        );

        const res = await POST(makeRequest(BASE_POST_PAYLOAD));
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/Retell API Key/i);
    });

    it('devuelve 200 con published:true cuando todo va bien', async () => {
        mocks.getSession.mockResolvedValueOnce({ data: SESSION_USER });
        mocks.fromAdmin
            .mockImplementationOnce(() => makeQuery({ retell_api_key: 'retell-key-ok' })) // workspaces
            .mockImplementationOnce(() => makeQuery(null));                                 // agents insert

        const res = await POST(makeRequest(BASE_POST_PAYLOAD));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.published).toBe(true);
        expect(body.agent_id).toBe('agent-new-456');
        expect(body.llm_id).toBe('llm-new-123');
        expect(body.publish_warning).toBeUndefined();
    });

    it('reintenta con voz de fallback (11labs-Adrian) si Retell devuelve "not found from voice"', async () => {
        mocks.getSession.mockResolvedValueOnce({ data: SESSION_USER });
        mocks.fromAdmin
            .mockImplementationOnce(() => makeQuery({ retell_api_key: 'retell-key-ok' }))
            .mockImplementationOnce(() => makeQuery(null));
        // First agent.create fails with voice error; second succeeds with fallback
        mocks.agentCreate
            .mockRejectedValueOnce(new Error('Voice not found from voice list'))
            .mockResolvedValueOnce({ agent_id: 'agent-fallback-789' });

        const res = await POST(makeRequest(BASE_POST_PAYLOAD));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.agent_id).toBe('agent-fallback-789');
        // Must have been called twice: once with original voice, once with fallback
        expect(mocks.agentCreate).toHaveBeenCalledTimes(2);
        expect(mocks.agentCreate.mock.calls[1][0]).toMatchObject({ voice_id: '11labs-Adrian' });
    });

    it('devuelve published:false con publish_warning si agent.publish falla', async () => {
        mocks.getSession.mockResolvedValueOnce({ data: SESSION_USER });
        mocks.fromAdmin
            .mockImplementationOnce(() => makeQuery({ retell_api_key: 'retell-key-ok' }))
            .mockImplementationOnce(() => makeQuery(null));
        mocks.agentPublish.mockRejectedValueOnce(new Error('Publish limit reached'));

        const res = await POST(makeRequest(BASE_POST_PAYLOAD));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.published).toBe(false);
        expect(body.publish_warning).toBe('Publish limit reached');
    });
});

// ── PATCH tests ───────────────────────────────────────────────────────────────

describe('PATCH /api/retell/agent', () => {
    const PATCH_PAYLOAD = { ...BASE_POST_PAYLOAD, id: 'agent-db-id' };

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.voiceList.mockResolvedValue([]);
        mocks.llmUpdate.mockResolvedValue({ llm_id: 'retell-llm-abc' });
        mocks.agentUpdate.mockResolvedValue(undefined);
        mocks.agentPublish.mockResolvedValue(undefined);
        mocks.phoneNumberUpdate.mockResolvedValue(undefined);
        mocks.fromAdmin.mockImplementation(() => makeQuery(null));
        // Default: rpc calls return "allowed" (true) so rate limiting passes
        mocks.rpcAdmin.mockResolvedValue({ data: true, error: null });
    });

    it('devuelve 404 cuando el agente no existe en Supabase', async () => {
        mocks.fromAdmin.mockImplementationOnce(() =>
            makeQuery(null, { message: 'Row not found' }) // agents select → not found
        );

        const res = await PATCH(makeRequest(PATCH_PAYLOAD, 'PATCH'));
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.success).toBe(false);
        expect(body.error).toBe('Agent not found');
    });

    it('devuelve 200 con published:true cuando la actualización tiene éxito', async () => {
        mocks.fromAdmin
            .mockImplementationOnce(() => makeQuery(CURRENT_AGENT_FIXTURE))           // agents select
            .mockImplementationOnce(() => makeQuery({ retell_api_key: 'key-ok' }))    // workspaces select
            .mockImplementationOnce(() => makeQuery(null))                             // agents update
            .mockImplementationOnce(() => makeQuery([]));                              // phone_numbers select

        const res = await PATCH(makeRequest(PATCH_PAYLOAD, 'PATCH'));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.published).toBe(true);
        expect(body.agent_id).toBe('retell-agent-xyz');
        expect(body.publish_warning).toBeUndefined();
        expect(mocks.llmUpdate).toHaveBeenCalledOnce();
        expect(mocks.agentPublish).toHaveBeenCalledWith('retell-agent-xyz');
    });

    it('devuelve published:false con publish_warning si publish falla en PATCH', async () => {
        mocks.fromAdmin
            .mockImplementationOnce(() => makeQuery(CURRENT_AGENT_FIXTURE))
            .mockImplementationOnce(() => makeQuery({ retell_api_key: 'key-ok' }))
            .mockImplementationOnce(() => makeQuery(null))
            .mockImplementationOnce(() => makeQuery([]));
        mocks.agentPublish.mockRejectedValueOnce(new Error('Version limit exceeded'));

        const res = await PATCH(makeRequest(PATCH_PAYLOAD, 'PATCH'));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.published).toBe(false);
        expect(body.publish_warning).toBe('Version limit exceeded');
    });
});
