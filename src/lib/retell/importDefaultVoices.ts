import Retell from 'retell-sdk';

const DEFAULT_VOICES = [
    { provider_voice_id: 'UOIqAnmS11Reiei1Ytkc', voice_name: 'Carolina' },
    { provider_voice_id: 'YDDaC9XKjODs7hY78qEW', voice_name: 'MariCarmen' },
    { provider_voice_id: 'gD1IexrzCvsXPHUuT0s3', voice_name: 'Sara Martin' },
];

export interface ImportVoiceResult {
    name: string;
    status: 'ok' | 'skipped' | 'error';
    voice_id?: string;
    error?: string;
}

export async function importDefaultVoices(retell_api_key: string): Promise<ImportVoiceResult[]> {
    const retellClient = new Retell({ apiKey: retell_api_key });
    const results: ImportVoiceResult[] = [];

    for (const v of DEFAULT_VOICES) {
        try {
            // Step 1: search to get public_user_id
            let public_user_id: string | undefined;
            try {
                const searchRes = await retellClient.voice.search({
                    voice_provider: 'elevenlabs',
                    search_query: v.voice_name,
                });
                const match = searchRes.voices?.find(
                    (sv) => sv.provider_voice_id === v.provider_voice_id
                );
                public_user_id = match?.public_user_id;
                console.log(`[import-defaults] Search ${v.voice_name}: found=${!!match}, public_user_id=${public_user_id}`);
            } catch (searchErr) {
                console.warn(`[import-defaults] Search failed for ${v.voice_name}:`, searchErr);
                // Continue without public_user_id — may still work
            }

            // Step 2: add voice
            const voice = await retellClient.voice.addResource({
                voice_name: v.voice_name,
                provider_voice_id: v.provider_voice_id,
                voice_provider: 'elevenlabs',
                ...(public_user_id ? { public_user_id } : {}),
            });
            console.log(`[import-defaults] OK ${v.voice_name} → ${voice.voice_id}`);
            results.push({ name: v.voice_name, status: 'ok', voice_id: voice.voice_id });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            const isAlreadyExists = msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('exists');
            console.warn(`[import-defaults] ${isAlreadyExists ? 'Already exists' : 'ERROR'} ${v.voice_name}: ${msg}`);
            results.push({ name: v.voice_name, status: isAlreadyExists ? 'skipped' : 'error', error: msg });
        }
    }

    return results;
}
