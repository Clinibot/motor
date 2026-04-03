import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { verifyRetellWebhook } from '../webhookAuth';

function makeSignature(secret: string, body: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifyRetellWebhook', () => {

    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('devuelve true y avisa si no hay secret configurado (modo degradado)', async () => {
        const result = await verifyRetellWebhook('cualquier-body', 'cualquier-firma', undefined);
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('RETELL_WEBHOOK_SECRET not set')
        );
    });

    it('devuelve false y avisa si falta la cabecera x-retell-signature', async () => {
        const result = await verifyRetellWebhook('body', null, 'mi-secret');
        expect(result).toBe(false);
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('Missing x-retell-signature')
        );
    });

    it('devuelve true cuando la firma HMAC-SHA256 es correcta', async () => {
        const secret = 'super-secret';
        const body = JSON.stringify({ event: 'call_started', call_id: 'abc123' });
        const signature = makeSignature(secret, body);

        const result = await verifyRetellWebhook(body, signature, secret);
        expect(result).toBe(true);
    });

    it('devuelve false cuando la firma no coincide', async () => {
        const result = await verifyRetellWebhook('body', 'firma-incorrecta', 'mi-secret');
        expect(result).toBe(false);
    });

    it('distingue bodies distintos — firma de un body no vale para otro', async () => {
        const secret = 'mi-secret';
        const firmaDe = (body: string) => makeSignature(secret, body);

        const bodyOriginal = '{"event":"call_started"}';
        const bodyManipulado = '{"event":"call_ended"}';

        const result = await verifyRetellWebhook(bodyManipulado, firmaDe(bodyOriginal), secret);
        expect(result).toBe(false);
    });
});
