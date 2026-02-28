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
                setVoices(data.voices);
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
            const voiceLang = (v.language || '').toLowerCase();
            const voiceName = (v.voice_name || '').toLowerCase();
            const voiceGender = (v.gender || '').toLowerCase();
            const voiceAccent = (v.accent || '').toLowerCase();

            const filterLangLower = filterLang.toLowerCase();
            const filterGenderLower = filterGender.toLowerCase();
            const filterAccentLower = filterAccent.toLowerCase();

            const matchesLang = !filterLang ||
                voiceLang.startsWith(filterLangLower) ||
                voiceLang.includes(filterLangLower) ||
                (filterLangLower === 'es' && (voiceLang.includes('spanish') || voiceName.includes('spanish')));

            const matchesGender = !filterGender || voiceGender === filterGenderLower;
            const matchesAccent = !filterAccent || voiceAccent.includes(filterAccentLower);

            return matchesLang && matchesGender && matchesAccent;
        });
    }, [voices, filterLang, filterGender, filterAccent]);

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

    const getGenderName = (gender: string) => gender === 'female' ? 'Femenino' : 'Masculino';

    const getAccentName = (accent: string) => {
        const names: Record<string, string> = { spain: 'España', latam: 'Latam', usa: 'USA', uk: 'UK', brazil: 'Brasil', france: 'Francia' };
        return names[accent] || accent;
    };

    // @ts-expect-error - Retell voice object type
    const togglePlay = (v) => {
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
                    {/* FILTROS */}
                    <div className="filters-row">
                        <div>
                            <label className="form-label">Idioma</label>
                            <select className="form-control" value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
                                <option value="">Todos</option>
                                <option value="es">Español</option>
                                <option value="en">Inglés</option>
                                <option value="fr">Francés</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Género</label>
                            <select className="form-control" value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
                                <option value="">Todos</option>
                                <option value="female">Femenino</option>
                                <option value="male">Masculino</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Acento</label>
                            <select className="form-control" value={filterAccent} onChange={(e) => setFilterAccent(e.target.value)}>
                                <option value="">Todos</option>
                                <option value="spain">España</option>
                                <option value="latam">Latinoamérica</option>
                                <option value="usa">USA</option>
                                <option value="uk">UK</option>
                                <option value="france">Francia</option>
                            </select>
                        </div>
                    </div>

                    {/* GALERÍA DE VOCES AGRUPADAS */}
                    {isLoadingVoices ? (
                        <div style={{ textAlign: 'center', padding: '60px' }}>
                            <div style={{ marginBottom: '16px' }}>Cargando voces de alta calidad...</div>
                            <div className="spinner-border text-primary" role="status"></div>
                        </div>
                    ) : (
                        <div className="voices-container">
                            {['elevenlabs', 'openai', 'cartesia'].map(provider => {
                                const providerVoices = filteredVoices.filter(v => {
                                    const p = (v.provider || '').toLowerCase();
                                    const id = (v.voice_id || '').toLowerCase();

                                    if (provider === 'elevenlabs') {
                                        return p === 'elevenlabs' || p === '11labs' || id.includes('11labs') || id.includes('eleven');
                                    }
                                    return p === provider || id.includes(provider);
                                });

                                if (providerVoices.length === 0) return null;

                                return (
                                    <div key={provider} className="provider-group" style={{ marginBottom: '32px' }}>
                                        <h3 className="provider-title" style={{
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            color: 'var(--gris-texto)',
                                            marginBottom: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primario)' }}></span>
                                            {provider === 'elevenlabs' ? 'ElevenLabs (Premium)' : provider.toUpperCase()}
                                        </h3>
                                        <div className="voices-grid">
                                            {providerVoices.map((v: Voice) => (
                                                <div
                                                    key={`${v.voice_id}-${v.language}`}
                                                    className={`voice-card ${voiceId === v.voice_id ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        updateField('voiceId', v.voice_id);
                                                        updateField('voiceName', v.voice_name);
                                                        updateField('voiceProvider', v.provider || provider);
                                                        updateField('voiceDescription', v.accent || 'Voz de alta calidad');
                                                    }}
                                                >
                                                    <div className="voice-icon">
                                                        {v.gender === 'female' ? '👩' : '👨'}
                                                    </div>
                                                    <div className="voice-name">{v.voice_name}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--gris-texto)', marginBottom: '12px' }}>{v.accent || 'Voz profesional'}</div>
                                                    <div className="voice-tags">
                                                        <span className="voice-tag">{getLanguageName(v.language)}</span>
                                                        <span className="voice-tag">{getGenderName(v.gender)}</span>
                                                        <span className="voice-tag">{getAccentName(v.accent)}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn-play"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePlay(v);
                                                        }}
                                                    >
                                                        {playingId === v.voice_id ? (
                                                            <><i className="bi bi-pause-circle"></i> Pausar</>
                                                        ) : (
                                                            <><i className="bi bi-play-circle"></i> Escuchar</>
                                                        )}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Grupo para proveedores desconocidos o Retell nativo */}
                            {filteredVoices.filter(v =>
                                !['elevenlabs', 'openai', 'cartesia'].some(p =>
                                    (v.provider || '').toLowerCase() === p || (v.voice_id || '').toLowerCase().includes(p)
                                )
                            ).length > 0 && (
                                    <div className="provider-group">
                                        <h3 className="provider-title" style={{
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            color: 'var(--gris-texto)',
                                            marginBottom: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6c757d' }}></span>
                                            Otros Proveedores
                                        </h3>
                                        <div className="voices-grid">
                                            {filteredVoices.filter(v =>
                                                !['elevenlabs', 'openai', 'cartesia'].some(p =>
                                                    (v.provider || '').toLowerCase() === p || (v.voice_id || '').toLowerCase().includes(p)
                                                )
                                            ).map((v: Voice) => (
                                                <div
                                                    key={`${v.voice_id}-${v.language}`}
                                                    className={`voice-card ${voiceId === v.voice_id ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        updateField('voiceId', v.voice_id);
                                                        updateField('voiceName', v.voice_name);
                                                        updateField('voiceProvider', v.provider || 'retell');
                                                        updateField('voiceDescription', v.accent || 'Voz de alta calidad');
                                                    }}
                                                >
                                                    <div className="voice-icon">
                                                        {v.gender === 'female' ? '👩' : '👨'}
                                                    </div>
                                                    <div className="voice-name">{v.voice_name}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--gris-texto)', marginBottom: '12px' }}>{v.accent || 'Voz profesional'}</div>
                                                    <div className="voice-tags">
                                                        <span className="voice-tag">{getLanguageName(v.language)}</span>
                                                        <span className="voice-tag">{getGenderName(v.gender)}</span>
                                                        <span className="voice-tag">{getAccentName(v.accent)}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn-play"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePlay(v);
                                                        }}
                                                    >
                                                        {playingId === v.voice_id ? (
                                                            <><i className="bi bi-pause-circle"></i> Pausar</>
                                                        ) : (
                                                            <><i className="bi bi-play-circle"></i> Escuchar</>
                                                        )}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                        </div>
                    )}

                    {filteredVoices.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gris-texto)' }}>
                            <i className="bi bi-search" style={{ fontSize: '48px', opacity: 0.3 }}></i>
                            <p>No se encontraron voces con estos filtros.</p>
                        </div>
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
