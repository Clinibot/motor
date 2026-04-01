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

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(timer);
    }
}

async function getPublicUserId(apiKey: string, provider_voice_id: string, voice_name: string): Promise<string | undefined> {
    try {
        const res = await fetchWithTimeout(
            'https://api.retellai.com/search-community-voice',
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ voice_provider: 'elevenlabs', search_query: provider_voice_id }),
            },
            30000
        );
        if (!res.ok) {
            console.warn(`[import-defaults] Search ${voice_name} HTTP ${res.status}`);
            return undefined;
        }
        const data = await res.json() as { voices?: Array<{ provider_voice_id?: string; public_user_id?: string }> };
        const match = data.voices?.find((v) => v.provider_voice_id === provider_voice_id);
        console.log(`[import-defaults] Search ${voice_name}: found=${!!match}, public_user_id=${match?.public_user_id}, total=${data.voices?.length}`);
        return match?.public_user_id;
    } catch (err) {
        console.warn(`[import-defaults] Search failed ${voice_name}:`, err instanceof Error ? err.message : err);
        return undefined;
    }
}

async function addVoice(apiKey: string, v: { provider_voice_id: string; voice_name: string }, public_user_id: string): Promise<ImportVoiceResult> {
    try {
        const res = await fetchWithTimeout(
            'https://api.retellai.com/add-community-voice',
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voice_name: v.voice_name,
                    provider_voice_id: v.provider_voice_id,
                    voice_provider: 'elevenlabs',
                    public_user_id,
                }),
            },
            25000
        );
        const data = await res.json();
        if (!res.ok) {
            const msg = JSON.stringify(data);
            const isAlreadyExists = msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('exists');
            console.warn(`[import-defaults] ${res.status} ${v.voice_name}: ${msg}`);
            return { name: v.voice_name, status: isAlreadyExists ? 'skipped' : 'error', error: msg };
        }
        const voiceId = (data as { voice_id?: string }).voice_id;
        console.log(`[import-defaults] OK ${v.voice_name} → ${voiceId}`);
        return { name: v.voice_name, status: 'ok', voice_id: voiceId };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[import-defaults] ERROR ${v.voice_name}: ${msg}`);
        return { name: v.voice_name, status: 'error', error: msg };
    }
}

export async function importDefaultVoices(retell_api_key: string): Promise<ImportVoiceResult[]> {
    const results: ImportVoiceResult[] = [];

    // Sequential: search one by one to avoid parallel timeout issues
    for (const v of DEFAULT_VOICES) {
        const public_user_id = await getPublicUserId(retell_api_key, v.provider_voice_id, v.voice_name);
        if (!public_user_id) {
            console.warn(`[import-defaults] Could not find public_user_id for ${v.voice_name}, skipping`);
            results.push({ name: v.voice_name, status: 'error', error: 'public_user_id not found via search' });
            continue;
        }
        results.push(await addVoice(retell_api_key, v, public_user_id));
    }

    return results;
}
