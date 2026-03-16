"use client";

import React, { useState, useMemo } from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';

interface Voice {
    voice_id: string;
    voice_name: string;
    provider: string;
    language: string;
    gender: 'male' | 'female';
    accent: string;
    preview_audio_url?: string;
    raw_language?: string;
    raw_accent?: string;
}

// VOICES_DATA ya no se usa de forma estática, se cargan de la API
// Lista de IDs de voces seleccionadas para mostrar una lista "Premium" curada
const CURATED_VOICE_IDS = [
    '11labs-Adrian',
    '11labs-Paloma',
    '11labs-Alvaro',
    'cartesia-Elena',
    'cartesia-Manuel',
    'cartesia-Isabel',
    'cartesia-Teresa',
    'cartesia-Dario',
    'cartesia-Ines',
    'openai-Shimmer',
    'openai-Fable',
    'openai-Nova',
    'openai-Alloy',
    'retell-Rosa',
    'retell-Alberto',
    'retell-Sergio',
    '11labs-George',
    '11labs-Alice',
    '11labs-Bill',
    '11labs-Lily',
    'cartesia-Marie',
    'cartesia-Jean',
];

const DEFAULT_VOICES: Voice[] = [
    { voice_id: '11labs-Adrian', voice_name: 'Adrián', provider: 'elevenlabs', language: 'es', gender: 'male', accent: 'spain', preview_audio_url: 'https://storage.googleapis.com/retell-api/11labs-Adrian.mp3' },
    { voice_id: 'openai-Fable', voice_name: 'Cimo', provider: 'openai', language: 'es', gender: 'male', accent: 'latam', preview_audio_url: 'https://storage.googleapis.com/retell-api/openai-Fable.mp3' },
    { voice_id: 'openai-Shimmer', voice_name: 'Serena', provider: 'openai', language: 'es', gender: 'female', accent: 'latam', preview_audio_url: 'https://storage.googleapis.com/retell-api/openai-Shimmer.mp3' },
    { voice_id: 'cartesia-Elena', voice_name: 'Elena', provider: 'cartesia', language: 'es', gender: 'female', accent: 'spain' },
    { voice_id: '11labs-George', voice_name: 'George', provider: 'elevenlabs', language: 'en', gender: 'male', accent: 'usa', preview_audio_url: 'https://storage.googleapis.com/retell-api/11labs-George.mp3' },
    { voice_id: '11labs-Alice', voice_name: 'Alice', provider: 'elevenlabs', language: 'en', gender: 'female', accent: 'usa', preview_audio_url: 'https://storage.googleapis.com/retell-api/11labs-Alice.mp3' },
    { voice_id: 'cartesia-Ines', voice_name: 'Ines', provider: 'cartesia', language: 'fr', gender: 'female', accent: 'france' },
];

