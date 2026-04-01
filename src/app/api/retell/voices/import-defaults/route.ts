import { NextResponse } from 'next/server';
import Retell from 'retell-sdk';

export const dynamic = 'force-dynamic';

const DEFAULT_VOICES = [
    { provider_voice_id: 'UOIqAnmS11Reiei1Ytkc', voice_name: 'Carolina' },
    { provider_voice_id: 'YDDaC9XKjODs7hY78qEW', voice_name: 'MariCarmen' },
    { provider_voice_id: 'gD1IexrzCvsXPHUuT0s3', voice_name: 'Sara Martin' },
];

/**
 * POST /api/retell/voices/import-defaults
 * Body: { retell_api_key: string }
 * Imports the curated ElevenLabs voices into the workspace.
 * Called automatically when a workspace is created or its API key is set.
 * Skips voices that are already imported (no error on duplicate).
 */
export async function POST(req: Request) {
    try {
        const { retell_api_key } = await req.json();
        if (!retell_api_key) {
            return NextResponse.json({ success: false, error: 'Missing retell_api_key' }, { status: 400 });
        }

        const retellClient = new Retell({ apiKey: retell_api_key });
        const results: { name: string; status: 'ok' | 'skipped'; voice_id?: string }[] = [];

        for (const v of DEFAULT_VOICES) {
            try {
                const voice = await retellClient.voice.addResource({
                    voice_name: v.voice_name,
                    provider_voice_id: v.provider_voice_id,
                    voice_provider: 'elevenlabs',
                });
                results.push({ name: v.voice_name, status: 'ok', voice_id: voice.voice_id });
                console.log(`[import-defaults] Imported ${v.voice_name} → ${voice.voice_id}`);
            } catch (err: unknown) {
                // If already exists, skip silently
                const msg = err instanceof Error ? err.message : String(err);
                if (msg.includes('already') || msg.includes('duplicate') || msg.includes('exists')) {
                    results.push({ name: v.voice_name, status: 'skipped' });
                } else {
                    console.warn(`[import-defaults] Failed to import ${v.voice_name}:`, msg);
                    results.push({ name: v.voice_name, status: 'skipped' });
                }
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: unknown) {
        console.error('[import-defaults] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to import voices' },
            { status: 500 }
        );
    }
}
