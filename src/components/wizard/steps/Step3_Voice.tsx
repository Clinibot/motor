"use client";

import React, { useState, useMemo } from 'react';
import { useWizardStore, CURATED_VOICES_V2, Voice } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';
import { toast } from 'react-hot-toast';

export const Step3_Voice: React.FC = () => {
    const { voiceId, updateField, prevStep, nextStep } = useWizardStore();
    const [activeGender, setActiveGender] = useState('all');
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const languages = [
        { id: 'es', label: 'ESPAÑOL', icon: '🇪🇸' },
        { id: 'en', label: 'INGLÉS', icon: '🇬🇧' },
        { id: 'ca', label: 'CATALÁN', icon: '🇪🇸' }
    ];

    const filteredVoices = useMemo(() => {
        return CURATED_VOICES_V2.filter(v => {
            if (activeGender === 'all') return true;
            return v.gender === activeGender;
        });
    }, [activeGender]);

    const togglePlay = (v: Voice) => {
        if (playingId === v.voice_id) {
            audioRef.current?.pause();
            setPlayingId(null);
            return;
        }
        if (audioRef.current) audioRef.current.pause();

        if (!v.preview_audio_url) {
            toast.error("Audio no disponible");
            return;
        }

        const newAudio = new Audio(v.preview_audio_url);
        newAudio.onplay = () => setPlayingId(v.voice_id);
        newAudio.onended = () => setPlayingId(null);
        newAudio.onerror = () => setPlayingId(null);
        audioRef.current = newAudio;
        newAudio.play().catch(() => {
            toast.error("Error al reproducir audio");
            setPlayingId(null);
        });
    };

    const VoiceCard = ({ v }: { v: Voice }) => {
        const isSelected = voiceId === v.voice_id;
        const isComingSoon = v.isComingSoon;

        return (
            <div
                onClick={() => {
                    if (isComingSoon) return;
                    updateField('voiceId', v.voice_id);
                    updateField('voiceName', v.voice_name);
                    updateField('voiceProvider', v.provider);
                }}
                style={{ 
                    background: 'white',
                    border: isSelected ? '2px solid var(--azul)' : (isComingSoon ? '1px dashed var(--slate-300)' : '1px solid var(--slate-100)'),
                    borderRadius: '20px',
                    padding: '24px',
                    cursor: isComingSoon ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: isSelected ? '0 10px 25px -5px rgba(37, 99, 235, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)',
                }}
            >
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ 
                        width: '56px', 
                        height: '56px', 
                        borderRadius: '50%', 
                        background: '#f0f7ff', 
                        color: 'var(--azul)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: 800,
                        flexShrink: 0,
                        filter: isComingSoon ? 'grayscale(1)' : 'none',
                        opacity: isComingSoon ? 0.5 : 1
                    }}>
                        {isComingSoon ? <i className="bi bi-mic" style={{ fontSize: '20px', color: 'var(--slate-400)' }}></i> : v.voice_name.charAt(0)}
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--slate-900)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                            {v.voice_name}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ 
                                fontSize: '10px', 
                                fontWeight: 800, 
                                color: 'var(--slate-500)', 
                                background: 'var(--slate-100)',
                                padding: '4px 10px',
                                borderRadius: '100px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.02em'
                            }}>
                                {v.language === 'es' ? 'Español' : (v.language === 'en' ? 'Inglés' : (v.language === 'ca' ? 'Catalán' : v.language))}
                            </span>
                            <span style={{ 
                                fontSize: '10px', 
                                fontWeight: 800, 
                                color: 'var(--slate-500)', 
                                background: 'var(--slate-100)',
                                padding: '4px 10px',
                                borderRadius: '100px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.02em'
                            }}>
                                {v.gender === 'male' ? 'Masculino' : 'Femenino'}
                            </span>
                            {isComingSoon && (
                                <span style={{ 
                                    fontSize: '10px', 
                                    fontWeight: 800, 
                                    color: '#b45309', 
                                    background: '#fffbeb',
                                    padding: '4px 10px',
                                    borderRadius: '100px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.02em'
                                }}>
                                    Próximamente
                                </span>
                            )}
                            {(v.provider === 'premium' && !isComingSoon) && (
                                <span style={{ 
                                    fontSize: '10px', 
                                    fontWeight: 800, 
                                    color: 'var(--azul)', 
                                    background: 'var(--azul-light)',
                                    padding: '4px 10px',
                                    borderRadius: '100px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.02em'
                                }}>
                                    HD Premium
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {!isComingSoon && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); togglePlay(v); }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--slate-600)',
                            fontSize: '14px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '0',
                            marginTop: 'auto',
                            width: 'fit-content'
                        }}
                    >
                        <i className={`bi ${playingId === v.voice_id ? 'bi-pause-circle' : 'bi-play-circle'}`} style={{ fontSize: '20px' }}></i>
                        Preview
                    </button>
                )}

                {isSelected && (
                    <div style={{ 
                        position: 'absolute', 
                        top: '12px', 
                        right: '12px',
                        width: '24px',
                        height: '24px',
                        background: 'var(--azul)',
                        borderRadius: '50%',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)'
                    }}>
                        <i className="bi bi-check-lg"></i>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="content-area" style={{ padding: '60px' }}>
            <WizardStepHeader
                title="Voz del agente"
                subtitle="Elige la voz que usará tu agente. Haz clic en Preview para escuchar la muestra."
                showArrows={false}
            />

            <div style={{ maxWidth: '1100px', marginTop: '40px' }}>
                


                {/* FILTERS */}
                <div style={{ marginBottom: '40px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '16px' }}>
                        Filtrar por género
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {[
                            { id: 'all', label: 'Todos' },
                            { id: 'male', label: 'Masculino ♂' },
                            { id: 'female', label: 'Femenino ♀' }
                        ].map(btn => (
                            <button
                                key={btn.id}
                                type="button"
                                onClick={() => setActiveGender(btn.id)}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    border: '1px solid ' + (activeGender === btn.id ? 'var(--azul)' : 'var(--slate-200)'),
                                    background: activeGender === btn.id ? 'var(--azul)' : 'white',
                                    color: activeGender === btn.id ? 'white' : 'var(--slate-600)',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer'
                                }}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* VOICE GROUPS */}
                {languages.map(lang => {
                    const voicesInLang = filteredVoices.filter(v => v.language === lang.id);
                    if (voicesInLang.length === 0) return null;

                    return (
                        <div key={lang.id} style={{ marginBottom: '48px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                                <span style={{ fontSize: '20px' }}>{lang.icon}</span>
                                <h3 style={{ fontSize: '13px', fontWeight: 900, color: 'var(--slate-500)', letterSpacing: '0.05em', margin: 0 }}>
                                    {lang.label}
                                </h3>
                            </div>
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(2, 1fr)', 
                                gap: '24px'
                            }}>
                                {voicesInLang.map(v => (
                                    <VoiceCard key={v.voice_id} v={v} />
                                ))}
                            </div>
                        </div>
                    );
                })}



                {/* NAVIGATION */}
                <div className="flex-between" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '48px', marginTop: '60px' }}>
                    <button 
                        type="button" 
                        className="btn-s" 
                        onClick={prevStep}
                        style={{ height: '56px', padding: '0 36px', borderRadius: '18px', fontWeight: 700 }}
                    >
                        Anterior
                    </button>
                    <button 
                        type="button" 
                        className="btn-p" 
                        onClick={nextStep}
                        disabled={!voiceId}
                        style={{ height: '56px', padding: '0 44px', borderRadius: '18px', fontWeight: 900, boxShadow: '0 15px 30px -10px rgba(37, 99, 235, 0.4)' }}
                    >
                        Siguiente
                        <i className="bi bi-arrow-right" style={{ marginLeft: '12px' }}></i>
                    </button>
                </div>
            </div>
        </div>
    );
};
