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
                className={`voice-card-v2 ${isSelected ? 'active' : ''}`}
                style={{ 
                    opacity: disabled ? 0.6 : 1, 
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    background: isSelected ? 'var(--azul-light)' : 'white',
                    border: isSelected ? '2px solid var(--azul)' : '1px solid var(--slate-100)',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: isSelected ? '0 10px 25px -5px rgba(37, 99, 235, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ 
                        width: '52px', 
                        height: '52px', 
                        borderRadius: '16px', 
                        background: isSelected ? 'var(--azul)' : 'var(--slate-50)', 
                        color: isSelected ? 'white' : 'var(--slate-400)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        fontWeight: 900,
                        boxShadow: isSelected ? '0 8px 16px -4px rgba(37, 99, 235, 0.3)' : 'none'
                    }}>
                        {v.voice_name.charAt(0).toUpperCase()}
                    </div>
                    {isSelected && (
                        <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            background: 'var(--azul)', 
                            color: 'white', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '14px'
                        }}>
                            <i className="bi bi-check-lg"></i>
                        </div>
                    )}
                </div>

                <div>
                    <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--slate-900)', marginBottom: '4px' }}>
                        {v.voice_name}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ background: 'var(--slate-100)', color: 'var(--slate-500)', padding: '3px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                            {v.language.toUpperCase()}
                        </span>
                        <span style={{ background: v.gender === 'male' ? '#eff6ff' : '#fdf2f8', color: v.gender === 'male' ? '#3b82f6' : '#ec4899', padding: '3px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                            {v.gender === 'male' ? 'HOMBRE' : 'MUJER'}
                        </span>
                        <span style={{ background: '#f5f3ff', color: '#8b5cf6', padding: '3px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                            {v.provider.toUpperCase()}
                        </span>
                    </div>
                </div>

                {!disabled ? (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); togglePlay(v); }}
                        style={{ 
                            marginTop: 'auto',
                            background: playingId === v.voice_id ? 'var(--azul)' : 'var(--slate-50)',
                            color: playingId === v.voice_id ? 'white' : 'var(--slate-600)',
                            border: 'none',
                            padding: '10px 16px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <i className={`bi ${playingId === v.voice_id ? 'bi-pause-fill' : 'bi-play-fill'}`} style={{ fontSize: '16px' }}></i>
                        {playingId === v.voice_id ? 'PAUSAR' : 'ESCUCHAR'}
                    </button>
                ) : (
                    <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#ea580c', background: '#fff7ed', padding: '8px', borderRadius: '10px' }}>
                        PRÓXIMAMENTE
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="content-area" style={{ padding: '40px' }}>
            <WizardStepHeader
                title="Voz y Personalidad Sonora"
                subtitle="Elige la voz que mejor represente la marca de tu empresa. Todas nuestras voces son de latencia ultra-baja."
                showArrows={false}
            />

            <div className="wizard-info-box" style={{ marginTop: '32px' }}>
                <i className="bi bi-info-circle-fill"></i>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                    <p><strong>Configuración Pro:</strong> Para una experiencia óptima, recomendamos las voces de <strong>Eleven Labs</strong> por su expresividad o <strong>Cartesia</strong> por su velocidad de respuesta.</p>
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
                
                <div style={{ marginBottom: '48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {[
                            { id: 'all', name: 'Todas' },
                            { id: 'male', name: 'Voces de Hombre' },
                            { id: 'female', name: 'Voces de Mujer' }
                        ].map(g => (
                            <button
                                key={g.id}
                                type="button"
                                onClick={() => setActiveGender(g.id)}
                                className={activeGender === g.id ? 'btn-p' : 'btn-s'}
                                style={{ 
                                    borderRadius: '14px', 
                                    padding: '12px 24px', 
                                    fontSize: '14px', 
                                    fontWeight: 700,
                                    border: activeGender === g.id ? 'none' : '1.5px solid var(--slate-200)'
                                }}
                            >
                                {g.name}
                            </button>
                        ))}
                    </div>

                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {filteredVoices.length} voces disponibles
                    </div>
                </div>

                {isLoadingVoices ? (
                    <div className="flex-center" style={{ padding: '120px', justifyContent: 'center' }}>
                        <div className="spinner-border text-primary" style={{ width: '40px', height: '40px', borderRightColor: 'transparent' }} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '56px' }}>
                        
                        {esVoices.length > 0 && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                                    <div style={{ fontSize: '28px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>🇪🇸</div>
                                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 900, color: 'var(--slate-400)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Voces en Español</h3>
                                    <div style={{ flex: 1, height: '1px', background: 'var(--slate-100)' }}></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                                    {esVoices.map(v => <VoiceCard key={v.voice_id} v={v} />)}
                                </div>
                            </div>
                        )}

                        {enVoices.length > 0 && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                                    <div style={{ fontSize: '28px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>🇬🇧</div>
                                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 900, color: 'var(--slate-400)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Voces en Inglés</h3>
                                    <div style={{ flex: 1, height: '1px', background: 'var(--slate-100)' }}></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                                    {enVoices.map(v => <VoiceCard key={v.voice_id} v={v} />)}
                                </div>
                            </div>
                        )}

                        {clonedGroup.length > 0 && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--azul-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className="bi bi-person-bounding-box" style={{ fontSize: '20px', color: 'var(--azul)' }}></i>
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 900, color: 'var(--slate-400)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Voces Clonadas</h3>
                                    <div style={{ flex: 1, height: '1px', background: 'var(--slate-100)' }}></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                                    {clonedGroup.map(v => <VoiceCard key={v.voice_id} v={v} />)}
                                </div>
                            </div>
                        )}

                        <div style={{ 
                            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                            border: '2px dashed var(--slate-200)', 
                            borderRadius: '32px', 
                            padding: '48px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            marginTop: '20px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(0,0,0,0.05)' }}>
                                        <i className="bi bi-mic-fill" style={{ color: 'var(--azul)', fontSize: '20px' }}></i>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontWeight: 900, fontSize: '20px', color: 'var(--slate-900)', letterSpacing: '-0.02em' }}>¿Quieres usar tu propia voz?</span>
                                            <span style={{ background: 'var(--azul)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 900, boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)' }}>PREMIUM</span>
                                        </div>
                                        <p style={{ fontSize: '15px', color: 'var(--slate-500)', margin: '4px 0 0 0', maxWidth: '550px', lineHeight: '1.5' }}>
                                            Activa la clonación de voz de IA para que tus agentes tengan una identidad sonora única y corporativa.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setShowCustomModal(true)}
                                className="btn-p"
                                style={{ 
                                    background: 'white', 
                                    color: 'var(--azul)', 
                                    border: '1.5px solid var(--slate-200)',
                                    padding: '14px 32px',
                                    borderRadius: '16px',
                                    fontSize: '15px',
                                    fontWeight: 800,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                    zIndex: 1
                                }}
                            >
                                <i className="bi bi-plus-lg"></i> 
                                Iniciar Clonación
                            </button>
                        </div>
                        
                        <div className="flex-between" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '40px', marginTop: '20px' }}>
                            <button type="button" className="btn-s" onClick={prevStep} style={{ padding: '14px 32px', borderRadius: '16px', fontWeight: 700 }}>
                                <i className="bi bi-arrow-left"></i> Paso Anterior
                            </button>
                            <button type="submit" className="btn-p" disabled={!voiceId} style={{ padding: '14px 48px', borderRadius: '16px', fontWeight: 800, boxShadow: '0 10px 20px -10px rgba(37, 99, 235, 0.3)' }}>
                                Siguiente paso
                                <i className="bi bi-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                )}
            </form>

            {showCustomModal && (
                <div className="flex-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 3000, backdropFilter: 'blur(12px)', justifyContent: 'center' }}>
                    <div className="card-premium animate-in zoom-in-95 duration-300" style={{ width: '100%', maxWidth: '500px', padding: '48px', position: 'relative', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.25)' }}>
                        <button 
                            onClick={() => setShowCustomModal(false)} 
                            style={{ position: 'absolute', top: '24px', right: '24px', width: '40px', height: '40px', borderRadius: '12px', border: 'none', background: 'var(--slate-50)', fontSize: '20px', color: 'var(--slate-400)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.color = 'var(--error)'}
                            onMouseOut={(e) => e.currentTarget.style.color = 'var(--slate-400)'}
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                        
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{ width: '64px', height: '64px', background: 'var(--azul-light)', color: 'var(--azul)', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '20px' }}>
                                <i className="bi bi-mic-fill"></i>
                            </div>
                            <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--slate-900)', letterSpacing: '-0.02em', margin: 0 }}>Clona tu propia voz</h2>
                            <p style={{ color: 'var(--slate-500)', marginTop: '8px', fontSize: '15px' }}>Preserva tu identidad en cada interacción.</p>
                        </div>
                        
                        <form onSubmit={handleCustomVoiceSubmit}>
                            <div style={{ marginBottom: '24px' }}>
                                <label className="lbl" style={{ marginBottom: '10px', display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase' }}>Nombre de la voz</label>
                                <input type="text" className="inp" placeholder="Ej: Mi voz corporativa" value={customName} onChange={(e) => setCustomName(e.target.value)} required style={{ padding: '14px 20px', borderRadius: '14px' }} />
                            </div>
                            
                            <div style={{ marginBottom: '24px' }}>
                                <label className="lbl" style={{ marginBottom: '10px', display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase' }}>Archivos de audio (Muestras)</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="file" className="inp" multiple accept="audio/*" onChange={(e) => setCloneFiles(e.target.files)} required style={{ padding: '12px 20px', borderRadius: '14px', height: 'auto' }} />
                                </div>
                                <div className="hint" style={{ marginTop: '10px', fontSize: '12px', color: 'var(--slate-400)' }}>
                                    <i className="bi bi-info-circle" style={{ marginRight: '6px' }}></i>
                                    Sube al menos 1-2 minutos de audio limpio sin ruido.
                                </div>
                            </div>
                            
                            <div style={{ marginBottom: '32px', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid var(--slate-100)' }}>
                                <label style={{ display: 'flex', gap: '12px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={legalConfirmed} onChange={(e) => setLegalConfirmed(e.target.checked)} required style={{ width: '20px', height: '20px', accentColor: 'var(--azul)', marginTop: '2px' }} />
                                    <span style={{ fontSize: '12px', color: 'var(--slate-600)', lineHeight: '1.5', fontWeight: 500 }}>
                                        Confirmo que poseo los derechos legales sobre estas muestras para el entrenamiento de IA según los términos de servicio.
                                    </span>
                                </label>
                            </div>
                            
                            <button type="submit" className="btn-p w-full" disabled={isProcessingCustom || !legalConfirmed} style={{ padding: '16px', borderRadius: '16px', fontSize: '16px', fontWeight: 800, justifyContent: 'center' }}>
                                {isProcessingCustom ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" style={{ marginRight: '12px' }}></span>
                                        Procesando Clonación...
                                    </>
                                ) : 'Comenzar Proceso Premium'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
