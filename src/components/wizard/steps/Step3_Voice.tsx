"use client";

import React, { useState, useMemo } from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';
import { toast } from 'react-hot-toast';

interface Voice {
    voice_id: string;
    voice_name: string;
    provider: string;
    language: string;
    gender: 'male' | 'female';
    accent?: string;
    preview_audio_url?: string;
    isComingSoon?: boolean;
}

// Curated voices list requested by user
const CURATED_VOICES_CONFIG: (Voice & { voice_id_real?: string })[] = [
    { voice_id: 'cartesia-Isabel', voice_name: 'Isabel', provider: 'cartesia', gender: 'female', language: 'es' },
    { voice_id: 'cartesia-Manuel', voice_name: 'Manuel', provider: 'cartesia', gender: 'male', language: 'es' },
    { voice_id: '11375', voice_name: 'Santiago', provider: 'elevenlabs', gender: 'male', language: 'es' },
    { voice_id: '11068', voice_name: 'Cristina', provider: 'retell', gender: 'female', language: 'es', isComingSoon: true },
    { voice_id: '11844', voice_name: 'Mari Carme', provider: 'retell', gender: 'female', language: 'es', isComingSoon: true },
    { voice_id: '11753', voice_name: 'Adrian', provider: 'openai', gender: 'male', language: 'en', accent: 'Americano' },
    { voice_id: '12051', voice_name: 'Cimo', provider: 'openai', gender: 'female', language: 'ca', accent: 'Multilingüe' },
];

const DEFAULT_VOICES: Voice[] = CURATED_VOICES_CONFIG.map(v => ({
    voice_id: v.voice_id_real || v.voice_id,
    voice_name: v.voice_name,
    provider: v.provider,
    language: v.language,
    gender: v.gender,
    accent: v.accent || (v.language === 'es' ? 'spain' : 'usa'),
    isComingSoon: v.isComingSoon
}));

