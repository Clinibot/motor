import Retell from 'retell-sdk';

const DEFAULT_VOICES = [
    { provider_voice_id: 'UOIqAnmS11Reiei1Ytkc', voice_name: 'Carolina' },
    { provider_voice_id: 'YDDaC9XKjODs7hY78qEW', voice_name: 'MariCarmen' },
    { provider_voice_id: 'gD1IexrzCvsXPHUuT0s3', voice_name: 'Sara Martin' },
];

export async function importDefaultVoices(retell_api_key: string) {
    const retellClient = new Retell({ apiKey: retell_api_key });

    for (const v of DEFAULT_VOICES) {
        try {
            const voice = await retellClient.voice.addResource({
                voice_name: v.voice_name,
                provider_voice_id: v.provider_voice_id,
                voice_provider: 'elevenlabs',
            });
            console.log(`[import-defaults] Imported ${v.voice_name} → ${voice.voice_id}`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[import-defaults] Skipped ${v.voice_name}: ${msg.slice(0, 120)}`);
        }
    }
}
