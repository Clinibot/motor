const DEFAULT_VOICES = [
    { provider_voice_id: 'UOIqAnmS11Reiei1Ytkc', voice_name: 'Carolina' },
    { provider_voice_id: 'YDDaC9XKjODs7hY78qEW', voice_name: 'MariCarmen' },
    { provider_voice_id: 'gD1IexrzCvsXPHUuT0s3', voice_name: 'Sara Martin' },
];

export interface ImportVoiceResult {
    name: string;
    status: 'ok' | 'skipped' | 'error';
    voice_id?: string;
    public_user_id?: string;
    error?: string;
}

async function getPublicUserId(provider_voice_id: string): Promise<string | undefined> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
        // ElevenLabs shared voices API — no auth required for public voices
        const res = await fetch(
            `https://api.elevenlabs.io/v1/shared-voices?voice_id=${provider_voice_id}&page_size=1`,
            { signal: controller.signal }
        );
        clearTimeout(timer);
        if (!res.ok) return undefined;
        const data = await res.json() as { voices?: Array<{ voice_id: string; public_owner_id?: string }> };
        const match = data.voices?.find((v) => v.voice_id === provider_voice_id);
        return match?.public_owner_id;
    } catch {
        clearTimeout(timer);
        return undefined;
    }
}

async function importOne(apiKey: string, v: { provider_voice_id: string; voice_name: string }, public_user_id: string | undefined): Promise<ImportVoiceResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
        const body: Record<string, string> = {
            voice_name: v.voice_name,
            provider_voice_id: v.provider_voice_id,
            voice_provider: 'elevenlabs',
        };
        if (public_user_id) body.public_user_id = public_user_id;

        const res = await fetch('https://api.retellai.com/add-community-voice', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
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
        const voiceId = (data as { voice_id?: string }).voice_id;
        console.log(`[import-defaults] OK ${v.voice_name} → ${voiceId}`);
        return { name: v.voice_name, status: 'ok', voice_id: voiceId, public_user_id };
    } catch (err: unknown) {
        clearTimeout(timer);
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[import-defaults] ERROR ${v.voice_name}: ${msg}`);
        return { name: v.voice_name, status: 'error', error: msg };
    }
}

export async function importDefaultVoices(retell_api_key: string): Promise<ImportVoiceResult[]> {
    // Resolve public_user_ids from ElevenLabs in parallel
    const publicUserIds = await Promise.all(
        DEFAULT_VOICES.map((v) => getPublicUserId(v.provider_voice_id))
    );
    console.log('[import-defaults] public_user_ids:', publicUserIds);

    // Then add all voices in parallel
    return Promise.all(
        DEFAULT_VOICES.map((v, i) => importOne(retell_api_key, v, publicUserIds[i]))
    );
}
