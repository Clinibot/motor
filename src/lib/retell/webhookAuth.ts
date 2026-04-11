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

    // Deep diagnostic: compute the HMAC ourselves and compare digests.
    // If digest_match=false → key or body is wrong; if true → SDK verify has a bug.
    if (sigMatch) {
        try {
            const poststamp = Number(sigMatch[1]);
            const expectedDigest = sigMatch[2];
            const enc = new TextEncoder();
            const cryptoKey = await globalThis.crypto.subtle.importKey(
                'raw', enc.encode(apiKey),
                { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
            );
            const sigBuf = await globalThis.crypto.subtle.sign('HMAC', cryptoKey, enc.encode(rawBody + poststamp));
            const computedDigest = Array.from(new Uint8Array(sigBuf))
                .map(b => b.toString(16).padStart(2, '0')).join('');
            console.log('[webhookAuth:digestcmp]', JSON.stringify({
                digest_match: computedDigest === expectedDigest,
                expected_prefix: expectedDigest.slice(0, 16),
                computed_prefix: computedDigest.slice(0, 16),
            }));

            // Body byte inspection — detect encoding issues, BOM, unexpected prefix
            const bodyBytes = enc.encode(rawBody);
            const hexStart = Array.from(bodyBytes.slice(0, 48))
                .map(b => b.toString(16).padStart(2, '0')).join(' ');
            const hexEnd = Array.from(bodyBytes.slice(-16))
                .map(b => b.toString(16).padStart(2, '0')).join(' ');
            console.log('[webhookAuth:bodyhex]', JSON.stringify({
                total_bytes: bodyBytes.length,
                first_48_bytes: hexStart,
                last_16_bytes: hexEnd,
                first_char: rawBody.charCodeAt(0),
                last_char: rawBody.charCodeAt(rawBody.length - 1),
            }));
        } catch (e) {
            console.warn('[webhookAuth:digestcmp] crypto error', String(e));
        }
    }

    return Retell.verify(rawBody, apiKey, signature);
}
