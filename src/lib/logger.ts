import type { NextRequest } from 'next/server';

type Level = 'info' | 'warn' | 'error';

export interface Logger {
    info(msg: string, extra?: Record<string, unknown>): void;
    warn(msg: string, extra?: Record<string, unknown>): void;
    error(msg: string, extra?: Record<string, unknown>): void;
}

/**
 * Extracts the request ID from the `x-request-id` header, or generates a
 * new UUID for the request. Vercel forwards the `x-vercel-id` header on
 * incoming requests — prefer that, then fall back to a generated UUID so
 * every log entry is traceable.
 */
export function getRequestId(request: NextRequest): string {
    return (
        request.headers.get('x-request-id') ||
        request.headers.get('x-vercel-id') ||
        crypto.randomUUID()
    );
}

/**
 * Creates a structured JSON logger scoped to a context string (e.g. the
 * route name) and an optional request ID.
 *
 * All output goes to `console.log` / `console.warn` / `console.error` so
 * Vercel captures them in the function logs as single-line JSON objects.
 *
 * Usage:
 *   const log = createLogger('webhook', getRequestId(request));
 *   log.info('Processing event', { event_type: 'call_analyzed', call_id });
 */
export function createLogger(context: string, requestId?: string): Logger {
    function log(level: Level, msg: string, extra?: Record<string, unknown>): void {
        const entry = {
            level,
            context,
            ...(requestId && { requestId }),
            msg,
            ts: new Date().toISOString(),
            ...extra,
        };
        const line = JSON.stringify(entry);
        if (level === 'error') {
            console.error(line);
        } else if (level === 'warn') {
            console.warn(line);
        } else {
            console.log(line);
        }
    }

    return {
        info: (msg, extra) => log('info', msg, extra),
        warn: (msg, extra) => log('warn', msg, extra),
        error: (msg, extra) => log('error', msg, extra),
    };
}
