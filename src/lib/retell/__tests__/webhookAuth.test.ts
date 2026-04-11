import { describe, it, expect, vi, beforeEach } from 'vitest';
import Retell from 'retell-sdk';
import { verifyRetellWebhook } from '../webhookAuth';

describe('verifyRetellWebhook', () => {

    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    // Best-effort mode: all calls return true and never block the webhook.
    // Invalid/missing inputs log a warning but still let the request through.

    it('devuelve true y avisa si no hay API key disponible', async () => {
        const result = await verifyRetellWebhook('cualquier-body', 'cualquier-firma', undefined);
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('No API key available')
        );
    });

    it('devuelve true y avisa si falta la cabecera x-retell-signature', async () => {
        const result = await verifyRetellWebhook('body', null, 'mi-api-key');
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('Missing x-retell-signature')
        );
    });

    it('devuelve true cuando la firma generada por el SDK de Retell es correcta', async () => {
        const apiKey = 'test-retell-api-key';
        const body = JSON.stringify({ event: 'call_started', call_id: 'abc123' });
        const signature = await Retell.sign(body, apiKey);

        const result = await verifyRetellWebhook(body, signature, apiKey);
        expect(result).toBe(true);
    });

    it('devuelve true y avisa cuando la firma no coincide (best-effort)', async () => {
        const result = await verifyRetellWebhook('body', 'v=1234567890,d=firma-incorrecta', 'mi-api-key');
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('Signature mismatch')
        );
    });

    it('devuelve true y avisa con firma de body distinto (best-effort)', async () => {
        const apiKey = 'mi-api-key';
        const bodyOriginal = '{"event":"call_started"}';
        const bodyManipulado = '{"event":"call_ended"}';

        const firmaOriginal = await Retell.sign(bodyOriginal, apiKey);
        const result = await verifyRetellWebhook(bodyManipulado, firmaOriginal, apiKey);
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('Signature mismatch')
        );
    });

    it('devuelve true con formato de firma incorrecto (best-effort)', async () => {
        const result = await verifyRetellWebhook('body', 'formato-invalido', 'mi-api-key');
        // Retell.verify() returns false for invalid format → logs mismatch warning
        expect(result).toBe(true);
    });
});
