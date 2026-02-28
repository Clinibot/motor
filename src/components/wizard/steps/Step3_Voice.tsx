"use client";

import React, { useState, useMemo } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

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
const DEFAULT_VOICES: Voice[] = [
    { voice_id: '11labs-Adrian', voice_name: 'Adrián', provider: 'elevenlabs', language: 'es', gender: 'male', accent: 'spain', preview_audio_url: 'https://storage.googleapis.com/retell-api/11labs-Adrian.mp3' },
    { voice_id: 'openai-Fable', voice_name: 'Cimo', provider: 'openai', language: 'es', gender: 'male', accent: 'latam', preview_audio_url: 'https://storage.googleapis.com/retell-api/openai-Fable.mp3' },
    { voice_id: 'openai-Shimmer', voice_name: 'Serena', provider: 'openai', language: 'es', gender: 'female', accent: 'latam', preview_audio_url: 'https://storage.googleapis.com/retell-api/openai-Shimmer.mp3' },
    { voice_id: 'cartesia-Elena', voice_name: 'Elena', provider: 'cartesia', language: 'es', gender: 'female', accent: 'spain' },
    { voice_id: '11labs-George', voice_name: 'George', provider: 'elevenlabs', language: 'en', gender: 'male', accent: 'usa' },
    { voice_id: '11labs-Alice', voice_name: 'Alice', provider: 'elevenlabs', language: 'en', gender: 'female', accent: 'uk' },
    { voice_id: '11labs-Jean', voice_name: 'Jean', provider: 'elevenlabs', language: 'fr', gender: 'male', accent: 'france' },
];

