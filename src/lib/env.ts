/**
 * Validates required environment variables at module load time.
 * Import this module (or any module that imports it) in server-side code.
 * The app will fail fast with a clear message instead of a cryptic runtime error.
 *
 * NOTE: Only import from server-side code (API routes, Server Components, lib/).
 * Never import in client components — it would expose private env var names.
 */

const REQUIRED = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SITE_URL',
] as const;

const RECOMMENDED: Array<{ key: string; feature: string }> = [
    { key: 'RETELL_WEBHOOK_SECRET',   feature: 'Retell webhook signature verification' },
    { key: 'OPENAI_API_KEY',          feature: 'inbound webhook natural language availability' },
    { key: 'RESEND_API_KEY',          feature: 'email alert notifications' },
    { key: 'CRON_SECRET',             feature: 'cron endpoint and internal alert protection' },
];

const missing = REQUIRED.filter(key => !process.env[key]);
if (missing.length > 0) {
    throw new Error(
        `[env] Missing required environment variables: ${missing.join(', ')}\n` +
        `Check your .env.local file or Vercel environment settings.`
    );
}

for (const { key, feature } of RECOMMENDED) {
    if (!process.env[key]) {
        console.warn(`[env] ${key} is not set — ${feature} will not work.`);
    }
}

// Typed exports — use these instead of process.env.X! to avoid scattered non-null assertions.
export const env = {
    NEXT_PUBLIC_SUPABASE_URL:      process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY:     process.env.SUPABASE_SERVICE_ROLE_KEY!,
    NEXT_PUBLIC_SITE_URL:          process.env.NEXT_PUBLIC_SITE_URL!,
} as const;
