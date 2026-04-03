import { createHmac } from 'crypto';

/**
 * Verifies the x-retell-signature header sent by Retell on every webhook.
 * Returns true if the signature is valid or if no RETELL_WEBHOOK_SECRET is configured
 * (degraded mode — logs a warning but does not block the request).
 *
 * To enable strict verification:
 * 1. Set RETELL_WEBHOOK_SECRET in your environment variables.
 * 2. Configure the same secret in the Retell dashboard under Webhooks.
 */
export async function verifyRetellWebhook(
    rawBody: string,
    signature: string | null,
    secret: string | undefined
): Promise<boolean> {
    if (!secret) {
        console.warn('[webhookAuth] RETELL_WEBHOOK_SECRET not set — skipping signature verification');
        return true;
    }
    if (!signature) {
        console.warn('[webhookAuth] Missing x-retell-signature header');
        return false;
    }
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return expected === signature;
}