export const Step3_Voice: React.FC = () => {
    const { voiceId, voiceSpeed, voiceTemperature, updateField, prevStep, nextStep } = useWizardStore();

    const [voices, setVoices] = useState<Voice[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(true);
    const [isProcessingCustom, setIsProcessingCustom] = useState(false);
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customTab, setCustomTab] = useState<'import' | 'clone'>('import');
    const [activeProvider, setActiveProvider] = useState('retell');

    // Form states
    const [customName, setCustomName] = useState('');
    const [importVoiceId, setImportVoiceId] = useState('');
    const [publicUserId, setPublicUserId] = useState('');
    const [cloneFiles, setCloneFiles] = useState<FileList | null>(null);

    const [filterLang, setFilterLang] = useState('es');
    const [filterGender, setFilterGender] = useState('');
    const [filterAccent, setFilterAccent] = useState('');
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const fetchVoices = async () => {
        setIsLoadingVoices(true);
        try {
            const response = await fetch('/api/retell/voices');
            const data = await response.json();
            if (data.success && data.voices && data.voices.length > 0) {
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

                    // Detección flexible de acento
                    let accent = voiceAccentAttr;
                    if (accent.includes('spain') ||
                        accent.includes('españa') ||
                        accent.includes('castilian') ||
                        accent.includes('castellano') ||
                        voiceName.includes('española') ||
                        voiceName.includes('madrid') ||
                        voiceName.includes('barcelona')) {
                        accent = 'spain';
                    } else if (accent.includes('latam') ||
                        accent.includes('mexico') ||
                        accent.includes('colombia') ||
                        accent.includes('latino') ||
                        accent.includes('mexican') ||
                        accent.includes('argentina') ||
                        accent.includes('chile') ||
                        accent.includes('peru') ||
                        voiceName.includes('latam')) {
                        accent = 'latam';
                    } else if (accent.includes('usa') || accent.includes('american') || accent.includes('eeuu') || accent.includes('us-')) {
                        accent = 'usa';
                    } else if (accent.includes('uk') || accent.includes('british') || accent.includes('británico') || accent.includes('london')) {
                        accent = 'uk';
                    }

                    // Normalizar proveedor de forma agresiva
                    let provider = (v.provider || '').toLowerCase();
                    const id = (v.voice_id || '').toLowerCase();
                    if (id.includes('11labs') || id.includes('elevenlabs') || provider.includes('eleven') || provider.includes('11')) provider = 'elevenlabs';
                    else if (id.includes('openai') || provider.includes('openai')) provider = 'openai';
                    else if (id.includes('cartesia') || provider.includes('cartesia')) provider = 'cartesia';
                    else provider = 'retell';

                    return {
                        ...v,
                        language: lang,
                        accent: accent,
                        provider: provider,
                        raw_language: v.language, // Para depuración si fuera necesario
                        raw_accent: v.accent
                    };
                });
                console.log("Voces normalizadas:", normalized.length, normalized.filter((v: Voice) => v.language === 'es').length, "en español");
                setVoices(normalized);
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
        return voices.filter(v => {
            const matchesProvider = activeProvider === 'retell'
                ? (v.provider === 'retell' || v.provider === 'openai') // Agrupar Retell y OpenAI como en la captura
                : v.provider === activeProvider;

            const matchesLang = !filterLang || v.language === filterLang;
            const matchesGender = !filterGender || v.gender === filterGender;
            const matchesAccent = !filterAccent || v.accent === filterAccent;
            return matchesProvider && matchesLang && matchesGender && matchesAccent;
        });
    }, [voices, activeProvider, filterLang, filterGender, filterAccent]);

    const handleCustomVoiceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessingCustom(true);

        try {
            let res;
            if (customTab === 'import') {
                res = await fetch('/api/retell/voices/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        voice_name: customName,
                        provider_voice_id: importVoiceId,
                        public_user_id: publicUserId
                    })
                });
            } else {
                const formData = new FormData();
                formData.append('voice_name', customName);
                if (cloneFiles) {
                    for (let i = 0; i < cloneFiles.length; i++) {
                        formData.append('files', cloneFiles[i]);
                    }
                }
                res = await fetch('/api/retell/voices/clone', {
                    method: 'POST',
                    body: formData
                });
            }

            const data = await res.json();
            if (data.success) {
                alert(customTab === 'import' ? "Voz importada con éxito" : "Voz clonada con éxito");
                setShowCustomModal(false);
                setCustomName('');
                setImportVoiceId('');
                setPublicUserId('');
                setCloneFiles(null);
                fetchVoices(); // Refrescar lista
            } else {
                alert("Error: " + data.error);
            }
        } catch (error) {
            console.error("Error processing custom voice:", error);
            alert("Ocurrió un error inesperado.");
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
                <h1 className="section-title">
                    Selección de voz del agente
                    <div className="custom-tooltip">
                        <i className="bi bi-info-circle tooltip-icon"></i>
                        <div className="tooltip-content">
                            La voz es la cara audible de tu marca. Elige entre diferentes proveedores para encontrar el tono, acento y género que mejor encaje.
                        </div>
                    </div>
                </h1>
                <p className="section-subtitle">
                    Elige la voz que mejor represente la personalidad de tu agente.
                </p>

                <div className="alert-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <i className="bi bi-lightbulb-fill"></i>
                        <div>
                            <strong>Tip:</strong> Escucha varias voces antes de decidir. La voz transmite la personalidad de tu marca.
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', fontSize: '13px', background: 'var(--oscuro)' }}
                        onClick={() => setShowCustomModal(true)}
                    >
                        <i className="bi bi-plus-circle"></i> Añadir Voz Personalizada
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
                            { id: 'retell', name: 'Retell AI', icon: 'bi-cpu-fill' },
                            { id: 'elevenlabs', name: 'ElevenLabs', icon: 'bi-music-note-beamed' },
                            { id: 'cartesia', name: 'Cartesia', icon: 'bi-gem' }
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
                                {filteredVoices.map((v: Voice) => (
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
                                        <div className="voice-name" style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{v.voice_name}</div>
                                        <div className="voice-desc" style={{ fontSize: '11px', color: '#64748b', marginBottom: '16px', minHeight: '32px' }}>
                                            Voz {v.gender === 'female' ? 'femenina' : 'masculina'} {v.accent ? getAccentName(v.accent).toLowerCase() : 'profesional'}
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
                                                background: v.provider === 'elevenlabs' ? '#f0f9ff' : '#f8fafc',
                                                color: v.provider === 'elevenlabs' ? '#0369a1' : '#64748b',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: 700
                                            }}>{v.provider === 'elevenlabs' ? 'HD' : 'Pro'}</span>
                                        </div>

                                        <button
                                            type="button"
                                            className="btn-play"
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0',
                                                background: 'white',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px'
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                togglePlay(v);
                                            }}
                                        >
                                            {playingId === v.voice_id ? (
                                                <><i className="bi bi-pause-fill"></i> Pausar</>
                                            ) : (
                                                <><i className="bi bi-play-fill"></i> Escuchar</>
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>

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
                                <div className="custom-tooltip">
                                    <i className="bi bi-info-circle tooltip-icon"></i>
                                    <div className="tooltip-content">
                                        <strong>Velocidad de habla:</strong><br />
                                        Controla qué tan rápido habla el agente. Valores entre 0.9 y 1.1 suenan más naturales.
                                    </div>
                                </div>
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
                                <div className="custom-tooltip">
                                    <i className="bi bi-info-circle tooltip-icon"></i>
                                    <div className="tooltip-content">
                                        <strong>Variación emocional:</strong><br />
                                        A mayor temperatura, la voz tendrá más inflexiones y sonará más expresiva y humana.
                                    </div>
                                </div>
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
                            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Añadir Voz Personalizada</h2>
                            <button type="button" onClick={() => setShowCustomModal(false)} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--gris-texto)' }}>&times;</button>
                        </div>

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
                                />
                            </div>

                            {customTab === 'import' ? (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Provider Voice ID (ElevenLabs)</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Pega el ID de ElevenLabs aquí"
                                            value={importVoiceId}
                                            onChange={(e) => setImportVoiceId(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Public User ID (Opcional)</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Solo si es una voz de la comunidad"
                                            value={publicUserId}
                                            onChange={(e) => setPublicUserId(e.target.value)}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="form-group">
                                    <label className="form-label">Archivos de audio (WAV/MP3)</label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        multiple
                                        accept="audio/*"
                                        onChange={(e) => setCloneFiles(e.target.files)}
                                        required
                                    />
                                    <p style={{ fontSize: '12px', color: 'var(--gris-texto)', marginTop: '8px' }}>
                                        Sube entre 1 y 25 archivos para una mejor calidad. Retell procesará la clonación.
                                    </p>
                                </div>
                            )}

                            <div style={{ marginTop: '32px' }}>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                    disabled={isProcessingCustom}
                                >
                                    {isProcessingCustom ? (
                                        <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '16px', height: '16px' }}></span> Procesando...</>
                                    ) : (
                                        customTab === 'import' ? 'Importar Voz' : 'Comenzar Clonación'
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
