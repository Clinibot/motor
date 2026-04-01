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

async function retellPost(path: string, apiKey: string, body: Record<string, string>): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
        const res = await fetch(`https://api.retellai.com${path}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));
        return data;
    } finally {
        clearTimeout(timer);
    }
}

async function importOne(apiKey: string, v: { provider_voice_id: string; voice_name: string }): Promise<ImportVoiceResult> {
    try {
        // Step 1: search to get public_user_id
        let public_user_id: string | undefined;
        try {
            const searchData = await retellPost('/search-community-voice', apiKey, {
                voice_provider: 'elevenlabs',
                search_query: v.provider_voice_id,
            }) as { voices?: Array<{ provider_voice_id?: string; public_user_id?: string }> };
            const match = searchData.voices?.find((sv) => sv.provider_voice_id === v.provider_voice_id);
            public_user_id = match?.public_user_id;
            console.log(`[import-defaults] Search ${v.voice_name}: found=${!!match}, public_user_id=${public_user_id}`);
        } catch (searchErr) {
            console.warn(`[import-defaults] Search failed for ${v.voice_name}:`, searchErr instanceof Error ? searchErr.message : searchErr);
        }

        // Step 2: add voice
        const addBody: Record<string, string> = {
            voice_name: v.voice_name,
            provider_voice_id: v.provider_voice_id,
            voice_provider: 'elevenlabs',
        };
        if (public_user_id) addBody.public_user_id = public_user_id;

        const data = await retellPost('/add-community-voice', apiKey, addBody) as { voice_id?: string };
        console.log(`[import-defaults] OK ${v.voice_name} → ${data.voice_id}`);
        return { name: v.voice_name, status: 'ok', voice_id: data.voice_id };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isAlreadyExists = msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('exists');
        console.warn(`[import-defaults] ${isAlreadyExists ? 'Already exists' : 'ERROR'} ${v.voice_name}: ${msg}`);
        return { name: v.voice_name, status: isAlreadyExists ? 'skipped' : 'error', error: msg };
    }
}

export async function importDefaultVoices(retell_api_key: string): Promise<ImportVoiceResult[]> {
    return Promise.all(DEFAULT_VOICES.map((v) => importOne(retell_api_key, v)));
}
