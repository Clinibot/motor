"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { createClient } from '../../../lib/supabase/client';
import Link from 'next/link';


const cleanPromptForDeployment = (prompt: string) => {
    if (!prompt) return '';
    return prompt
        .replace(/<!--\s*AUTO_[A-Z_]+_(?:START|END)\s*-->/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

export const Step6_Summary: React.FC = () => {
    const wizardData = useWizardStore();
    const {
        agentName, companyName, companyDescription,
        model, voiceId, voiceName, voiceProvider, language,
        kbFiles, kbUsageInstructions,
        enableTransfer, transferDestinations,
        enableCalBooking,
        personality, tone, customNotes,
        whoFirst, beginMessage,
        volume, enableAmbientSound, ambientSound,
        leadQuestions, extractionVariables,
        setStep, prevStep, updateField, editingAgentId
    } = wizardData;

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const [isCreating, setIsCreating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showError, setShowError] = useState(false);

    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        info: false, llm: false, voz: false, audio: false, tools: false,
        kbRulesExamples: false, notesExamples: false,
    });

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        uploadMultipleFiles(files);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const uploadMultipleFiles = async (files: File[]) => {
        if (kbFiles.length + files.length > 10) {
            setErrorMessage('Máximo 10 archivos permitidos.');
            setShowError(true);
            return;
        }
        const newFiles = [...kbFiles];

        for (const f of files) {
            const formData = new FormData();
            formData.append('file', f);
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const { data: user } = await supabase.from('users').select('workspace_id').eq('id', session.user.id).single();
                    if (user?.workspace_id) formData.append('workspace_id', user.workspace_id);
                }
                const res = await fetch('/api/retell/knowledge-base', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success && data.knowledge_base_id) {
                    newFiles.push({
                        id: data.knowledge_base_id,
                        name: data.name,
                        retell_name: data.retell_name,
                        size: data.size,
                        type: data.type
                    });
                } else {
                    setErrorMessage(`Error al subir ${f.name}: ${data.error}`);
                    setShowError(true);
                }
            } catch {
                setErrorMessage(`Error de conexión al subir ${f.name}`);
                setShowError(true);
            }
        }
        updateField('kbFiles', newFiles);
    };

    const removeFile = (id: string) => {
        updateField('kbFiles', kbFiles.filter(f => f.id !== id));
    };

    const getUpdatedPrompt = useCallback(() => {
        const name = agentName || 'Asistente';
        const company = companyName || 'netelip';
        const personalityStr = personality.length > 0
            ? `Tu personalidad es: ${personality.join(', ')}.`
            : 'Tienes una personalidad profesional, empática y atenta.';

        let prompt = `# Perfil y Misión\nRol: Eres ${name}, el agente virtual que trabaja para la empresa ${company}.`;

        if (companyDescription?.trim()) {
            prompt += `\nDescripción: ${companyDescription.trim()}`;
        }

        prompt += `\n\n# Estilo y Comportamiento\n- Personalidad: ${personalityStr}\n- Tono: ${tone}`;

        return prompt.trim();
    }, [agentName, companyName, companyDescription, personality, tone]);

    const handleCreateAgent = async () => {
        const finalPrompt = getUpdatedPrompt();
        const cleanedPrompt = cleanPromptForDeployment(finalPrompt);

        if (!agentName || !voiceId) {
            setErrorMessage('Faltan datos obligatorios para configurar el agente.');
            setShowError(true);
            return;
        }

        setIsCreating(true);
        try {
            const method = editingAgentId ? 'PATCH' : 'POST';
            const response = await fetch('/api/retell/agent', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...wizardData, id: editingAgentId, prompt: cleanedPrompt }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Error del servidor');
            setIsSuccess(true);
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : 'Error técnico durante la activación');
            setShowError(true);
        } finally {
            setIsCreating(false);
        }
    };

    if (!mounted) return null;

    if (isSuccess) {
        return (
            <div className="form-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
                <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px'
                }}>
                    <i className="bi bi-check-lg" style={{ fontSize: '32px', color: '#16a34a' }}></i>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>¡Agente creado con éxito!</div>
                <div style={{ fontSize: '14px', color: 'var(--gris-texto)', marginBottom: '24px', lineHeight: '1.6' }}>
                    Tu agente <strong>{agentName}</strong> está listo para recibir llamadas. Asígnale un número de teléfono para empezar.
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <Link href="/dashboard/agents" className="btn-s">
                        <i className="bi bi-robot"></i> Ir a Mis agentes
                    </Link>
                    <Link href="/dashboard" className="btn-p">
                        <i className="bi bi-house-door"></i> Ir al Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const volPct = Math.round(volume * 100);
    const enableLeadQualification = leadQuestions.length > 0;

    return (
        <div className="form-card">
            <div className="form-title">Resumen y confirmación</div>
            <div className="form-sub">Revisa toda la configuración de tu agente. Puedes editar cualquier campo directamente o volver al paso correspondiente.</div>

            {/* Banner de configuración completada */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--r-lg)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
                <i className="bi bi-check-circle-fill" style={{ fontSize: '26px', color: 'var(--exito)', flexShrink: 0 }}></i>
                <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#166534' }}>Configuración completada</div>
                    <div style={{ fontSize: '13px', color: '#4ade80', marginTop: '2px' }}>Todos los pasos están listos. Revisa y edita lo que necesites antes de crear el agente.</div>
                </div>
            </div>

            {/* ═══ SECCIÓN 1: INFO BÁSICA ═══ */}
            <div style={{ border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', marginBottom: '16px', overflow: 'hidden' }}>
                <div
                    style={{ padding: '16px 20px', background: 'var(--gris-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: openSections.info ? '1px solid var(--gris-borde)' : 'none', cursor: 'pointer' }}
                    onClick={() => toggleSection('info')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--azul-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="bi bi-person-badge" style={{ color: 'var(--azul)', fontSize: '14px' }}></i>
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>Información básica</div>
                            <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>Paso 1</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className="btn-s" onClick={(e) => { e.stopPropagation(); setStep(1); }} style={{ fontSize: '11px', padding: '5px 12px' }}>
                            <i className="bi bi-pencil" style={{ fontSize: '11px' }}></i> Ir al paso
                        </button>
                        <i className="bi bi-chevron-down" style={{ color: 'var(--gris-texto)', fontSize: '14px', transition: 'transform .2s', transform: openSections.info ? 'rotate(180deg)' : 'none' }}></i>
                    </div>
                </div>
                {openSections.info && (
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <div className="fg" style={{ marginBottom: 0 }}>
                                <label className="lbl">Nombre del agente</label>
                                <input className="inp" value={agentName} onChange={e => updateField('agentName', e.target.value)} placeholder="Ej: Elio, Laura, Marco..." />
                            </div>
                            <div className="fg" style={{ marginBottom: 0 }}>
                                <label className="lbl">Nombre de la empresa</label>
                                <input className="inp" value={companyName} onChange={e => updateField('companyName', e.target.value)} placeholder="Ej: netelip, Mi Empresa S.L." />
                            </div>
                        </div>
                        <div className="fg" style={{ marginTop: '14px', marginBottom: 0 }}>
                            <label className="lbl">Descripción de la empresa</label>
                            <textarea className="inp" rows={2} style={{ resize: 'vertical' }} value={companyDescription} onChange={e => updateField('companyDescription', e.target.value)} placeholder="Ej: Empresa de telecomunicaciones especializada en centralitas virtuales..." />
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ SECCIÓN 2: CEREBRO (LLM) ═══ */}
            <div style={{ border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', marginBottom: '16px', overflow: 'hidden' }}>
                <div
                    style={{ padding: '16px 20px', background: 'var(--gris-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: openSections.llm ? '1px solid var(--gris-borde)' : 'none', cursor: 'pointer' }}
                    onClick={() => toggleSection('llm')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="bi bi-cpu" style={{ color: '#7c3aed', fontSize: '14px' }}></i>
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>Modelo de IA y comportamiento</div>
                            <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>Paso 2</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className="btn-s" onClick={(e) => { e.stopPropagation(); setStep(2); }} style={{ fontSize: '11px', padding: '5px 12px' }}>
                            <i className="bi bi-pencil" style={{ fontSize: '11px' }}></i> Ir al paso
                        </button>
                        <i className="bi bi-chevron-down" style={{ color: 'var(--gris-texto)', fontSize: '14px', transition: 'transform .2s', transform: openSections.llm ? 'rotate(180deg)' : 'none' }}></i>
                    </div>
                </div>
                {openSections.llm && (
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                            <div className="fg" style={{ marginBottom: 0 }}>
                                <label className="lbl">Modelo IA</label>
                                <div style={{ padding: '10px 14px', background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="bi bi-stars" style={{ color: 'var(--azul)' }}></i>
                                    {model === 'gemini-3.0-flash' ? 'Gemini 3.0 Flash' : 'GPT-4.1'}
                                    {model === 'gemini-3.0-flash' && <span style={{ fontSize: '10px', fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', marginLeft: 'auto' }}>Recomendado</span>}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                            <div className="fg" style={{ marginBottom: 0 }}>
                                <label className="lbl">Personalidad</label>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {personality.length > 0
                                        ? personality.map(p => <span key={p} className="pill on" style={{ cursor: 'default' }}>{p}</span>)
                                        : <span style={{ fontSize: '13px', color: 'var(--gris-texto)' }}>Sin definir</span>
                                    }
                                </div>
                            </div>
                            <div className="fg" style={{ marginBottom: 0 }}>
                                <label className="lbl">Tono</label>
                                <div style={{ padding: '10px 14px', background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', fontSize: '13px', fontWeight: 600 }}>
                                    {tone || 'Sin definir'}
                                </div>
                            </div>
                        </div>
                        <div className="fg" style={{ marginBottom: 0 }}>
                            <label className="lbl">Mensaje de inicio</label>
                            <textarea className="inp" rows={3} style={{ resize: 'vertical', fontSize: '12px' }} value={beginMessage} onChange={e => updateField('beginMessage', e.target.value)} placeholder="Ej: Hola, soy [nombre], tu asistente de voz con IA de [empresa]..." />
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ SECCIÓN 3: VOZ ═══ */}
            <div style={{ border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', marginBottom: '16px', overflow: 'hidden' }}>
                <div
                    style={{ padding: '16px 20px', background: 'var(--gris-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: openSections.voz ? '1px solid var(--gris-borde)' : 'none', cursor: 'pointer' }}
                    onClick={() => toggleSection('voz')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="bi bi-mic" style={{ color: '#d97706', fontSize: '14px' }}></i>
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>Voz seleccionada</div>
                            <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>Paso 3</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className="btn-s" onClick={(e) => { e.stopPropagation(); setStep(3); }} style={{ fontSize: '11px', padding: '5px 12px' }}>
                            <i className="bi bi-pencil" style={{ fontSize: '11px' }}></i> Ir al paso
                        </button>
                        <i className="bi bi-chevron-down" style={{ color: 'var(--gris-texto)', fontSize: '14px', transition: 'transform .2s', transform: openSections.voz ? 'rotate(180deg)' : 'none' }}></i>
                    </div>
                </div>
                {openSections.voz && (
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', fontWeight: 700, flexShrink: 0 }}>
                                {voiceName?.charAt(0) || '?'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '15px', fontWeight: 700 }}>{voiceName || 'Sin seleccionar'}</div>
                                <div style={{ fontSize: '12px', color: 'var(--gris-texto)', marginTop: '2px' }}>
                                    {voiceProvider ? `${voiceProvider.charAt(0).toUpperCase() + voiceProvider.slice(1)} · ` : ''}{language?.startsWith('ca') ? 'Catalán' : language?.startsWith('en') ? 'English' : 'Español'}
                                </div>
                            </div>
                            {!voiceId && (
                                <button className="btn-s" onClick={() => setStep(3)} style={{ fontSize: '12px' }}>Seleccionar voz</button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ SECCIÓN 4: AUDIO ═══ */}
            <div style={{ border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', marginBottom: '16px', overflow: 'hidden' }}>
                <div
                    style={{ padding: '16px 20px', background: 'var(--gris-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: openSections.audio ? '1px solid var(--gris-borde)' : 'none', cursor: 'pointer' }}
                    onClick={() => toggleSection('audio')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="bi bi-volume-up" style={{ color: '#db2777', fontSize: '14px' }}></i>
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>Configuración de audio</div>
                            <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>Paso 4</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className="btn-s" onClick={(e) => { e.stopPropagation(); setStep(4); }} style={{ fontSize: '11px', padding: '5px 12px' }}>
                            <i className="bi bi-pencil" style={{ fontSize: '11px' }}></i> Ir al paso
                        </button>
                        <i className="bi bi-chevron-down" style={{ color: 'var(--gris-texto)', fontSize: '14px', transition: 'transform .2s', transform: openSections.audio ? 'rotate(180deg)' : 'none' }}></i>
                    </div>
                </div>
                {openSections.audio && (
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <div className="fg" style={{ marginBottom: 0 }}>
                                <label className="lbl">Volumen del agente</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ flex: 1, height: '6px', background: 'var(--gris-borde)', borderRadius: '3px' }}>
                                        <div style={{ height: '100%', width: `${volPct}%`, background: 'var(--azul)', borderRadius: '3px' }}></div>
                                    </div>
                                    <span style={{ background: 'var(--azul)', color: 'white', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--r-sm)' }}>{volPct}%</span>
                                </div>
                            </div>
                            <div className="fg" style={{ marginBottom: 0 }}>
                                <label className="lbl">Sonido ambiente</label>
                                <div style={{ padding: '10px 14px', background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="bi bi-soundwave" style={{ color: 'var(--gris-texto)' }}></i>
                                    {enableAmbientSound ? (ambientSound || 'Activado') : 'Ninguno'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ SECCIÓN 5: HERRAMIENTAS ═══ */}
            <div style={{ border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', marginBottom: '16px', overflow: 'hidden' }}>
                <div
                    style={{ padding: '16px 20px', background: 'var(--gris-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: openSections.tools ? '1px solid var(--gris-borde)' : 'none', cursor: 'pointer' }}
                    onClick={() => toggleSection('tools')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="bi bi-tools" style={{ color: '#2563eb', fontSize: '14px' }}></i>
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>Herramientas activas</div>
                            <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>Paso 5</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className="btn-s" onClick={(e) => { e.stopPropagation(); setStep(5); }} style={{ fontSize: '11px', padding: '5px 12px' }}>
                            <i className="bi bi-pencil" style={{ fontSize: '11px' }}></i> Ir al paso
                        </button>
                        <i className="bi bi-chevron-down" style={{ color: 'var(--gris-texto)', fontSize: '14px', transition: 'transform .2s', transform: openSections.tools ? 'rotate(180deg)' : 'none' }}></i>
                    </div>
                </div>
                {openSections.tools && (
                    <div style={{ padding: '20px' }}>
                        {/* Cualificación */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: enableLeadQualification ? 'var(--azul)' : 'var(--gris-borde)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="bi bi-person-check" style={{ color: enableLeadQualification ? 'white' : 'var(--gris-texto)', fontSize: '14px' }}></i>
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Cualificación de lead</div>
                                    <div style={{ fontSize: '11px', color: 'var(--gris-texto)' }}>{enableLeadQualification ? `${leadQuestions.length} pregunta${leadQuestions.length !== 1 ? 's' : ''} configurada${leadQuestions.length !== 1 ? 's' : ''}` : 'No configurada'}</div>
                                </div>
                            </div>
                            <span style={{ background: enableLeadQualification ? '#dcfce7' : 'var(--gris-bg)', color: enableLeadQualification ? '#166534' : 'var(--gris-texto)', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', border: enableLeadQualification ? 'none' : '1px solid var(--gris-borde)' }}>
                                {enableLeadQualification ? 'Activa' : 'Desactivada'}
                            </span>
                        </div>
                        {/* Transferencia */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: enableTransfer ? 'var(--azul)' : 'var(--gris-borde)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="bi bi-telephone-forward" style={{ color: enableTransfer ? 'white' : 'var(--gris-texto)', fontSize: '14px' }}></i>
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Transferencia de llamadas</div>
                                    <div style={{ fontSize: '11px', color: 'var(--gris-texto)' }}>{enableTransfer && transferDestinations.length > 0 ? transferDestinations.map(d => d.name).join(', ') : 'No configurada'}</div>
                                </div>
                            </div>
                            <span style={{ background: enableTransfer ? '#dcfce7' : 'var(--gris-bg)', color: enableTransfer ? '#166534' : 'var(--gris-texto)', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', border: enableTransfer ? 'none' : '1px solid var(--gris-borde)' }}>
                                {enableTransfer ? 'Activa' : 'Desactivada'}
                            </span>
                        </div>
                        {/* Extracción de datos */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: extractionVariables.length > 0 ? 'var(--azul)' : 'var(--gris-borde)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="bi bi-bar-chart-line" style={{ color: extractionVariables.length > 0 ? 'white' : 'var(--gris-texto)', fontSize: '14px' }}></i>
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Extracción de datos</div>
                                    <div style={{ fontSize: '11px', color: 'var(--gris-texto)' }}>{extractionVariables.length > 0 ? `${extractionVariables.length} variable${extractionVariables.length !== 1 ? 's' : ''} configurada${extractionVariables.length !== 1 ? 's' : ''}` : 'Sin variables personalizadas'}</div>
                                </div>
                            </div>
                            <button className="btn-s" onClick={() => { setStep(5); setTimeout(() => { document.getElementById('extraction')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150); }} style={{ fontSize: '11px', padding: '4px 10px' }}>
                                <i className="bi bi-pencil" style={{ fontSize: '11px' }}></i> Configurar
                            </button>
                        </div>
                        {/* Cal.com */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: enableCalBooking ? 'var(--purpura)' : 'var(--gris-borde)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="bi bi-calendar-check" style={{ color: enableCalBooking ? 'white' : 'var(--gris-texto)', fontSize: '14px' }}></i>
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Reservar cita (Cal.com)</div>
                                    <div style={{ fontSize: '11px', color: 'var(--gris-texto)' }}>{enableCalBooking ? 'Configurada' : 'No configurada'}</div>
                                </div>
                            </div>
                            <span style={{ background: enableCalBooking ? '#dcfce7' : 'var(--gris-bg)', color: enableCalBooking ? '#166534' : 'var(--gris-texto)', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', border: enableCalBooking ? 'none' : '1px solid var(--gris-borde)' }}>
                                {enableCalBooking ? 'Activa' : 'Desactivada'}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <hr className="divider" />

            {/* ═══ BASE DE CONOCIMIENTO ═══ */}
            <div className="form-section-title"><i className="bi bi-journal-text"></i> Base de conocimiento</div>
            <p style={{ fontSize: '13px', color: 'var(--gris-texto)', marginBottom: '14px' }}>Sube documentos con información sobre tu empresa. El agente los usará para responder preguntas con mayor precisión.</p>

            <input type="file" ref={fileInputRef} id="kbFileInput" multiple accept=".pdf,.txt,.md" style={{ display: 'none' }} onChange={handleFileUpload} />
            <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--azul)'; e.currentTarget.style.background = 'var(--azul-light)'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--gris-borde)'; e.currentTarget.style.background = 'transparent'; }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--gris-borde)'; e.currentTarget.style.background = 'transparent'; uploadMultipleFiles(Array.from(e.dataTransfer.files)); }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--azul)'; e.currentTarget.style.background = 'var(--azul-light)'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--gris-borde)'; e.currentTarget.style.background = 'transparent'; }}
                style={{ border: '2px dashed var(--gris-borde)', borderRadius: 'var(--r-lg)', padding: '32px', textAlign: 'center', color: 'var(--gris-texto)', cursor: 'pointer', transition: 'all .15s' }}
            >
                <i className="bi bi-cloud-upload" style={{ fontSize: '32px', display: 'block', marginBottom: '10px', color: 'var(--azul)', opacity: .6 }}></i>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--oscuro)' }}>Arrastra archivos aquí o haz clic para subir</div>
                <div style={{ fontSize: '12px', marginTop: '6px' }}>PDF, TXT, MD · Máx. 25 MB por archivo</div>
            </div>

            {kbFiles.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {kbFiles.map(f => (
                        <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)' }}>
                            <i className="bi bi-file-earmark-text" style={{ color: 'var(--azul)', fontSize: '16px', flexShrink: 0 }}></i>
                            <span style={{ fontSize: '13px', fontWeight: 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                            <button onClick={() => removeFile(f.id)} style={{ border: 'none', background: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '14px', padding: '2px 4px' }}>
                                <i className="bi bi-trash"></i>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="ci" style={{ marginTop: '12px', marginBottom: 0 }}>
                <i className="bi bi-info-circle-fill" style={{ flexShrink: 0, marginTop: '1px' }}></i>
                <div>Puedes subir FAQs, manuales de producto, catálogos de precios o cualquier documento que ayude al agente a responder con precisión. <strong>Este paso es opcional</strong> — puedes añadir o actualizar documentos más adelante desde el panel de edición del agente.</div>
            </div>

            {/* Acordeón mejores prácticas */}
            <details style={{ marginTop: '14px', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '14px', padding: '14px 20px', background: 'var(--gris-bg)', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}>
                    <i className="bi bi-lightbulb" style={{ color: '#d97706' }}></i> Mejores prácticas para preparar tus documentos
                    <i className="bi bi-chevron-right" style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--gris-texto)' }}></i>
                </summary>
                <div style={{ padding: '16px 20px' }}>
                    {[
                        { title: 'Formato recomendado', body: 'Utiliza archivos .md (Markdown) en lugar de .txt siempre que sea posible. El Markdown bien estructurado se divide en fragmentos con mayor precisión y el agente recupera la información de forma más fiable.' },
                        { title: 'Estructura del documento', body: 'Usa títulos claros y descriptivos con encabezados ## para cada sección. Mantén cada sección concisa. Escribe párrafos cortos y utiliza listas para separar conceptos.' },
                        { title: 'Agrupa la información relacionada', body: 'Mantén la información que va junta dentro de la misma sección del documento. Esto permite que el agente recupere fragmentos coherentes y relevantes durante la conversación.' },
                        { title: 'Sé específico, evita la ambigüedad', body: 'Incluye nombres completos, fechas, unidades, precios y datos concretos. Evita pronombres ambiguos como "esto" o "aquello".' },
                    ].map(item => (
                        <div key={item.title} style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--oscuro)', marginBottom: '4px' }}>{item.title}</div>
                            <div style={{ fontSize: '12px', color: 'var(--gris-texto)', lineHeight: '1.6' }}>{item.body}</div>
                        </div>
                    ))}
                </div>
            </details>

            <hr className="divider" />

            {/* ═══ REGLAS PARA LA BASE DE CONOCIMIENTO ═══ */}
            <div className="fg">
                <label className="lbl">
                    <i className="bi bi-shield-check" style={{ marginRight: '4px', color: '#7c3aed' }}></i>
                    Reglas para la base de conocimiento <span style={{ fontWeight: 400, color: 'var(--gris-texto)' }}>(opcional)</span>
                </label>
                <p style={{ fontSize: '12px', color: 'var(--gris-texto)', marginBottom: '10px', lineHeight: '1.6' }}>Define cómo debe comportarse el agente cuando consulta los documentos que has subido.</p>
                <textarea
                    className="inp" rows={3} style={{ resize: 'vertical' }}
                    value={kbUsageInstructions}
                    onChange={e => updateField('kbUsageInstructions', e.target.value)}
                    placeholder='Ej: "Si te preguntan por precios, consulta siempre la base de conocimiento. Cita los precios exactos sin redondear."'
                />
                <div className="hint"><i className="bi bi-info-circle" style={{ marginRight: '3px' }}></i>Estas instrucciones le dicen al agente cómo buscar y usar la información de los documentos.</div>
            </div>

            <details style={{ marginTop: '10px', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '13px', padding: '12px 20px', background: 'var(--gris-bg)', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}>
                    <i className="bi bi-clipboard-check" style={{ color: '#7c3aed' }}></i> Ver ejemplos de reglas
                    <i className="bi bi-chevron-right" style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--gris-texto)' }}></i>
                </summary>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                        'Si te preguntan por precios, consulta siempre la base de conocimiento. Cita los precios exactos tal como aparecen en los documentos, sin redondear ni aproximar.',
                        'Si la pregunta del cliente no tiene respuesta en la base de conocimiento, dilo con transparencia. No inventes información.',
                        'Cuando respondas usando información de la base de conocimiento, hazlo de forma natural y conversacional. No menciones que estás consultando documentos.',
                    ].map((ex, i) => (
                        <div key={i} style={{ background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: '12px', fontFamily: "'Courier New', monospace", lineHeight: '1.5', color: '#374151' }}>{ex}</div>
                    ))}
                </div>
            </details>

            <hr className="divider" />

            {/* ═══ NOTAS ADICIONALES AL PROMPT ═══ */}
            <div className="fg">
                <label className="lbl">
                    <i className="bi bi-pencil-square" style={{ marginRight: '4px', color: 'var(--azul)' }}></i>
                    Notas adicionales al prompt <span style={{ fontWeight: 400, color: 'var(--gris-texto)' }}>(opcional)</span>
                </label>
                <p style={{ fontSize: '12px', color: 'var(--gris-texto)', marginBottom: '10px', lineHeight: '1.6' }}>Instrucciones generales que se añaden al final del prompt del agente: horarios, políticas, normas internas, etc.</p>
                <textarea
                    className="inp" rows={3} style={{ resize: 'vertical' }}
                    value={customNotes}
                    onChange={e => updateField('customNotes', e.target.value)}
                    placeholder='Ej: "Los horarios de atención son de lunes a viernes de 9:00 a 18:00h. Fuera de horario, ofrece agendar una cita."'
                />
                <div className="hint"><i className="bi bi-info-circle" style={{ marginRight: '3px' }}></i>Estas notas personalizan el comportamiento general del agente, no dependen de los documentos subidos.</div>
            </div>

            <details style={{ marginTop: '10px', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '13px', padding: '12px 20px', background: 'var(--gris-bg)', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}>
                    <i className="bi bi-clipboard-check" style={{ color: 'var(--azul)' }}></i> Ver ejemplos de notas
                    <i className="bi bi-chevron-right" style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--gris-texto)' }}></i>
                </summary>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                        'Los horarios de atención son de lunes a viernes de 9:00 a 18:00, hora de Madrid. Si alguien llama fuera de horario, infórmale y ofrece agendar una cita para el siguiente día laborable.',
                        'Si el cliente pregunta por un servicio que no ofrecemos, no improvises. Ofrece transferir la llamada a un asesor comercial.',
                        'Al finalizar cada llamada, confirma siempre el nombre y el teléfono de contacto del cliente antes de despedirte.',
                    ].map((ex, i) => (
                        <div key={i} style={{ background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: '12px', fontFamily: "'Courier New', monospace", lineHeight: '1.5', color: '#374151' }}>{ex}</div>
                    ))}
                </div>
            </details>

            <hr className="divider" />

            {/* ═══ BOTÓN CREAR AGENTE ═══ */}
            <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '2px solid var(--gris-borde)' }}>
                <button
                    className="btn-p"
                    onClick={handleCreateAgent}
                    disabled={isCreating}
                    style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '16px', background: 'var(--exito)', fontWeight: 700, borderRadius: 'var(--r-lg)', transition: 'all .3s' }}
                >
                    <i className="bi bi-rocket-takeoff-fill"></i>
                    {isCreating ? ' Creando agente...' : (editingAgentId ? ' Guardar cambios' : ' Crear agente IA')}
                </button>
                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '12px', color: 'var(--gris-texto)' }}>
                    Podrás editar y probar el agente desde &quot;Mis agentes&quot; en cualquier momento.
                </div>
            </div>

            {/* Footer de navegación */}
            <div className="wiz-footer" style={{ marginTop: '24px' }}>
                <button type="button" className="btn-s" onClick={prevStep}>
                    <i className="bi bi-arrow-left"></i> Anterior
                </button>
                <div></div>
            </div>

            {/* Error toast */}
            {showError && (
                <div style={{
                    position: 'fixed', bottom: '40px', right: '40px', background: '#fff1f2', border: '1.5px solid #fecdd3',
                    padding: '16px 24px', borderRadius: 'var(--r-lg)', boxShadow: '0 10px 30px rgba(225,29,72,.2)',
                    display: 'flex', alignItems: 'center', gap: '16px', zIndex: 9999
                }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ color: 'var(--error)', fontSize: '20px', flexShrink: 0 }}></i>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#9f1239' }}>Error de configuración</div>
                        <div style={{ fontSize: '12px', color: '#e11d48' }}>{errorMessage}</div>
                    </div>
                    <button onClick={() => setShowError(false)} style={{ background: 'none', border: 'none', color: '#e11d48', fontSize: '18px', cursor: 'pointer', padding: '2px' }}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
            )}
        </div>
    );
};
