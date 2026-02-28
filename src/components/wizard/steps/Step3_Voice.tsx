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
const DEFAULT_ES_VOICES = [
    { id: '11labs-Adrian', name: 'Adrián', provider: 'retell', language: 'es', gender: 'male', accent: 'spain', description: 'Voz profesional y clara de España' },
    { id: 'openai-Fable', name: 'Cimo', provider: 'retell', language: 'es', gender: 'male', accent: 'latam', description: 'Voz energética y amigable' },
    { id: 'openai-Shimmer', name: 'Serena', provider: 'retell', language: 'es', gender: 'female', accent: 'latam', description: 'Voz cálida y natural' },
    { id: 'openai-Nova', name: 'Isabela', provider: 'retell', language: 'es', gender: 'female', accent: 'latam', description: 'Voz profesional y articulada' },
];

export const Step3_Voice: React.FC = () => {
    const { voiceId, voiceSpeed, voiceTemperature, updateField, prevStep, nextStep } = useWizardStore();

    const [voices, setVoices] = useState<Voice[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(true);
    const [filterLang, setFilterLang] = useState('es');
    const [filterGender, setFilterGender] = useState('');
    const [filterAccent, setFilterAccent] = useState('');
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    // Cargar voces desde la API
    React.useEffect(() => {
        async function fetchVoices() {
            setIsLoadingVoices(true);
            try {
                const response = await fetch('/api/retell/voices');
                const data = await response.json();
                if (data.success && data.voices) {
                    setVoices(data.voices);
                } else {
                    console.warn("Failed to fetch voices from API, using fallback data");
                    // Fallback para no dejar la lista vacía si falla la API
                    // @ts-expect-error - Fallback data format
                    setVoices(DEFAULT_ES_VOICES);
                }
            } catch (error) {
                console.error("Error loading voices:", error);
                // @ts-expect-error - Fallback data format
                setVoices(DEFAULT_ES_VOICES);
            } finally {
                setIsLoadingVoices(false);
            }
        }
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
            // Adaptamos el filtrado para los campos de Retell que pueden variar
            const lang = v.language?.toLowerCase() || '';
            const targetLang = filterLang.toLowerCase();

            return (!filterLang || lang.startsWith(targetLang)) &&
                (!filterGender || v.gender === filterGender) &&
                (!filterAccent || (v.accent || '').includes(filterAccent));
        });
    }, [voices, filterLang, filterGender, filterAccent]);

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

                <div className="alert-info">
                    <i className="bi bi-lightbulb-fill"></i>
                    <div>
                        <strong>Tip:</strong> Escucha varias voces antes de decidir. La voz transmite la personalidad de tu marca.
                    </div>
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

                    {/* GALERÍA DE VOCES */}
                    <div className="voices-grid">
                        {isLoadingVoices ? (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px' }}>
                                <div style={{ marginBottom: '16px' }}>Cargando voces de Retell...</div>
                                <div className="spinner-border text-primary" role="status"></div>
                            </div>
                        ) : (filteredVoices as Voice[]).map((v: Voice) => (
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
                                <div style={{ fontSize: '12px', color: 'var(--gris-texto)', marginBottom: '12px' }}>{v.accent || 'Voz de Retell'}</div>
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
        </div>
    );
};
