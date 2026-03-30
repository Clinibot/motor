"use client";

import React, { useState, useMemo } from 'react';
import { useWizardStore, CURATED_VOICES_V2, Voice } from '../../../store/wizardStore';
import { toast } from 'react-hot-toast';

const LANG_LABELS: Record<string, { label: string; flag: React.ReactNode }> = {
    es: {
        label: 'ESPAÑOL',
        flag: (
            <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: '2px', flexShrink: 0 }}>
                <rect width="20" height="14" fill="#AA151B"/>
                <rect y="3.5" width="20" height="7" fill="#F1BF00"/>
            </svg>
        ),
    },
    en: {
        label: 'INGLÉS',
        flag: (
            <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: '2px', flexShrink: 0 }}>
                <rect width="20" height="14" fill="#012169"/>
                <path d="M0,0 L20,14 M20,0 L0,14" stroke="white" strokeWidth="3"/>
                <path d="M0,0 L20,14 M20,0 L0,14" stroke="#C8102E" strokeWidth="2"/>
                <path d="M10,0 V14 M0,7 H20" stroke="white" strokeWidth="4"/>
                <path d="M10,0 V14 M0,7 H20" stroke="#C8102E" strokeWidth="2.5"/>
            </svg>
        ),
    },
    ca: {
        label: 'CATALÁN',
        flag: (
            <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: '2px', flexShrink: 0 }}>
                <rect width="20" height="14" fill="#FCDD09"/>
                <rect y="2" width="20" height="2" fill="#DA121A"/>
                <rect y="6" width="20" height="2" fill="#DA121A"/>
                <rect y="10" width="20" height="2" fill="#DA121A"/>
            </svg>
        ),
    },
};

