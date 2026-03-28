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

    // Grouping for languages
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

    const renderProviderTag = (provider: string, isComingSoon?: boolean) => {
        if (isComingSoon) {
            return (
                <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                    Próximamente
                </span>
            );
        }
        const lower = provider.toLowerCase();
        if (lower.includes('cartesia')) {
            return <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>Cartesia</span>;
        } else if (lower.includes('elevenlabs')) {
            return <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>ElevenLabs</span>;
        } else if (lower.includes('openai')) {
            return <span style={{ background: '#ffedd5', color: '#c2410c', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>OpenAI</span>;
        } else if (lower.includes('cloned')) {
            return <span style={{ background: '#fce7f3', color: '#be185d', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>Clon</span>;
        }
        return null;
    };

    const VoiceCard = ({ v }: { v: Voice }) => {
        const isSelected = voiceId === (v.voice_id.includes('12051') ? '12051' : v.voice_id);
        const disabled = v.isComingSoon;

        return (
            <div
                className={`voice-card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled-card' : ''}`}
                style={{
                    border: isSelected ? '2px solid #267ab0' : (disabled ? '1px dashed #cbd5e1' : '1px solid #e2e8f0'),
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    background: isSelected ? '#f0f7ff' : '#fff',
                    opacity: disabled ? 0.7 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}
                onClick={() => {
                    if (disabled) return;
                    const finalId = v.voice_id.includes('12051') ? '12051' : v.voice_id;
                    updateField('voiceId', finalId);
                    updateField('voiceName', v.voice_name);
                    updateField('voiceProvider', v.provider);
                }}
            >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div className="voice-avatar" style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: disabled ? '#f8fafc' : '#f0f9ff',
                        color: disabled ? '#94a3b8' : '#0ea5e9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: 700,
                        flexShrink: 0
                    }}>
                        {disabled ? <i className="bi bi-mic"></i> : v.voice_name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: disabled ? '#475569' : '#0f172a' }}>
                            {v.voice_name}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                                {v.accent === 'Americano' ? 'Americano' : (v.accent === 'Multilingüe' ? 'Multilingüe' : 'Español')}
                            </span>
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                                {v.gender === 'female' ? 'Femenino' : 'Masculino'}
                            </span>
                            {renderProviderTag(v.provider, v.isComingSoon)}
                        </div>
                    </div>
                </div>

                {!disabled && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); togglePlay(v); }}
                        style={{ 
                            border: 'none', 
                            background: 'transparent', 
                            color: playingId === v.voice_id ? '#267ab0' : '#64748b', 
                            fontSize: '13px', 
                            fontWeight: 600, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            padding: 0,
                            marginTop: '8px'
                        }}
                    >
                        <i className={`bi ${playingId === v.voice_id ? 'bi-pause-circle' : 'bi-play-circle'}`} style={{ fontSize: '16px' }}></i>
                        Preview
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="content-area w-full max-w-[1100px] ml-0">
            <div className="form-card bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-8">
                <WizardStepHeader
                    title="Voz del agente"
                    subtitle="Elige la voz que usará tu agente. Haz clic en Preview para escuchar la muestra."
                />

                <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
                    
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '14px', fontWeight: 700, color: '#1a2428', marginBottom: '12px', display: 'block' }}>Filtrar por género</label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {[
                                { id: 'all', name: 'Todos' },
                                { id: 'male', name: 'Masculino ♂️' },
                                { id: 'female', name: 'Femenino ♀️' }
                            ].map(g => (
                                <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => setActiveGender(g.id)}
                                    style={{
                                        padding: '6px 16px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        borderRadius: '20px',
                                        color: activeGender === g.id ? '#fff' : '#64748b',
                                        border: `1px solid ${activeGender === g.id ? '#267ab0' : '#e2e8f0'}`,
                                        background: activeGender === g.id ? '#267ab0' : '#fff',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {g.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isLoadingVoices ? (
                        <div style={{ textAlign: 'center', padding: '60px' }}>
                            <div className="spinner-border text-primary" role="status"></div>
                        </div>
                    ) : (
                        <div className="voices-sections" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            
                            {/* ESPAÑOL SECTION */}
                            {esVoices.length > 0 && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <span style={{ fontSize: '18px' }}>🇪🇸</span>
                                        <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#64748b', margin: 0, letterSpacing: '0.5px' }}>ESPAÑOL</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                        {esVoices.map(v => <VoiceCard key={v.voice_id} v={v} />)}
                                    </div>
                                </div>
                            )}

                            {/* INGLÉS SECTION */}
                            {enVoices.length > 0 && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <span style={{ fontSize: '18px' }}>🇬🇧</span>
                                        <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#64748b', margin: 0, letterSpacing: '0.5px' }}>INGLÉS</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                        {enVoices.map(v => <VoiceCard key={v.voice_id} v={v} />)}
                                    </div>
                                </div>
                            )}

                            {/* CATALÁN SECTION */}
                            {caVoices.length > 0 && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <svg width="20" height="15" viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '2px' }}>
                                            <rect fill="#FFC400" width="900" height="600"/>
                                            <rect fill="#DA121A" width="900" height="66.66" y="66.66"/>
                                            <rect fill="#DA121A" width="900" height="66.66" y="200"/>
                                            <rect fill="#DA121A" width="900" height="66.66" y="333.33"/>
                                            <rect fill="#DA121A" width="900" height="66.66" y="466.66"/>
                                        </svg>
                                        <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#64748b', margin: 0, letterSpacing: '0.5px' }}>CATALÁN</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                        {caVoices.map(v => <VoiceCard key={v.voice_id} v={v} />)}
                                    </div>
                                </div>
                            )}

                            {/* CLONED SECTION */}
                            {clonedGroup.length > 0 && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <i className="bi bi-person-bounding-box" style={{ fontSize: '16px', color: '#8b5cf6' }}></i>
                                        <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#64748b', margin: 0, letterSpacing: '0.5px' }}>VOCES CLONADAS</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                        {clonedGroup.map(v => <VoiceCard key={v.voice_id} v={v} />)}
                                    </div>
                                </div>
                            )}

                            {/* PREMUIM CLONE VOZ CARD AT THE BOTTOM */}
                            <div style={{ marginTop: '24px' }}>
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <i className="bi bi-mic" style={{ color: '#267ab0', fontSize: '16px' }}></i>
                                            <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>Clonar tu voz</span>
                                            <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>Premium</span>
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                                            Crea un agente con tu propia voz o la de alguien de tu equipo.
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowCustomModal(true)}
                                        style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <i className="bi bi-plus-lg"></i> Clonar voz
                                    </button>
                                </div>
                            </div>
                            
                            <div className="wizard-actions mt-2" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #edf2f7', paddingTop: '24px' }}>
                                <button type="button" className="btn" onClick={prevStep} style={{ border: '1px solid #e5e7eb', padding: '10px 24px', borderRadius: '8px', background: '#fff', color: '#64748b', fontWeight: 600 }}> <i className="bi bi-arrow-left"></i> Anterior </button>
                                <button type="submit" className="btn" disabled={!voiceId} style={{ background: voiceId ? '#267ab0' : '#e2e8f0', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontWeight: 600 }}> Siguiente <i className="bi bi-arrow-right"></i> </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            {showCustomModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(4px)' }}>
                    <div className="modal-content" style={{ background: 'white', width: '100%', maxWidth: '450px', borderRadius: '16px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Clona tu propia voz</h2>
                            <button onClick={() => setShowCustomModal(false)} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <form onSubmit={handleCustomVoiceSubmit}>
                            <div className="form-group mb-3">
                                <label className="form-label">Nombre de la voz</label>
                                <input type="text" className="form-control" value={customName} onChange={(e) => setCustomName(e.target.value)} required />
                            </div>
                            <div className="form-group mb-4">
                                <label className="form-label">Archivos de audio</label>
                                <input type="file" className="form-control" multiple accept="audio/*" onChange={(e) => setCloneFiles(e.target.files)} required />
                            </div>
                            <div className="mb-4">
                                <label style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#64748b' }}>
                                    <input type="checkbox" checked={legalConfirmed} onChange={(e) => setLegalConfirmed(e.target.checked)} required />
                                    <span>Confirmo que tengo derechos sobre estas muestras de voz.</span>
                                </label>
                            </div>
                            <button type="submit" className="btn btn-primary w-100" disabled={isProcessingCustom || !legalConfirmed}>
                                {isProcessingCustom ? 'Procesando...' : 'Comenzar Clonación'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
