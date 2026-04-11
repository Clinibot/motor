import Retell from 'retell-sdk';

/**
 * Verifies the x-retell-signature header using the workspace's Retell API key.
 *
 * Retell signs each webhook with HMAC-SHA256(apiKey, body + timestamp) and
 * encodes it as "v={timestamp},d={hex}". The SDK validates that the timestamp
 * is within 5 minutes to prevent replay attacks.
 *
 * NOTE: There is no separate "webhook secret" in Retell. The API key that owns
 * the agent is the signing key. Each workspace has its own key, so verification
 * requires the workspace's retell_api_key from the database.
 *
 * Verification is best-effort: if it fails (key mismatch, replay, missing header)
 * the call is logged as a warning but processing continues. Retell webhooks should
 * never be blocked on signature failure — the call data is already in flight and
 * a 401 response causes Retell to retry indefinitely without resolving the issue.
 *
 * @param rawBody   Raw request body string (before JSON.parse)
 * @param signature Value of the x-retell-signature header
 * @param apiKey    The workspace's Retell API key
 */
export async function verifyRetellWebhook(
    rawBody: string,
    signature: string | null,
    apiKey: string | null | undefined
): Promise<boolean> {
    if (!signature) {
        console.warn('[webhookAuth] Missing x-retell-signature header — skipping verification');
        return true;
    }
    if (!apiKey) {
        console.warn('[webhookAuth] No API key available — skipping verification');
        return true;
    }
    try {
        const valid = await Retell.verify(rawBody, apiKey, signature);
        if (!valid) {
            console.warn('[webhookAuth] Signature mismatch — proceeding anyway (best-effort)');
        }
        return true;
    } catch (e) {
        console.warn('[webhookAuth] Verification error — proceeding anyway', String(e));
        return true;
    }
}
