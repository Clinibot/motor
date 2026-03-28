"use client";

import React, { useState, useMemo } from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';
import { deleteVoiceAction } from '@/app/actions/voiceActions';
import { toast } from 'react-hot-toast';

interface Voice {
    voice_id: string;
    voice_name: string;
    provider: string;
    language: string;
    gender: 'male' | 'female';
    accent: string;
    preview_audio_url?: string;
}

// Curated voices list requested by user
const CURATED_VOICES_CONFIG = [
    { voice_id: 'cartesia-Isabel', voice_name: 'Isabel', provider: 'cartesia', gender: 'female' as const, language: 'es' },
    { voice_id: '11068', voice_name: 'Cristina', provider: 'retell', gender: 'female' as const, language: 'es' },
    { voice_id: '11844', voice_name: 'Mari Carme', provider: 'retell', gender: 'female' as const, language: 'es' },
    { voice_id: '12051', voice_name: 'Cimo', provider: 'retell', gender: 'female' as const, language: 'es' },
    { voice_id: '12051-en', voice_id_real: '12051', voice_name: 'Cimo (English)', provider: 'retell', gender: 'female' as const, language: 'en' },
    { voice_id: 'cartesia-Manuel', voice_name: 'Manuel', provider: 'cartesia', gender: 'male' as const, language: 'es' },
    { voice_id: '11375', voice_name: 'Santiago', provider: 'retell', gender: 'male' as const, language: 'es' },
    { voice_id: '11753', voice_name: 'Adrian', provider: 'retell', gender: 'male' as const, language: 'es' },
];

