import { NextResponse } from 'next/server';
import { importDefaultVoices } from '@/lib/retell/importDefaultVoices';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel: allow up to 60s for Retell search calls

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

        const results = await importDefaultVoices(retell_api_key);
        return NextResponse.json({ success: true, results });
    } catch (error: unknown) {
        console.error('[import-defaults] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to import voices' },
            { status: 500 }
        );
    }
}
