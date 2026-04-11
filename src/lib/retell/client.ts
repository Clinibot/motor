import Retell from 'retell-sdk';

/**
 * Creates a Retell SDK client with explicit timeout.
 *
 * The SDK default is 60 s — too long for serverless functions where a
 * slow Retell response would hold a Vercel lambda against billing limits.
 * 30 s gives Retell enough time to process complex requests while bounding
 * the worst-case lambda duration.
 *
 * Use this factory everywhere instead of `new Retell({ apiKey })`.
 */
export function createRetellClient(apiKey: string): Retell {
    return new Retell({ apiKey, timeout: 30_000 });
}