export const Step3_Voice: React.FC = () => {
    const { voiceId, updateField, prevStep, nextStep } = useWizardStore();
    const [activeGender, setActiveGender] = useState('all');
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const filteredVoices = useMemo(() => {
        return CURATED_VOICES_V2.filter(v => activeGender === 'all' || v.gender === activeGender);
    }, [activeGender]);

    const togglePlay = (v: Voice) => {
        if (playingId === v.voice_id) {
            audioRef.current?.pause();
            setPlayingId(null);
            return;
        }
        if (audioRef.current) audioRef.current.pause();
        if (!v.preview_audio_url) { toast.error('Audio no disponible'); return; }

        const newAudio = new Audio(v.preview_audio_url);
        newAudio.onplay = () => setPlayingId(v.voice_id);
        newAudio.onended = () => setPlayingId(null);
        newAudio.onerror = () => setPlayingId(null);
        audioRef.current = newAudio;
        newAudio.play().catch(() => { toast.error('Error al reproducir audio'); setPlayingId(null); });
    };

    const selectVoice = (v: Voice) => {
        if (v.isComingSoon) return;
        updateField('voiceId', v.voice_id);
        updateField('voiceName', v.voice_name);
        updateField('voiceProvider', v.provider);
    };

    const languages = ['es', 'en', 'ca'];

    return (
        <div className="form-card">
            <div className="form-title">Voz del agente</div>
            <div className="form-sub">Elige la voz que usará tu agente. Haz clic en Preview para escuchar la muestra.</div>

            <div className="ci" style={{ marginBottom: '20px' }}>
                <i className="bi bi-info-circle-fill" style={{ flexShrink: 0, marginTop: '1px' }}></i>
                <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                    Cada voz está optimizada para su idioma. Las voces de <strong>Cartesia</strong> y <strong>ElevenLabs</strong> son las más naturales en español. Las voces marcadas como <em>Próximamente</em> estarán disponibles en futuras versiones.
                </div>
            </div>

            {/* Gender filter */}
            <div className="fg">
                <label className="lbl">Filtrar por género</label>
                <div className="pill-row" style={{ marginBottom: '24px' }}>
                    {[{ id: 'all', label: 'Todos' }, { id: 'male', label: 'Masculino ♂' }, { id: 'female', label: 'Femenino ♀' }].map(btn => (
                        <button
                            key={btn.id} type="button"
                            className={`pill${activeGender === btn.id ? ' on' : ''}`}
                            onClick={() => setActiveGender(btn.id)}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Voice groups by language */}
            {languages.map(langId => {
                const meta = LANG_LABELS[langId];
                const voices = filteredVoices.filter(v => v.language === langId);
                if (voices.length === 0) return null;

                return (
                    <div key={langId} style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gris-texto)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {meta.flag} {meta.label}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                            {voices.map(v => {
                                const isSelected = voiceId === v.voice_id;
                                const isComingSoon = v.isComingSoon;
                                const providerColor: Record<string, { bg: string; color: string; border: string }> = {
                                    cartesia: { bg: 'var(--azul-light)', color: 'var(--azul)', border: '#bee3f8' },
                                    elevenlabs: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
                                    openai: { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
                                };
                                const pc = providerColor[v.provider?.toLowerCase() ?? ''] ?? providerColor.openai;
                                const providerLabel = v.provider ? v.provider.charAt(0).toUpperCase() + v.provider.slice(1) : '';

                                return (
                                    <div
                                        key={v.voice_id}
                                        className={`vcard-v${isSelected ? ' on' : ''}`}
                                        style={isComingSoon ? { borderStyle: 'dashed' } : {}}
                                        onClick={() => selectVoice(v)}
                                    >
                                        <div className="vrow">
                                            <div style={{
                                                width: '52px', height: '52px', minWidth: '52px',
                                                borderRadius: '50%',
                                                background: isComingSoon ? 'var(--gris-bg)' : 'var(--azul-light)',
                                                color: isComingSoon ? '#9ca3af' : 'var(--azul)',
                                                fontSize: isComingSoon ? undefined : '18px',
                                                fontWeight: 800,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                {isComingSoon
                                                    ? <i className="bi bi-mic" style={{ fontSize: '20px' }}></i>
                                                    : v.voice_name.charAt(0)}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div className="vname" style={{ fontSize: '15px' }}>{v.voice_name}</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' }}>
                                                    <span style={{ background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 500 }}>
                                                        {v.language === 'es' ? 'Español' : v.language === 'en' ? 'Inglés' : 'Catalán/Multilingüe'}
                                                    </span>
                                                    <span style={{ background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 500 }}>
                                                        {v.gender === 'male' ? 'Masculino' : 'Femenino'}
                                                    </span>
                                                    {isComingSoon ? (
                                                        <span style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, color: '#92400e' }}>Próximamente</span>
                                                    ) : (
                                                        <span style={{ background: pc.bg, border: `1px solid ${pc.border}`, borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 500, color: pc.color }}>{providerLabel}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {!isComingSoon && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); togglePlay(v); }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--gris-texto)', fontSize: '13px', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                                            >
                                                <i className={`bi ${playingId === v.voice_id ? 'bi-pause-circle' : 'bi-play-circle'}`} style={{ fontSize: '16px' }}></i>
                                                Preview
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            <hr className="divider" />

            {/* Clone voice banner */}
            <div style={{ background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <i className="bi bi-mic" style={{ fontSize: '18px', color: 'var(--gris-texto)' }}></i>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--oscuro)' }}>
                            Clonar tu voz <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', marginLeft: '6px' }}>Premium</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--gris-texto)', marginTop: '2px' }}>Crea un agente con tu propia voz o la de alguien de tu equipo.</div>
                    </div>
                </div>
                <button type="button" className="btn-s" style={{ whiteSpace: 'nowrap' }}>
                    + Clonar voz
                </button>
            </div>

            <div className="wiz-footer">
                <button type="button" className="btn-s" onClick={prevStep}>
                    <i className="bi bi-arrow-left"></i> Anterior
                </button>
                <button type="button" className="btn-p" onClick={nextStep} disabled={!voiceId}>
                    Siguiente <i className="bi bi-arrow-right"></i>
                </button>
            </div>
        </div>
    );
};
