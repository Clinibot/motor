"use client";

import React, { useState, useMemo } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

interface Voice {
    id: string;
    name: string;
    provider: 'retell' | 'elevenlabs' | 'cartesia';
    language: string;
    gender: 'male' | 'female';
    accent: string;
    description: string;
    previewUrl?: string;
}

const VOICES_DATA: Voice[] = [
    // Español
    { id: '11labs-Adrian', name: 'Adrián', provider: 'retell', language: 'es', gender: 'male', accent: 'spain', description: 'Voz profesional y clara de España', previewUrl: 'https://retell-utils-public.s3.us-west-2.amazonaws.com/adrian.mp3' },
    { id: 'openai-Fable', name: 'Cimo', provider: 'retell', language: 'es', gender: 'male', accent: 'latam', description: 'Voz energética y amigable', previewUrl: 'https://retell-utils-public.s3.us-west-2.amazonaws.com/fable.mp3' },
    { id: 'openai-Shimmer', name: 'Serena', provider: 'retell', language: 'es', gender: 'female', accent: 'latam', description: 'Voz cálida y natural', previewUrl: 'https://retell-utils-public.s3.us-west-2.amazonaws.com/shimmer.mp3' },
    { id: 'openai-Nova', name: 'Isabela', provider: 'retell', language: 'es', gender: 'female', accent: 'latam', description: 'Voz profesional y articulada', previewUrl: 'https://retell-utils-public.s3.us-west-2.amazonaws.com/nova.mp3' },
    { id: 'cartesia-Elena', name: 'Elena (Beta)', provider: 'cartesia', language: 'es', gender: 'female', accent: 'spain', description: 'Voz suave para atención al cliente', previewUrl: 'https://retell-utils-public.s3.us-west-2.amazonaws.com/shimmer.mp3' },
    { id: 'cartesia-Isabel', name: 'Isabel (Beta)', provider: 'cartesia', language: 'es', gender: 'female', accent: 'latam', description: 'Voz clara y jovial', previewUrl: 'https://retell-utils-public.s3.us-west-2.amazonaws.com/nova.mp3' },
    { id: 'cartesia-Manuel', name: 'Manuel (Beta)', provider: 'cartesia', language: 'es', gender: 'male', accent: 'spain', description: 'Voz confiable y segura', previewUrl: 'https://retell-utils-public.s3.us-west-2.amazonaws.com/fable.mp3' },

    // Inglés
    { id: '11labs-Adrian', name: 'Thomas', provider: 'retell', language: 'en', gender: 'male', accent: 'american', description: 'Clear American deep voice', previewUrl: 'https://retell-utils-public.s3.us-west-2.amazonaws.com/adrian.mp3' },
    { id: 'openai-Shimmer', name: 'Charlie', provider: 'retell', language: 'en', gender: 'female', accent: 'american', description: 'Warm and professional', previewUrl: 'https://retell-utils-public.s3.us-west-2.amazonaws.com/shimmer.mp3' },

    // Francés
    { id: 'openai-Fable', name: 'Pierre', provider: 'retell', language: 'fr', gender: 'male', accent: 'french', description: 'Voz elegante de París', previewUrl: 'https://retell-utils-public.s3.us-west-2.amazonaws.com/fable.mp3' },
];

export const Step3_Voice: React.FC = () => {
    const { voiceId, voiceSpeed, voiceTemperature, updateField, prevStep, nextStep } = useWizardStore();

    const [filterLang, setFilterLang] = useState('es');
    const [filterGender, setFilterGender] = useState('');
    const [filterAccent, setFilterAccent] = useState('');
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

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
        return VOICES_DATA.filter(v => {
            return (!filterLang || v.language === filterLang) &&
                (!filterGender || v.gender === filterGender) &&
                (!filterAccent || v.accent === filterAccent);
        });
    }, [filterLang, filterGender, filterAccent]);

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

    const togglePlay = (v: Voice) => {
        if (playingId === v.id) {
            audioRef.current?.pause();
            setPlayingId(null);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
        }

        const previewUrl = v.previewUrl || 'https://retell-utils-public.s3.us-west-2.amazonaws.com/adrian.mp3';
        const newAudio = new Audio(previewUrl);

        newAudio.onplay = () => setPlayingId(v.id);
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
                        {filteredVoices.map((v) => (
                            <div
                                key={`${v.id}-${v.language}`}
                                className={`voice-card ${voiceId === v.id ? 'selected' : ''}`}
                                onClick={() => {
                                    updateField('voiceId', v.id);
                                    updateField('voiceName', v.name);
                                    updateField('voiceProvider', v.provider);
                                    updateField('voiceDescription', v.description);
                                }}
                            >
                                <div className="voice-icon">
                                    {v.gender === 'female' ? '👩' : '👨'}
                                </div>
                                <div className="voice-name">{v.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--gris-texto)', marginBottom: '12px' }}>{v.description}</div>
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
                                    {playingId === v.id ? (
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
