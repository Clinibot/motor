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

async function importOne(apiKey: string, v: { provider_voice_id: string; voice_name: string }): Promise<ImportVoiceResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
        const res = await fetch('https://api.retellai.com/add-community-voice', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                voice_name: v.voice_name,
                provider_voice_id: v.provider_voice_id,
                voice_provider: 'elevenlabs',
            }),
            signal: controller.signal,
        });
        clearTimeout(timer);
        const data = await res.json();
        if (!res.ok) {
            const msg = JSON.stringify(data);
            const isAlreadyExists = msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('exists');
            console.warn(`[import-defaults] ${res.status} ${v.voice_name}: ${msg}`);
            return { name: v.voice_name, status: isAlreadyExists ? 'skipped' : 'error', error: msg };
        }
        console.log(`[import-defaults] OK ${v.voice_name} → ${(data as { voice_id?: string }).voice_id}`);
        return { name: v.voice_name, status: 'ok', voice_id: (data as { voice_id?: string }).voice_id };
    } catch (err: unknown) {
        clearTimeout(timer);
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[import-defaults] ERROR ${v.voice_name}: ${msg}`);
        return { name: v.voice_name, status: 'error', error: msg };
    }
}

export async function importDefaultVoices(retell_api_key: string): Promise<ImportVoiceResult[]> {
    return Promise.all(DEFAULT_VOICES.map((v) => importOne(retell_api_key, v)));
}
