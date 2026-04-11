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
        console.warn('[webhookAuth] Missing x-retell-signature header');
        return false;
    }
    if (!apiKey) {
        console.warn('[webhookAuth] No API key available for signature verification');
        return false;
    }

    // Temporary diagnostics — remove after root cause is confirmed
    const sigMatch = /v=(\d+),d=(.*)/.exec(signature);
    const now = Date.now();
    console.log('[webhookAuth:diag]', JSON.stringify({
        key_len: apiKey.length,
        key_prefix: apiKey.slice(0, 8),
        key_first_cc: apiKey.charCodeAt(0),
        key_last_cc:  apiKey.charCodeAt(apiKey.length - 1),
        body_len: rawBody.length,
        sig_regex_ok: !!sigMatch,
        sig_ts: sigMatch ? Number(sigMatch[1]) : null,
        sig_age_ms: sigMatch ? Math.abs(now - Number(sigMatch[1])) : null,
        now_ms: now,
    }));

    return Retell.verify(rawBody, apiKey, signature);
}