const DEFAULT_VOICES: Voice[] = CURATED_VOICES_CONFIG.map(v => ({
    voice_id: v.voice_id_real || v.voice_id,
    voice_name: v.voice_name,
    provider: v.provider,
    language: v.language,
    gender: v.gender,
    accent: v.language === 'es' ? 'spain' : 'usa',
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
    const [filterLang, setFilterLang] = useState('es');
    const [legalConfirmed, setLegalConfirmed] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const fetchVoices = async () => {
        setIsLoadingVoices(true);
        try {
            const response = await fetch('/api/retell/voices');
            const data = await response.json();
            if (data?.success && data?.voices) {
                // We keep all voices from API but will filter them in useMemo
                const apiVoices = data.voices.map((v: any) => ({
                    ...v,
                    provider: v.voice_id.startsWith('custom_voice_') ? 'cloned' : (v.provider || 'retell')
                }));
                setVoices(apiVoices);
            } else {
                setVoices(DEFAULT_VOICES);
            }
        } catch (error) {
            console.error("Error loading voices:", error);
            setVoices(DEFAULT_VOICES);
        } finally {
            setIsLoadingVoices(false);
        }
    };

    const handleVoiceDelete = async (e: React.MouseEvent, voice: Voice) => {
        e.stopPropagation();
        if (!confirm(`¿Estás seguro de que quieres eliminar la voz "${voice.voice_name}"?`)) return;

        setDeletingId(voice.voice_id);
        try {
            const result = await deleteVoiceAction(voice.voice_id);
            if (result.success) {
                toast.success('Voz eliminada');
                setVoices(prev => prev.filter(v => v.voice_id !== voice.voice_id));
                if (voiceId === voice.voice_id) updateField('voiceId', '');
            } else {
                toast.error(result.error || 'Error');
            }
        } catch (error) {
            toast.error('Error inesperado');
        } finally {
            setDeletingId(null);
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

        // Add curated voices
        CURATED_VOICES_CONFIG.forEach(config => {
            const actualId = config.voice_id_real || config.voice_id;
            const apiVoice = allVoices.find(v => v.voice_id === actualId);
            
            if (apiVoice) {
                results.push({
                    ...apiVoice,
                    voice_id: config.voice_id, // Key for selection
                    voice_name: config.voice_name,
                    gender: config.gender,
                    language: config.language,
                });
            } else {
                results.push({
                    voice_id: config.voice_id,
                    voice_name: config.voice_name,
                    provider: config.provider,
                    gender: config.gender,
                    language: config.language,
                    accent: config.language === 'es' ? 'spain' : 'usa',
                    preview_audio_url: config.language === 'en' ? 'https://storage.googleapis.com/retell-api/openai-Fable.mp3' : undefined
                });
            }
        });

        // Add cloned voices
        const clonedVoices = allVoices.filter(v => v.provider === 'cloned');
        results = [...results, ...clonedVoices];

        return results.filter(v => {
            const matchesGender = activeGender === 'all' || v.gender === activeGender;
            const matchesLang = filterLang === 'all' || v.language === filterLang;
            return matchesGender && matchesLang;
        });
    }, [voices, activeGender, filterLang, isLoadingVoices]);

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
        } catch (error) {
            toast.error("Error al procesar la voz");
        } finally {
            setIsProcessingCustom(false);
        }
    };

    const togglePlay = (v: Voice) => {
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

    return (
        <div className="content-area">
            <div className="form-card">
                <WizardStepHeader
                    title="Voz del agente"
                    subtitle="Selecciona la voz que mejor represente a tu agente."
                />

                <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
                    <div className="gender-tabs" style={{
                        display: 'flex',
                        gap: '24px',
                        borderBottom: '1px solid #edf2f7',
                        marginBottom: '32px',
                        paddingBottom: '2px'
                    }}>
                        {[
                            { id: 'all', name: 'Todos', icon: 'bi-people' },
                            { id: 'female', name: 'Femenino', icon: 'bi-gender-female' },
                            { id: 'male', name: 'Masculino', icon: 'bi-gender-male' }
                        ].map(g => (
                            <button
                                key={g.id}
                                type="button"
                                onClick={() => setActiveGender(g.id)}
                                style={{
                                    padding: '12px 4px',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    color: activeGender === g.id ? '#267ab0' : '#718096',
                                    borderBottom: `3px solid ${activeGender === g.id ? '#267ab0' : 'transparent'}`,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <i className={`bi ${g.icon}`}></i>
                                {g.name}
                            </button>
                        ))}

                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                            <select 
                                className="form-select" 
                                value={filterLang} 
                                onChange={(e) => setFilterLang(e.target.value)}
                                style={{ border: 'none', fontSize: '14px', fontWeight: 600, color: '#475569', background: 'transparent' }}
                            >
                                <option value="es">Español</option>
                                <option value="en">Inglés</option>
                                <option value="all">Idiomas</option>
                            </select>
                        </div>
                    </div>

                    {isLoadingVoices ? (
                        <div style={{ textAlign: 'center', padding: '60px' }}>
                            <div className="spinner-border text-primary" role="status"></div>
                        </div>
                    ) : (
                        <div className="voices-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '20px'
                        }}>
                            {filteredVoices.map((v: Voice) => (
                                <div
                                    key={v.voice_id}
                                    className={`voice-card ${voiceId === (v.voice_id.includes('12051') ? '12051' : v.voice_id) ? 'selected' : ''}`}
                                    style={{
                                        border: voiceId === (v.voice_id.includes('12051') ? '12051' : v.voice_id) ? '2px solid #267ab0' : '1px solid #edf2f7',
                                        borderRadius: '16px',
                                        padding: '24px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        background: voiceId === (v.voice_id.includes('12051') ? '12051' : v.voice_id) ? '#f0f7ff' : '#fff',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center'
                                    }}
                                    onClick={() => {
                                        const finalId = v.voice_id.includes('12051') ? '12051' : v.voice_id;
                                        updateField('voiceId', finalId);
                                        updateField('voiceName', v.voice_name);
                                        updateField('voiceProvider', v.provider);
                                    }}
                                >
                                    <div className="voice-avatar" style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        background: '#f1f5f9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '30px',
                                        marginBottom: '16px',
                                        position: 'relative'
                                    }}>
                                        {v.gender === 'female' ? '👱‍♀️' : '👨'}
                                        {v.provider === 'cloned' && (
                                            <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#ea580c', color: 'white', fontSize: '9px', padding: '2px 5px', borderRadius: '10px', fontWeight: 700 }}>CLON</div>
                                        )}
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#1a2428', marginBottom: '12px' }}>{v.voice_name}</div>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); togglePlay(v); }}
                                        style={{ width: '100%', padding: '8px', borderRadius: '10px', border: '1px solid #e5e7eb', background: playingId === v.voice_id ? '#267ab0' : '#fff', color: playingId === v.voice_id ? '#fff' : '#1a2428', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <i className={`bi ${playingId === v.voice_id ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
                                        {playingId === v.voice_id ? 'Pausar' : 'Escuchar'}
                                    </button>
                                </div>
                            ))}

                            <div
                                className="voice-card clone-card"
                                style={{ border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}
                                onClick={() => setShowCustomModal(true)}
                            >
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#64748b', marginBottom: '12px' }}>
                                    <i className="bi bi-plus-lg"></i>
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '14px', color: '#475569' }}>Clona tu voz</div>
                            </div>
                        </div>
                    )}

                    <div className="wizard-actions mt-5 pt-4" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button type="button" className="btn" onClick={prevStep} style={{ border: '1px solid #e5e7eb', padding: '10px 24px', borderRadius: '8px', background: '#fff', color: '#64748b', fontWeight: 600 }}> Anterior </button>
                        <button type="submit" className="btn" disabled={!voiceId} style={{ background: voiceId ? '#267ab0' : '#e2e8f0', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontWeight: 600 }}> Siguiente </button>
                    </div>
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
