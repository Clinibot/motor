"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

interface RetellVoice {
    voice_id: string;
    voice_name: string;
    voice_type?: string;
    gender?: string;
    language?: string;
    preview_audio_url?: string;
}

export const Step3_Voice: React.FC = () => {
    const { voiceId, updateField, prevStep, nextStep } = useWizardStore();
    const [activeGender, setActiveGender] = useState('all');
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    // Clone modal state
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [cloneName, setCloneName] = useState('');
    const [cloneFiles, setCloneFiles] = useState<File[]>([]);
    const [legalAccepted, setLegalAccepted] = useState(false);
    const [isCloning, setIsCloning] = useState(false);

    // Custom cloned voices from Retell
    const [clonedVoices, setClonedVoices] = useState<RetellVoice[]>([]);
    // Real voice IDs + preview URLs from Retell, keyed by lowercase name
    const [retellVoiceMap, setRetellVoiceMap] = useState<Record<string, RetellVoice>>({});

    useEffect(() => {
        const fetchVoices = async () => {
            try {
                const res = await fetch('/api/retell/voices');
                if (!res.ok) return;
                const data = await res.json();
                if (data.success && Array.isArray(data.voices)) {
                    const all = data.voices as RetellVoice[];
                    // Cloned voices (workspace-specific)
                    setClonedVoices(all.filter(v => v.voice_type === 'clone'));
                    // Map voices by lowercase name AND by voice_id for preview URL lookup
                    const map: Record<string, RetellVoice> = {};
                    all.filter(v => v.voice_type !== 'clone').forEach(v => {
                        map[v.voice_name.toLowerCase()] = v;
                        map[v.voice_id.toLowerCase()] = v;
                    });
                    setRetellVoiceMap(map);
                }
            } catch {
                // silent
            }
        };
        fetchVoices();
    }, []);

    const filteredVoices = useMemo(() => {
        return CURATED_VOICES_V2.filter(v => activeGender === 'all' || v.gender === activeGender);
    }, [activeGender]);

    const togglePlay = (v: Voice | RetellVoice) => {
        const id = v.voice_id;
        if (playingId === id) {
            audioRef.current?.pause();
            setPlayingId(null);
            return;
        }
        if (audioRef.current) audioRef.current.pause();
        // Look up by voice_id first (most reliable), then by name
        const realVoice = retellVoiceMap[v.voice_id.toLowerCase()] || retellVoiceMap[v.voice_name.toLowerCase()];
        const previewUrl = realVoice?.preview_audio_url || v.preview_audio_url;
        if (!previewUrl) { toast.error('Audio no disponible aún'); return; }

        const newAudio = new Audio(previewUrl);
        newAudio.onplay = () => setPlayingId(id);
        newAudio.onended = () => setPlayingId(null);
        newAudio.onerror = () => setPlayingId(null);
        audioRef.current = newAudio;
        newAudio.play().catch(() => { toast.error('Error al reproducir audio'); setPlayingId(null); });
    };

    const selectVoice = (v: Voice) => {
        if (v.isComingSoon) return;
        // Use real Retell voice ID if available (lookup by id then by name), otherwise fall back
        const realVoice = retellVoiceMap[v.voice_id.toLowerCase()] || retellVoiceMap[v.voice_name.toLowerCase()];
        updateField('voiceId', realVoice?.voice_id ?? v.voice_id);
        updateField('voiceName', v.voice_name);
        updateField('voiceProvider', v.provider);
        // Auto-set language based on voice language
        if (v.language === 'ca') updateField('language', 'ca-ES');
        else if (v.language === 'en') updateField('language', 'en-US');
        else if (v.language === 'es') updateField('language', 'es-ES');
    };

    const selectClonedVoice = (v: RetellVoice) => {
        updateField('voiceId', v.voice_id);
        updateField('voiceName', v.voice_name);
        updateField('voiceProvider', 'custom');
    };

    const handleCloneSubmit = async () => {
        if (!cloneName.trim() || cloneFiles.length === 0 || !legalAccepted) return;
        setIsCloning(true);
        try {
            const formData = new FormData();
            formData.append('voice_name', cloneName.trim());
            cloneFiles.forEach(f => formData.append('files', f));

            const res = await fetch('/api/retell/voices/clone', { method: 'POST', body: formData });
            const data = await res.json();

            if (!res.ok || !data.success) {
                toast.error(data.error || 'Error al clonar la voz');
                return;
            }

            const newVoice: RetellVoice = data.voice;
            setClonedVoices(prev => [...prev, newVoice]);

            // Auto-select the cloned voice
            updateField('voiceId', newVoice.voice_id);
            updateField('voiceName', newVoice.voice_name);
            updateField('voiceProvider', 'custom');

            toast.success(`Voz "${newVoice.voice_name}" clonada y seleccionada`);
            setShowCloneModal(false);
            setCloneName('');
            setCloneFiles([]);
            setLegalAccepted(false);
        } catch {
            toast.error('Error de conexión al clonar la voz');
        } finally {
            setIsCloning(false);
        }
    };

    const languages = ['es', 'en', 'ca'];

    return (
        <>
        <div className="form-card">
            <div className="form-title">Voz del agente</div>
            <div className="form-sub">Elige la voz que usará tu agente. Haz clic en Preview para escuchar la muestra.</div>

            <div className="ci" style={{ marginBottom: '20px' }}>
                <i className="bi bi-info-circle-fill" style={{ flexShrink: 0, marginTop: '1px' }}></i>
                <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                    Recuerda adaptar el saludo inicial al idioma seleccionado para tu agente.
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
                                const realId = retellVoiceMap[v.voice_name.toLowerCase()]?.voice_id ?? v.voice_id;
                                const isSelected = voiceId === realId || voiceId === v.voice_id;
                                const isComingSoon = v.isComingSoon;
                                const providerColor: Record<string, { bg: string; color: string; border: string }> = {
                                    cartesia: { bg: 'var(--azul-light)', color: 'var(--azul)', border: '#bee3f8' },
                                    elevenlabs: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
                                    openai: { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
                                    premium: { bg: 'var(--azul-light)', color: 'var(--azul)', border: '#bee3f8' },
                                    standard: { bg: 'var(--gris-bg)', color: 'var(--gris-texto)', border: 'var(--gris-borde)' },
                                    soon: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
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
                                                fontSize: '18px', fontWeight: 800,
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

            {/* Cloned voices */}
            {clonedVoices.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gris-texto)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="bi bi-mic-fill" style={{ color: 'var(--azul)' }}></i> VOCES CLONADAS
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {clonedVoices.map(v => {
                            const isSelected = voiceId === v.voice_id;
                            return (
                                <div
                                    key={v.voice_id}
                                    className={`vcard-v${isSelected ? ' on' : ''}`}
                                    onClick={() => selectClonedVoice(v)}
                                >
                                    <div className="vrow">
                                        <div style={{ width: '52px', height: '52px', minWidth: '52px', borderRadius: '50%', background: '#f5f3ff', color: '#7c3aed', fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {v.voice_name.charAt(0)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div className="vname" style={{ fontSize: '15px' }}>{v.voice_name}</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' }}>
                                                <span style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, color: '#7c3aed' }}>Clonada</span>
                                                {v.gender && <span style={{ background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 500 }}>{v.gender === 'male' ? 'Masculino' : 'Femenino'}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {v.preview_audio_url && (
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
            )}

            <hr className="divider" />

            {/* Clone voice banner */}
            <div style={{ background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <i className="bi bi-mic" style={{ fontSize: '18px', color: 'var(--azul)' }}></i>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--oscuro)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Clonar tu voz
                            <span style={{ fontSize: '11px', fontWeight: 600, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '2px 8px', borderRadius: '20px' }}>Premium</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--gris-texto)', marginTop: '2px' }}>Crea un agente con tu propia voz o la de alguien de tu equipo.</div>
                    </div>
                </div>
                <button type="button" className="btn-s" onClick={() => setShowCloneModal(true)} style={{ whiteSpace: 'nowrap' }}>
                    <i className="bi bi-plus"></i> Clonar voz
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

        {/* ═══ MODAL CLONAR VOZ ═══ */}
        {showCloneModal && createPortal(
            <div
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={(e) => { if (e.target === e.currentTarget) setShowCloneModal(false); }}
            >
                <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '580px', maxWidth: '92vw', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                    <button
                        onClick={() => setShowCloneModal(false)}
                        style={{ position: 'absolute', top: '16px', right: '20px', border: 'none', background: 'none', fontSize: '24px', color: 'var(--gris-texto)', cursor: 'pointer', lineHeight: 1 }}
                    >×</button>

                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Clona tu propia voz</h2>

                    <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderLeft: '4px solid #f97316', borderRadius: 'var(--r-md)', padding: '14px 16px', display: 'flex', gap: '10px', marginBottom: '24px', fontSize: '13px', color: '#7c2d12', lineHeight: '1.6' }}>
                        <i className="bi bi-exclamation-triangle-fill" style={{ color: '#f97316', flexShrink: 0, marginTop: '1px' }}></i>
                        <div><strong>Importante:</strong> La fidelidad de la voz clonada depende directamente de la calidad de tus audios. Asegúrate de que no haya ruido de fondo y que la voz sea clara para obtener el mejor resultado.</div>
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--azul)', marginBottom: '16px' }}>Clonar voz mediante archivos de audio</div>

                    <div className="fg">
                        <label className="lbl">Nombre de la voz</label>
                        <input className="inp" placeholder="Ej: Voz Corporativa Juan"
                            value={cloneName} onChange={e => setCloneName(e.target.value)} />
                    </div>

                    <div className="fg">
                        <label className="lbl">Archivos de audio (WAV/MP3)</label>
                        <div style={{ border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                            <label style={{ border: '1px solid var(--gris-borde)', background: 'var(--gris-bg)', borderRadius: '4px', padding: '5px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                                Elegir archivos
                                <input type="file" accept=".mp3,.wav,.m4a,.flac,.mp4,.webm" multiple style={{ display: 'none' }}
                                    onChange={e => setCloneFiles(e.target.files ? Array.from(e.target.files) : [])} />
                            </label>
                            <span style={{ color: 'var(--gris-texto)' }}>
                                {cloneFiles.length === 0 ? 'Ningún archivo seleccionado' : `${cloneFiles.length} archivo${cloneFiles.length > 1 ? 's' : ''} seleccionado${cloneFiles.length > 1 ? 's' : ''}`}
                            </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--gris-texto)', marginTop: '5px', fontStyle: 'italic' }}>* Tamaño máximo total recomendado: 20MB (.mp3, .wav, .m4a, .flac)</div>
                        <div style={{ fontSize: '12px', color: 'var(--gris-texto)', marginTop: '3px' }}>Sube entre 1 y 25 archivos para una mejor calidad.</div>
                    </div>

                    <div style={{ background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', padding: '16px', margin: '16px 0' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--oscuro)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="bi bi-shield-lock" style={{ color: 'var(--azul)' }}></i> Información legal sobre clonación de voz
                        </div>
                        <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.75', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <p style={{ margin: 0 }}>La clonación de voz con IA es legal cuando se usa de manera apropiada. <strong>Puedes clonar tu propia voz libremente</strong> para cualquier propósito. Sin embargo, clonar la voz de otra persona requiere su <strong>consentimiento explícito</strong>.</p>
                            <p style={{ margin: 0 }}>Es ilegal usar voces clonadas para fraude, suplantación de identidad o para crear contenido engañoso en la mayoría de las jurisdicciones.</p>
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r-md)', padding: '10px 12px', fontSize: '12px', color: '#7f1d1d' }}>
                                <strong>⚠️ Restricciones:</strong> Solo puedes clonar tu propia voz. No está permitido clonar la voz de otra persona sin su consentimiento. Tampoco se permite la clonación de voces de menores de 18 años.
                            </div>
                        </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px', padding: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={legalAccepted} onChange={e => setLegalAccepted(e.target.checked)}
                            style={{ marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0, accentColor: 'var(--azul)' }} />
                        <span style={{ fontSize: '13px', color: 'var(--oscuro)', lineHeight: '1.6', cursor: 'pointer' }}>
                            Confirmo que tengo todos los derechos y consentimientos necesarios para subir y clonar estas muestras de voz, y que no utilizaré el contenido generado por la plataforma para ningún propósito ilegal, fraudulento o dañino.
                        </span>
                    </label>

                    <button
                        className="btn-p"
                        onClick={handleCloneSubmit}
                        disabled={!cloneName.trim() || cloneFiles.length === 0 || !legalAccepted || isCloning}
                        style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '14px',
                            opacity: (!cloneName.trim() || cloneFiles.length === 0 || !legalAccepted || isCloning) ? 0.5 : 1,
                            cursor: (!cloneName.trim() || cloneFiles.length === 0 || !legalAccepted || isCloning) ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isCloning ? (
                            <><i className="bi bi-arrow-clockwise" style={{ animation: 'spin 1s linear infinite' }}></i> Clonando voz...</>
                        ) : (
                            'Comenzar clonación'
                        )}
                    </button>
                </div>
            </div>,
            document.body
        )}
        </>
    );
};
