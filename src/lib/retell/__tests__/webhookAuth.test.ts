import { describe, it, expect, vi, beforeEach } from 'vitest';
import Retell from 'retell-sdk';
import { verifyRetellWebhook } from '../webhookAuth';

describe('verifyRetellWebhook', () => {

    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('devuelve false y avisa si no hay API key disponible', async () => {
        const result = await verifyRetellWebhook('cualquier-body', 'cualquier-firma', undefined);
        expect(result).toBe(false);
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('No API key available')
        );
    });

    it('devuelve false y avisa si falta la cabecera x-retell-signature', async () => {
        const result = await verifyRetellWebhook('body', null, 'mi-api-key');
        expect(result).toBe(false);
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('Missing x-retell-signature')
        );
    });

    it('devuelve true cuando la firma generada por el SDK de Retell es correcta', async () => {
        const apiKey = 'test-retell-api-key';
        const body = JSON.stringify({ event: 'call_started', call_id: 'abc123' });
        // Use the SDK's own sign function to generate a valid v={ts},d={hex} signature
        const signature = await Retell.sign(body, apiKey);

        const result = await verifyRetellWebhook(body, signature, apiKey);
        expect(result).toBe(true);
    });

    it('devuelve false cuando la firma no coincide', async () => {
        const result = await verifyRetellWebhook('body', 'v=1234567890,d=firma-incorrecta', 'mi-api-key');
        expect(result).toBe(false);
    });

    it('distingue bodies distintos — firma de un body no vale para otro', async () => {
        const apiKey = 'mi-api-key';
        const bodyOriginal = '{"event":"call_started"}';
        const bodyManipulado = '{"event":"call_ended"}';

        const firmaOriginal = await Retell.sign(bodyOriginal, apiKey);
        const result = await verifyRetellWebhook(bodyManipulado, firmaOriginal, apiKey);
        expect(result).toBe(false);
    });

    it('devuelve false si la firma tiene formato incorrecto (sin prefijo v=)', async () => {
        const result = await verifyRetellWebhook('body', 'formato-invalido', 'mi-api-key');
        expect(result).toBe(false);
    });
});
