/**
 * fetch() wrapper with an explicit timeout via AbortController.
 * Prevents serverless functions from hanging indefinitely when an
 * external API (Cal.com, OpenAI, etc.) is slow or unresponsive.
 *
 * @param url     Request URL
 * @param options Standard RequestInit options (do NOT include `signal` — it is set internally)
 * @param ms      Timeout in milliseconds (default: 10 000)
 */
export function fetchWithTimeout(
    url: string,
    options: Omit<RequestInit, 'signal'> = {},
    ms = 10_000,
): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}