export const Step3_Voice: React.FC = () => {
    const { voiceId, voiceSpeed, voiceTemperature, updateField, prevStep, nextStep } = useWizardStore();

    const [voices, setVoices] = useState<Voice[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(true);
    const [isProcessingCustom, setIsProcessingCustom] = useState(false);
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    // const [customTab, setCustomTab] = useState<'clone'>('clone');
    // const [customTab, setCustomTab] = useState<'import' | 'clone'>('import');
    const [activeProvider, setActiveProvider] = useState('all');

    // Form states
    const [customName, setCustomName] = useState('');
    // const [importVoiceId, setImportVoiceId] = useState('');
    // const [publicUserId, setPublicUserId] = useState('');
    const [cloneFiles, setCloneFiles] = useState<FileList | null>(null);

    const [filterLang, setFilterLang] = useState('es');
    const [filterGender, setFilterGender] = useState('');
    const [filterAccent, setFilterAccent] = useState('');
    const [legalConfirmed, setLegalConfirmed] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const fetchVoices = async () => {
        setIsLoadingVoices(true);
        try {
            const response = await fetch('/api/retell/voices');
            const data = await response.json();
            if (data?.success && data?.voices && data?.voices.length > 0) {
                // Normalizar datos de Retell
                const normalized = data.voices.map((v: Voice) => {
                    const voiceName = (v.voice_name || '').toLowerCase();
                    const voiceLangAttr = (v.language || '').toLowerCase();
                    const voiceAccentAttr = (v.accent || '').toLowerCase();

                    // Detección extremadamente flexible de español
                    let lang = voiceLangAttr;
                    if (lang.startsWith('es') ||
                        lang.includes('spanish') ||
                        lang.includes('espanol') ||
                        lang.includes('español') ||
                        voiceName.includes('spanish') ||
                        voiceName.includes('español') ||
                        voiceAccentAttr.includes('spanish') ||
                        voiceAccentAttr.includes('spain') ||
                        voiceAccentAttr.includes('españa')) {
                        lang = 'es';
                    } else if (lang.startsWith('en') || lang.includes('english')) {
                        lang = 'en';
                    } else if (lang.startsWith('pt') || lang.includes('portuguese') || lang.includes('brazil')) {
                        lang = 'pt';
                    } else if (lang.startsWith('fr') || lang.includes('french')) {
                        lang = 'fr';
                    }

                    // Detección flexible de acento (Prioridad España)
                    let accent = voiceAccentAttr;
                    const isSpainSignal =
                        accent.includes('spain') ||
                        accent.includes('españa') ||
                        accent.includes('castilian') ||
                        accent.includes('castellano') ||
                        accent.includes('castellana') ||
                        accent.includes('es-es') ||
                        accent === 'spanish' ||
                        accent === 'español' ||
                        voiceLangAttr.includes('spain') ||
                        voiceLangAttr.includes('es-es') ||
                        voiceLangAttr.endsWith('-es') ||
                        voiceName.includes('español (españa)') ||
                        voiceName.includes('española') ||
                        voiceName.includes('madrid') ||
                        // Nombres comunes de voces de España
                        ['elena', 'manuel', 'isabel', 'teresa', 'dario', 'ines', 'pau', 'alvaro', 'paloma', 'sergio', 'blanca', 'adrian', 'adrián', 'sol', 'mateo', 'jose', 'josé', 'maria', 'maría', 'antoni', 'antonio', 'lola', 'carmen', 'javier', 'elvira'].some(n => voiceName.includes(n));

                    if (isSpainSignal && lang === 'es') {
                        accent = 'spain';
                    } else if (accent.includes('latam') ||
                        accent.includes('mexico') ||
                        accent.includes('colombia') ||
                        accent.includes('latino') ||
                        accent.includes('mexican') ||
                        accent.includes('argentina') ||
                        accent.includes('chile') ||
                        accent.includes('peru') ||
                        accent.includes('venezuela') ||
                        accent.includes('dominican') ||
                        accent.includes('puerto rico') ||
                        voiceName.includes('latam') ||
                        voiceName.includes('mexic') ||
                        voiceLangAttr.includes('mx') ||
                        voiceLangAttr.includes('co') ||
                        voiceLangAttr.includes('ar')) {
                        accent = 'latam';
                    } else if (accent.includes('usa') || accent.includes('american') || accent.includes('eeuu') || accent.includes('us-') || voiceName.includes('american')) {
                        accent = 'usa';
                    } else if (accent.includes('uk') || accent.includes('british') || accent.includes('británico') || accent.includes('london') || voiceName.includes('british')) {
                        accent = 'uk';
                    }

                    // Normalizar proveedor de forma agresiva
                    let provider = (v.provider || '').toLowerCase();
                    const id = (v.voice_id || '').toLowerCase();
                    if (id.includes('11labs') || id.includes('elevenlabs') || provider.includes('eleven') || provider.includes('11')) provider = 'elevenlabs';
                    else if (id.includes('openai') || provider.includes('openai')) provider = 'openai';
                    else if (id.includes('cartesia') || provider.includes('cartesia')) provider = 'cartesia';
                    else if (id.includes('minimax') || provider.includes('minimax')) provider = 'minimax';
                    else if (id.includes('fish') || provider.includes('fish')) provider = 'fish_audio';
                    else if (provider === 'platform' || id.includes('retell')) provider = 'platform';
                    else provider = 'elevenlabs'; // Default to elevenlabs instead of retell

                    if (provider === 'openai') {
                        lang = 'es'; // OpenAI voices are excellently multilingual
                        // Override gender for specific OpenAI voices if needed by user perception
                        if (id.includes('fable')) {
                            // Cimo is technically male but often used for both, 
                            // we'll keep it as male but ensure it's in Spanish.
                            // If user specifically asked for it in female, we can consider it.
                        }
                    }

                    return {
                        ...v,
                        language: lang,
                        accent: accent || (provider === 'openai' ? 'latam' : ''),
                        provider: provider,
                        raw_language: v.language,
                        raw_accent: v.accent
                    };
                });
                console.log("Voces normalizadas:", normalized.length);
                console.log("Español (España):", normalized.filter((v: Voice) => v.language === 'es' && v.accent === 'spain').length);
                console.log("Cartesia:", normalized.filter((v: Voice) => v.provider === 'cartesia').length);
                setVoices(normalized);
                
                // Debug log para voces en español sin acento reconocido
                const unknownAccent = normalized.filter((v: Voice) => v.language === 'es' && v.accent !== 'spain' && v.accent !== 'latam');
                if (unknownAccent.length > 0) {
                    console.log("Voces en español con acento no reconocido:", unknownAccent.map((v: Voice) => `${v.voice_name} (Accento raw: ${v.raw_accent}, ID: ${v.voice_id})`));
                }
            } else {
                console.warn("API returned empty voices or failed, using fallback data");
                setVoices(DEFAULT_VOICES);
            }
        } catch (error) {
            console.error("Error loading voices:", error);
            setVoices(DEFAULT_VOICES);
        } finally {
            setIsLoadingVoices(false);
        }
    };

    // Cargar voces desde la API
    React.useEffect(() => {
        fetchVoices();
    }, []);

    // Reset expansion when filters change
    React.useEffect(() => {
        setIsExpanded(false);
    }, [activeProvider, filterLang, filterGender, filterAccent]);

    // Limpieza de audio al desmontar
    React.useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const filteredVoices = useMemo(() => {
        let list = voices;

        // Si no se han cargado voces aún, usar DEFAULT_VOICES
        if (list.length === 0 && !isLoadingVoices) list = DEFAULT_VOICES;

        // 1. Filtrar solo las curadas si estamos en la pestaña "Recomendadas" y NO hay filtros específicos
        // Importante: filterLang NO debe disparar la lista completa si es el valor por defecto ('es')
        const isFiltering = filterAccent || filterGender || (filterLang && filterLang !== 'es');

        if (activeProvider === 'all' && !isFiltering) {
            const curated = list.filter(v => CURATED_VOICE_IDS.includes(v.voice_id));
            if (curated.length > 0) list = curated;
        }

        // 2. Aplicar filtros de UI
        const filtered = list.filter(v => {
            const matchesProvider = activeProvider === 'all'
                ? true
                : v.provider === activeProvider;

            const matchesLang = !filterLang || v.language === filterLang;
            const matchesGender = !filterGender || v.gender === filterGender;
            const matchesAccent = !filterAccent || v.accent === filterAccent;
            return matchesProvider && matchesLang && matchesGender && matchesAccent;
        });

        // 3. Ordenación : España > Latam > Resto
        return [...filtered].sort((a, b) => {
            // Prioridad para España
            if (a.accent === 'spain' && b.accent !== 'spain') return -1;
            if (a.accent !== 'spain' && b.accent === 'spain') return 1;

            // Prioridad para Español en general
            if (a.language === 'es' && b.language !== 'es') return -1;
            if (a.language !== 'es' && b.language === 'es') return 1;

            return 0;
        });
    }, [voices, activeProvider, filterLang, filterGender, filterAccent, isLoadingVoices]);

    const handleCustomVoiceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessingCustom(true);

        try {

            /* 
            // CÓDIGO COMENTADO - IMPORTACIÓN ELEVENLABS
            if (customTab === 'import') {
                const trimmedName = customName.trim();
                const trimmedVoiceId = importVoiceId.trim();
                const trimmedUserId = publicUserId.trim();

                if (!trimmedName || !trimmedVoiceId) {
                    alert("Por favor, rellena los campos obligatorios.");
                    setIsProcessingCustom(false);
                    return;
                }

                res = await fetch('/api/retell/voices/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        voice_name: trimmedName,
                        provider_voice_id: trimmedVoiceId,
                        public_user_id: trimmedUserId || undefined
                    })
                });
            } else { ... }
            */

            const trimmedName = customName.trim();
            if (!trimmedName) {
                alert("Por favor, introduce un nombre para la voz.");
                setIsProcessingCustom(false);
                return;
            }

            const formData = new FormData();
            formData.append('voice_name', trimmedName);
            if (cloneFiles) {
                let totalSize = 0;
                for (let i = 0; i < cloneFiles.length; i++) {
                    totalSize += cloneFiles[i].size;
                }
                // Margen de seguridad para el límite del servidor
                if (totalSize > 20 * 1024 * 1024) {
                    alert("El tamaño total de los archivos de audio es demasiado grande (máximo 20MB combinado). Por favor, intenta subir archivos más pequeños.");
                    setIsProcessingCustom(false);
                    return;
                }

                for (let i = 0; i < cloneFiles.length; i++) {
                    formData.append('files', cloneFiles[i]);
                }
            }
            
            console.log("--- CLONE_VOICE_VER_2024_03_16_1915 ---");
            console.log("Iniciando clonación mediante API Route...");
            const res = await fetch('/api/retell/voices/clone', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                if (res.status === 413) {
                    alert("Error 413: El archivo de audio es demasiado grande para el servidor. Por favor, intenta subir un archivo más pequeño (menos de 4.5 MB si estás en Vercel) o comprimido.");
                } else if (res.status === 504) {
                    alert("Error 504 (Tiempo excedido): La clonación está tardando demasiado para los límites de Vercel (10 segundos). \n\nSugerencia: Intenta subir un archivo de audio más corto (ej: 5-10 segundos) o un solo archivo en lugar de varios para que el proceso termine más rápido.");
                } else if (res.status === 500) {
                    try {
                        const errorData = await res.json();
                        alert(`Error Servidor (500): ${errorData.error || "Error interno"}`);
                        console.error("Detalles del servidor:", errorData);
                    } catch {
                        const text = await res.text();
                        alert("Error 500: El servidor falló con una respuesta no válida.");
                        console.error("HTML de error del servidor:", text);
                    }
                } else {
                    const text = await res.text();
                    alert(`Error ${res.status}: El servidor respondió con un error al procesar el audio.`);
                    console.error("Respuesta de error completa:", text);
                }
                setIsProcessingCustom(false);
                return;
            }

            const data = await res.json();

            if (data && data.success) {
                alert("Voz clonada con éxito");
                setShowCustomModal(false);
                setCustomName('');
                setCloneFiles(null);
                setLegalConfirmed(false);
                setActiveProvider('platform'); // Auto-switch to see the new voice
                fetchVoices();
            } else {
                alert("Error: " + (data?.error || "Ocurrió un problema al clonar la voz."));
            }
        } catch (error: unknown) {
            const err = error as Error;
            console.error("Error crítico en handleCustomVoiceSubmit:", err);
            
            if (err.name === 'SyntaxError') {
                alert("Error: El servidor devolvió una respuesta inesperada. Esto suele ocurrir cuando el archivo es demasiado grande.");
            } else {
                alert("Error al procesar la voz: " + (err.message || "Error desconocido"));
            }
        } finally {
            setIsProcessingCustom(false);
        }
    };

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (!voiceId) return;
        nextStep();
    };

    const getLanguageName = (lang: string) => {
        const names: Record<string, string> = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français' };
        return names[lang] || lang;
    };


    const getAccentName = (accent: string) => {
        const names: Record<string, string> = { spain: 'España', latam: 'Latam', usa: 'USA', uk: 'UK', brazil: 'Brasil', france: 'Francia' };
        return names[accent] || accent;
    };

    const togglePlay = (v: Voice) => {
        if (playingId === v.voice_id) {
            audioRef.current?.pause();
            setPlayingId(null);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
        }

        const previewUrl = v.preview_audio_url;
        if (!previewUrl) {
            alert("Esta voz no tiene previsualización de audio disponible.");
            return;
        }

        const newAudio = new Audio(previewUrl);

        newAudio.onplay = () => setPlayingId(v.voice_id);
        newAudio.onended = () => setPlayingId(null);
        newAudio.onpause = () => setPlayingId(null);
        newAudio.onerror = (e) => {
            console.error("Error playing audio preview:", e);
            setPlayingId(null);
        };

        audioRef.current = newAudio;
        newAudio.play().catch(err => {
            console.error("Audio playback error:", err);
            setPlayingId(null);
        });
    };

    return (
        <div className="content-area">
            <div className="form-card">
                <WizardStepHeader
                    title="Selección de voz del agente"
                    subtitle="Elige la voz que mejor represente la personalidad de tu agente."
                    tooltipContent={
                        <>
                            <strong>La voz es la cara audible de tu marca.</strong> Elige entre diferentes proveedores para encontrar el tono, acento y género que mejor encaje.
                        </>
                    }
                />

                <div className="alert-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <i className="bi bi-lightbulb-fill"></i>
                        <div>
                            <strong>Tip:</strong> Escucha varias voces antes de decidir. La voz transmite la personalidad de tu marca.
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn"
                        style={{ 
                            padding: '6px 14px', 
                            fontSize: '13px', 
                            background: 'transparent',
                            border: '1px solid #cbd5e1',
                            color: '#475569',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onClick={() => setShowCustomModal(true)}
                    >
                        <i className="bi bi-mic" style={{ fontSize: '14px' }}></i> Clona tu voz
                    </button>
                </div>

                <form onSubmit={handleNext}>
                    {/* PESTAÑAS DE PROVEEDORES */}
                    <div className="provider-tabs" style={{
                        display: 'flex',
                        gap: '24px',
                        borderBottom: '1px solid #edf2f7',
                        marginBottom: '24px',
                        paddingBottom: '2px'
                    }}>
                        {[
                            { id: 'all', name: 'Recomendadas', icon: 'bi-star-fill' },
                            { id: 'platform', name: 'Mis Voces', icon: 'bi-person-badge-fill' },
                            { id: 'cartesia', name: 'Cartesia', icon: 'bi-gem' },
                            { id: 'elevenlabs', name: 'ElevenLabs', icon: 'bi-music-note-beamed' },
                            { id: 'openai', name: 'OpenAI', icon: 'bi-lightning-charge-fill' },
                            { id: 'minimax', name: 'MiniMax', icon: 'bi-mic-fill' },
                            { id: 'fish_audio', name: 'Fish Audio', icon: 'bi-water' }
                        ].map(p => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setActiveProvider(p.id)}
                                style={{
                                    padding: '12px 4px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: activeProvider === p.id ? 'var(--color-primario)' : '#718096',
                                    borderBottom: `2px solid ${activeProvider === p.id ? 'var(--color-primario)' : 'transparent'}`,
                                    background: 'none',
                                    borderTop: 'none',
                                    borderLeft: 'none',
                                    borderRight: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <i className={`bi ${p.icon}`}></i>
                                {p.name}
                            </button>
                        ))}
                    </div>

                    {/* FILTROS */}
                    <div className="filters-row" style={{
                        background: '#f8fafc',
                        padding: '20px',
                        borderRadius: '12px',
                        marginBottom: '24px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '16px'
                    }}>
                        <div>
                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>Idioma</label>
                            <select className="form-control" value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
                                <option value="">Todos</option>
                                <option value="es">Español</option>
                                <option value="en">Inglés</option>
                                <option value="fr">Francés</option>
                                <option value="pt">Portugués</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>Género</label>
                            <select className="form-control" value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
                                <option value="">Todos</option>
                                <option value="female">Femenino</option>
                                <option value="male">Masculino</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>Acento</label>
                            <select className="form-control" value={filterAccent} onChange={(e) => setFilterAccent(e.target.value)}>
                                <option value="">Todos los acentos</option>
                                <option value="spain">España</option>
                                <option value="latam">Latinoamérica</option>
                                <option value="usa">USA</option>
                                <option value="uk">UK</option>
                                <option value="france">Francia</option>
                            </select>
                        </div>
                    </div>

                    {/* GALERÍA DE VOCES */}
                    {isLoadingVoices ? (
                        <div style={{ textAlign: 'center', padding: '60px' }}>
                            <div style={{ marginBottom: '16px' }}>Cargando voces de alta calidad...</div>
                            <div className="spinner-border text-primary" role="status"></div>
                        </div>
                    ) : (
                        <>
                            <div className="voices-grid" style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                gap: '20px'
                            }}>
                                {(isExpanded ? filteredVoices : filteredVoices.slice(0, 12)).map((v: Voice) => (
                                    <div
                                        key={`${v.voice_id}-${v.language}-${v.voice_name}`}
                                        className={`voice-card ${voiceId === v.voice_id ? 'selected' : ''}`}
                                        style={{
                                            border: voiceId === v.voice_id ? '2px solid var(--color-primario)' : '1px solid #edf2f7',
                                            borderRadius: '16px',
                                            padding: '24px',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            background: voiceId === v.voice_id ? '#f0f7ff' : '#fff',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            position: 'relative'
                                        }}
                                        onClick={() => {
                                            updateField('voiceId', v.voice_id);
                                            updateField('voiceName', v.voice_name);
                                            updateField('voiceProvider', v.provider);
                                            updateField('voiceDescription', v.accent || 'Voz de alta calidad');
                                        }}
                                    >
                                        <div className="voice-avatar" style={{
                                            width: '64px',
                                            height: '64px',
                                            borderRadius: '50%',
                                            background: '#f1f5f9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '32px',
                                            margin: '0 auto 16px'
                                        }}>
                                            {v.gender === 'female' ? '👩' : '👨'}
                                        </div>
                                        <div className="voice-name" style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            {v.voice_name}
                                            {CURATED_VOICE_IDS.includes(v.voice_id) && (
                                                <i className="bi bi-patch-check-fill" style={{ color: '#0ea5e9', fontSize: '14px' }} title="Voz Premium Verificada"></i>
                                            )}
                                        </div>
                                        <div className="voice-desc" style={{ fontSize: '11px', color: '#64748b', marginBottom: '16px', minHeight: '32px', textTransform: 'capitalize', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span>Voz {v.gender === 'female' ? 'femenina' : 'masculina'}</span>
                                            <span style={{ fontWeight: 600, color: v.accent === 'spain' ? '#059669' : '#64748b' }}>
                                                {v.accent ? getAccentName(v.accent) : 'Profesional'}
                                            </span>
                                        </div>

                                        <div className="voice-tags" style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '20px' }}>
                                            <span style={{
                                                background: '#f1f5f9',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: '#475569'
                                            }}>{getLanguageName(v.language)}</span>
                                            <span style={{
                                                background: v.provider === 'elevenlabs' ? '#f0f9ff' : v.provider === 'cartesia' ? '#f5f3ff' : '#f8fafc',
                                                color: v.provider === 'elevenlabs' ? '#0369a1' : v.provider === 'cartesia' ? '#7c3aed' : '#64748b',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                textTransform: 'uppercase'
                                            }}>{v.provider === 'elevenlabs' ? 'Ultra HD' : v.provider === 'cartesia' ? 'Sonic' : 'Pro'}</span>
                                        </div>

                                        <button
                                            type="button"
                                            className="btn-play"
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '10px',
                                                border: '1px solid #e2e8f0',
                                                background: playingId === v.voice_id ? '#3182ce' : 'white',
                                                color: playingId === v.voice_id ? 'white' : '#1a202c',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                transition: 'all 0.2s ease',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                togglePlay(v);
                                            }}
                                        >
                                            {playingId === v.voice_id ? (
                                                <><i className="bi bi-pause-fill" style={{ fontSize: '16px' }}></i> Pausar</>
                                            ) : (
                                                <><i className="bi bi-play-fill" style={{ fontSize: '16px' }}></i> Escuchar</>
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {filteredVoices.length > 12 && (
                                <div style={{ textAlign: 'center', marginTop: '32px' }}>
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        style={{
                                            padding: '10px 32px',
                                            borderRadius: '30px',
                                            fontWeight: 600,
                                            fontSize: '14px',
                                            borderWidth: '2px',
                                            transition: 'all 0.2s'
                                        }}
                                        onClick={() => setIsExpanded(!isExpanded)}
                                    >
                                        {isExpanded ? (
                                            <><i className="bi bi-chevron-up"></i> Mostrar menos voces</>
                                        ) : (
                                            <><i className="bi bi-chevron-down"></i> Ver más voces ({filteredVoices.length - 12} adicionales)</>
                                        )}
                                    </button>
                                </div>
                            )}

                            {filteredVoices.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>No se encontraron voces</h3>
                                    <p style={{ fontSize: '14px' }}>Prueba a cambiar el idioma o acento en los filtros superiores.</p>
                                    <button
                                        type="button"
                                        className="btn btn-link"
                                        style={{ marginTop: '16px', color: 'var(--color-primario)' }}
                                        onClick={() => {
                                            setFilterLang('');
                                            setFilterAccent('');
                                            setFilterGender('');
                                        }}
                                    >
                                        Limpiar todos los filtros
                                    </button>
                                </div>
                            )}
                        </>
                    )}



                    {/* CONFIGURACIÓN ADICIONAL */}
                    <div className="section-divider">
                        <h3><i className="bi bi-sliders"></i> Ajustes de voz</h3>
                        <p>Ajusta el tono y la velocidad de la voz seleccionada.</p>
                    </div>

                    <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div className="form-group">
                            <label className="form-label">
                                Voice speed
                                <span className="custom-tooltip">
                                    <i className="bi bi-info-circle tooltip-icon"></i>
                                    <span className="tooltip-content">
                                        <strong>Velocidad de habla:</strong><br />
                                        Controla qué tan rápido habla el agente. Valores entre 0.9 y 1.1 suenan más naturales.
                                    </span>
                                </span>
                            </label>
                            <div className="slider-container">
                                <div className="slider-value">{voiceSpeed.toFixed(1)}x</div>
                                <input
                                    type="range"
                                    min="0.5" max="2.0" step="0.1"
                                    value={voiceSpeed}
                                    onChange={(e) => updateField('voiceSpeed', parseFloat(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Voice temperature
                                <span className="custom-tooltip">
                                    <i className="bi bi-info-circle tooltip-icon"></i>
                                    <span className="tooltip-content">
                                        <strong>Variación emocional:</strong><br />
                                        A mayor temperatura, la voz tendrá más inflexiones y sonará más expresiva y humana.
                                    </span>
                                </span>
                            </label>
                            <div className="slider-container">
                                <div className="slider-value">{voiceTemperature.toFixed(1)}</div>
                                <input
                                    type="range"
                                    min="0" max="1.0" step="0.1"
                                    value={voiceTemperature}
                                    onChange={(e) => updateField('voiceTemperature', parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="wizard-actions">
                        <button type="button" className="btn btn-secondary" onClick={prevStep}>
                            <i className="bi bi-arrow-left"></i> Anterior
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!voiceId}>
                            Siguiente paso <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            </div>

            {/* MODAL PARA VOZ PERSONALIZADA */}
            {showCustomModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 3000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="modal-content" style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '500px',
                        borderRadius: '16px',
                        padding: '32px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Clona tu propia voz</h2>
                            <button type="button" onClick={() => setShowCustomModal(false)} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--gris-texto)' }}>&times;</button>
                        </div>

                        <div style={{ 
                            background: '#fffbeb', 
                            border: '1px solid #fde68a', 
                            borderRadius: '12px', 
                            padding: '16px', 
                            marginBottom: '24px',
                            display: 'flex',
                            gap: '12px'
                        }}>
                            <i className="bi bi-exclamation-triangle-fill" style={{ color: '#d97706', fontSize: '18px' }}></i>
                            <p style={{ fontSize: '13px', color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                                <strong>Importante:</strong> La fidelidad de la voz clonada depende directamente de la calidad de tus audios. Asegúrate de que no haya ruido de fondo y que la voz sea clara para obtener el mejor resultado.
                            </p>
                        </div>

                        {/* 
                        <div style={{ display: 'flex', background: 'var(--gris-claro)', borderRadius: '8px', padding: '4px', marginBottom: '24px' }}>
                            <button
                                type="button"
                                onClick={() => setCustomTab('import')}
                                style={{
                                    flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600,
                                    background: customTab === 'import' ? 'white' : 'transparent',
                                    color: customTab === 'import' ? 'var(--netelip-azul)' : 'var(--gris-texto)',
                                    boxShadow: customTab === 'import' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                }}
                            >
                                Importar ElevenLabs
                            </button>
                            <button
                                type="button"
                                onClick={() => setCustomTab('clone')}
                                style={{
                                    flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600,
                                    background: customTab === 'clone' ? 'white' : 'transparent',
                                    color: customTab === 'clone' ? 'var(--netelip-azul)' : 'var(--gris-texto)',
                                    boxShadow: customTab === 'clone' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                }}
                            >
                                Clonar Voz (Upload)
                            </button>
                        </div> 
                        */}

                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#475569', marginBottom: '24px' }}>Clonar voz mediante archivos de audio</h3>

                        <form onSubmit={handleCustomVoiceSubmit}>
                            <div className="form-group">
                                <label className="form-label">Nombre de la voz</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Ej: Voz Corporativa Juan"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    required
                                    disabled={isProcessingCustom}
                                />
                            </div>

                            {/* 
                            <div className="form-group">
                                <label className="form-label">Provider Voice ID (ElevenLabs)</label>
                                <input type="text" className="form-control" />
                            </div>
                            */}

                                <div className="form-group">
                                    <label className="form-label">Archivos de audio (WAV/MP3)</label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        multiple
                                        accept="audio/mpeg,audio/wav,audio/mp3"
                                        onChange={(e) => setCloneFiles(e.target.files)}
                                        required
                                        disabled={isProcessingCustom}
                                    />
                                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>
                                        * Tamaño máximo total recomendado: 20MB (.mp3 o .wav)
                                    </p>
                                    <p style={{ fontSize: '12px', color: 'var(--gris-texto)', marginTop: '8px' }}>
                                        Sube entre 1 y 25 archivos para una mejor calidad. Retell procesará la clonación.
                                    </p>
                                </div>
                                
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'flex', gap: '12px', cursor: 'pointer', alignItems: 'flex-start' }}>
                                        <input 
                                            type="checkbox" 
                                            style={{ marginTop: '4px' }}
                                            checked={legalConfirmed}
                                            onChange={(e) => setLegalConfirmed(e.target.checked)}
                                        />
                                        <span style={{ fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>
                                            Confirmo que tengo todos los derechos y consentimientos necesarios para subir y clonar estas muestras de voz, y que no utilizaré el contenido generado por la plataforma para ningún propósito ilegal, fraudulento o dañino.
                                        </span>
                                    </label>
                                </div>

                            <div style={{ marginTop: '32px' }}>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                    disabled={isProcessingCustom || !legalConfirmed}
                                >
                                    {isProcessingCustom ? (
                                        <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '16px', height: '16px' }}></span> Procesando...</>
                                    ) : (
                                        'Comenzar Clonación'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