export const Step3_Voice: React.FC = () => {
    const { voiceId, updateField, prevStep, nextStep } = useWizardStore();

    const [voices, setVoices] = useState<Voice[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(true);
    const [isProcessingCustom, setIsProcessingCustom] = useState(false);
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [activeGender, setActiveGender] = useState('all'); // 'all', 'male', 'female'

    // Form states
    const [customName, setCustomName] = useState('');
    const [cloneFiles, setCloneFiles] = useState<FileList | null>(null);
    const [legalConfirmed, setLegalConfirmed] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const fetchVoices = async () => {
        setIsLoadingVoices(true);
        try {
            const response = await fetch('/api/retell/voices');
            const data = await response.json();
            if (data?.success && data?.voices) {
                const apiVoices = data.voices.map((v: { voice_id: string; provider?: string; [key: string]: unknown }) => ({
                    ...v,
                    provider: v.voice_id.startsWith('custom_voice_') ? 'cloned' : (v.provider || 'retell')
                }));
                setVoices(apiVoices as Voice[]);
            } else {
                setVoices(DEFAULT_VOICES);
            }
        } catch (_err) {
            console.error('Error loading voices:', _err);
            setVoices(DEFAULT_VOICES);
        } finally {
            setIsLoadingVoices(false);
        }
    };

    React.useEffect(() => {
        fetchVoices();
    }, []);

    React.useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const filteredVoices = useMemo(() => {
        let allVoices = voices;
        if (allVoices.length === 0 && !isLoadingVoices) allVoices = DEFAULT_VOICES;

        let results: Voice[] = [];

        CURATED_VOICES_CONFIG.forEach(config => {
            const actualId = config.voice_id_real || config.voice_id;
            const apiVoice = allVoices.find(v => v.voice_id === actualId);
            
            if (apiVoice) {
                results.push({
                    ...apiVoice,
                    voice_id: config.voice_id,
                    voice_name: config.voice_name,
                    gender: config.gender,
                    language: config.language,
                    provider: config.provider,
                    accent: config.accent || apiVoice.accent,
                    isComingSoon: config.isComingSoon
                });
            } else {
                results.push({
                    voice_id: config.voice_id,
                    voice_name: config.voice_name,
                    provider: config.provider,
                    gender: config.gender,
                    language: config.language,
                    accent: config.accent || (config.language === 'es' ? 'spain' : 'usa'),
                    isComingSoon: config.isComingSoon,
                    preview_audio_url: config.language === 'en' ? 'https://storage.googleapis.com/retell-api/openai-Fable.mp3' : undefined
                });
            }
        });

        const clonedVoices = allVoices.filter(v => v.provider === 'cloned');
        results = [...results, ...clonedVoices];

        return results.filter(v => {
            if (activeGender === 'all') return true;
            return v.gender === activeGender;
        });
    }, [voices, activeGender, isLoadingVoices]);

    const esVoices = filteredVoices.filter(v => v.language === 'es');
    const enVoices = filteredVoices.filter(v => v.language === 'en');
    const caVoices = filteredVoices.filter(v => v.language === 'ca');
    const clonedGroup = filteredVoices.filter(v => v.provider === 'cloned');

    const handleCustomVoiceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessingCustom(true);
        try {
            const trimmedName = customName.trim();
            if (!trimmedName || !cloneFiles) return;

            const formData = new FormData();
            formData.append('voice_name', trimmedName);
            for (let i = 0; i < cloneFiles.length; i++) {
                formData.append('files', cloneFiles[i]);
            }
            
            const res = await fetch('/api/retell/voices/clone', { method: 'POST', body: formData });
            if (!res.ok) throw new Error("Error en la clonación");

            const data = await res.json();
            if (data?.success) {
                toast.success("Voz clonada con éxito");
                setShowCustomModal(false);
                setCustomName('');
                setCloneFiles(null);
                fetchVoices();
            } else {
                toast.error(data?.error || "Error al clonar");
            }
        } catch (_err) {
            console.error('Error cloning voice:', _err);
            toast.error("Error al procesar la voz");
        } finally {
            setIsProcessingCustom(false);
        }
    };

    const togglePlay = (v: Voice) => {
        if (v.isComingSoon) return;
        
        if (playingId === v.voice_id) {
            audioRef.current?.pause();
            setPlayingId(null);
            return;
        }
        if (audioRef.current) audioRef.current.pause();

        const previewUrl = v.preview_audio_url || (v.voice_id.includes('12051') ? 'https://storage.googleapis.com/retell-api/openai-Fable.mp3' : undefined);
        if (!previewUrl) {
            toast.error("Sin audio disponible");
            return;
        }

        const newAudio = new Audio(previewUrl);
        newAudio.onplay = () => setPlayingId(v.voice_id);
        newAudio.onended = () => setPlayingId(null);
        newAudio.onerror = () => setPlayingId(null);
        audioRef.current = newAudio;
        newAudio.play().catch(() => setPlayingId(null));
    };

    const VoiceCard = ({ v }: { v: Voice }) => {
        const isSelected = voiceId === (v.voice_id.includes('12051') ? '12051' : v.voice_id);
        const disabled = v.isComingSoon;

        return (
            <div
                onClick={() => {
                    if (disabled) return;
                    const finalId = v.voice_id.includes('12051') ? '12051' : v.voice_id;
                    updateField('voiceId', finalId);
                    updateField('voiceName', v.voice_name);
                    updateField('voiceProvider', v.provider);
                }}
                style={{
                    border: isSelected ? '2px solid var(--azul)' : '1px solid var(--gris-borde)',
                    borderRadius: 'var(--r-md)',
                    padding: '16px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    background: isSelected ? 'var(--azul-light)' : 'var(--blanco)',
                    opacity: disabled ? 0.6 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'all 0.2s',
                    position: 'relative',
                    boxShadow: isSelected ? '0 4px 12px rgba(38, 122, 176, 0.1)' : 'none'
                }}
            >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="flex-center" style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: isSelected ? 'var(--azul)' : (disabled ? 'var(--gris-bg)' : 'var(--gris-bg)'),
                        color: isSelected ? 'var(--blanco)' : (disabled ? 'var(--gris-texto)' : 'var(--azul)'),
                        fontSize: '18px',
                        fontWeight: 700,
                        flexShrink: 0
                    }}>
                        {v.voice_name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--oscuro)' }}>
                            {v.voice_name}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <span style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--gris-texto)', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                                {v.accent === 'Americano' ? 'EN' : (v.accent === 'Multilingüe' ? 'MULTI' : 'ES')}
                            </span>
                            {v.isComingSoon && (
                                <span style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                                    SOON
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {!disabled && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); togglePlay(v); }}
                        className="flex-center"
                        style={{ 
                            border: 'none', 
                            background: 'rgba(0,0,0,0.03)', 
                            color: playingId === v.voice_id ? 'var(--azul)' : 'var(--gris-texto)', 
                            fontSize: '11px', 
                            fontWeight: 700, 
                            gap: '6px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            marginTop: '4px',
                            width: 'fit-content'
                        }}
                    >
                        <i className={`bi ${playingId === v.voice_id ? 'bi-pause-fill' : 'bi-play-fill'}`} style={{ fontSize: '14px' }}></i>
                        PREVIEW
                    </button>
                )}
                
                {isSelected && (
                    <i className="bi bi-check-circle-fill" style={{ color: 'var(--azul)', position: 'absolute', top: '8px', right: '8px', fontSize: '14px' }}></i>
                )}
            </div>
        );
    };

    return (
        <div className="content-area">
            <div className="form-card">
                <WizardStepHeader
                    title="Voz del agente"
                    subtitle="Elige la voz que usará tu agente. Haz clic en Preview para escuchar la muestra."
                />

                <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
                    
                    <div style={{ marginBottom: '32px' }}>
                        <label className="lbl" style={{ marginBottom: '12px' }}>Filtrar por género</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {[
                                { id: 'all', name: 'Todos' },
                                { id: 'male', name: 'Masculino ♂️' },
                                { id: 'female', name: 'Femenino ♀️' }
                            ].map(g => (
                                <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => setActiveGender(g.id)}
                                    className={activeGender === g.id ? 'btn-p mini' : 'btn-s mini'}
                                    style={{ borderRadius: '20px', padding: '8px 16px' }}
                                >
                                    {g.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isLoadingVoices ? (
                        <div className="flex-center" style={{ padding: '60px' }}>
                            <div className="spinner-border text-primary" style={{ borderRightColor: 'transparent' }} />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                            
                            {esVoices.length > 0 && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                        <span style={{ fontSize: '20px' }}>🇪🇸</span>
                                        <h3 className="lbl" style={{ margin: 0, fontSize: '13px', letterSpacing: '1px', opacity: 0.7 }}>ESPAÑOL</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                        {esVoices.map(v => <VoiceCard key={v.voice_id} v={v} />)}
                                    </div>
                                </div>
                            )}

                            {enVoices.length > 0 && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                        <span style={{ fontSize: '20px' }}>🇬🇧</span>
                                        <h3 className="lbl" style={{ margin: 0, fontSize: '13px', letterSpacing: '1px', opacity: 0.7 }}>INGLÉS</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                        {enVoices.map(v => <VoiceCard key={v.voice_id} v={v} />)}
                                    </div>
                                </div>
                            )}

                            {caVoices.length > 0 && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                        <i className="bi bi-flag" style={{ color: '#DA121A' }}></i>
                                        <h3 className="lbl" style={{ margin: 0, fontSize: '13px', letterSpacing: '1px', opacity: 0.7 }}>CATALÁN</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                        {caVoices.map(v => <VoiceCard key={v.voice_id} v={v} />)}
                                    </div>
                                </div>
                            )}

                            {clonedGroup.length > 0 && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                        <i className="bi bi-person-bounding-box" style={{ color: 'var(--azul)' }}></i>
                                        <h3 className="lbl" style={{ margin: 0, fontSize: '13px', letterSpacing: '1px', opacity: 0.7 }}>VOCES CLONADAS</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                        {clonedGroup.map(v => <VoiceCard key={v.voice_id} v={v} />)}
                                    </div>
                                </div>
                            )}

                            <div style={{ 
                                background: 'var(--gris-bg)', 
                                border: '1px dashed var(--gris-borde)', 
                                borderRadius: 'var(--r-md)', 
                                padding: '24px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                marginTop: '20px'
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <i className="bi bi-mic" style={{ color: 'var(--azul)' }}></i>
                                        <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--oscuro)' }}>Clonar tu voz</span>
                                        <span style={{ background: 'var(--azul)', color: 'var(--blanco)', padding: '1px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800 }}>PREMIUM</span>
                                    </div>
                                    <div className="hint" style={{ fontSize: '13px', maxWidth: '400px' }}>
                                        Crea un agente con tu propia voz o la de alguien de tu equipo para una experiencia única.
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setShowCustomModal(true)}
                                    className="btn-s"
                                    style={{ background: 'var(--blanco)' }}
                                >
                                    <i className="bi bi-plus-lg"></i> 
                                    Clonar voz
                                </button>
                            </div>
                            
                            <div className="flex-between" style={{ borderTop: '1px solid var(--gris-borde)', paddingTop: '24px' }}>
                                <button type="button" className="btn-s" onClick={prevStep}>
                                    <i className="bi bi-arrow-left"></i> Anterior
                                </button>
                                <button type="submit" className="btn-p" disabled={!voiceId}>
                                    Siguiente paso
                                    <i className="bi bi-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            {showCustomModal && (
                <div className="flex-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, backdropFilter: 'blur(8px)' }}>
                    <div className="form-card" style={{ width: '100%', maxWidth: '450px', padding: '32px', position: 'relative' }}>
                        <button 
                            onClick={() => setShowCustomModal(false)} 
                            style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', fontSize: '24px', color: 'var(--gris-texto)', cursor: 'pointer' }}
                        >
                            &times;
                        </button>
                        
                        <h2 className="form-title" style={{ fontSize: '20px', marginBottom: '24px' }}>Clona tu propia voz</h2>
                        
                        <form onSubmit={handleCustomVoiceSubmit}>
                            <div style={{ marginBottom: '20px' }}>
                                <label className="lbl">Nombre de la voz</label>
                                <input type="text" className="inp" placeholder="Ej: Mi voz personalizada" value={customName} onChange={(e) => setCustomName(e.target.value)} required />
                            </div>
                            
                            <div style={{ marginBottom: '20px' }}>
                                <label className="lbl">Archivos de audio</label>
                                <input type="file" className="inp" multiple accept="audio/*" onChange={(e) => setCloneFiles(e.target.files)} required style={{ padding: '8px' }} />
                                <div className="hint" style={{ marginTop: '4px' }}>Sube al menos 1 minuto de audio limpio.</div>
                            </div>
                            
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'flex', gap: '10px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={legalConfirmed} onChange={(e) => setLegalConfirmed(e.target.checked)} required style={{ width: '18px', height: '18px' }} />
                                    <span style={{ fontSize: '12px', color: 'var(--gris-texto)', lineHeight: '1.4' }}>
                                        Confirmo que tengo todos los derechos legales sobre estas muestras de voz para su uso en esta plataforma.
                                    </span>
                                </label>
                            </div>
                            
                            <button type="submit" className="btn-p w-full" disabled={isProcessingCustom || !legalConfirmed}>
                                {isProcessingCustom ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" style={{ marginRight: '8px' }}></span>
                                        Procesando...
                                    </>
                                ) : 'Comenzar Clonación'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
