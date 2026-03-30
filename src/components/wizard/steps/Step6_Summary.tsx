"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';
import { createClient } from '../../../lib/supabase/client';
import Link from 'next/link';

const formatTimeToSpanishWords = (timeStr: string) => {
    if (!timeStr) return '';
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);

    const minutesToWords = (n: number) => {
        const words: Record<number, string> = {
            1: 'un', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez',
            11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince', 16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve',
            20: 'veinte', 21: 'veintiuno', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro', 25: 'veinticinco', 26: 'veintiséis', 27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve',
            30: 'treinta', 31: 'treinta y uno', 32: 'treinta y dos', 33: 'treinta y tres', 34: 'treinta y cuatro', 35: 'treinta y cinco', 36: 'treinta y seis', 37: 'treinta y siete', 38: 'treinta y ocho', 39: 'treinta y nueve',
            40: 'cuarenta', 41: 'cuarenta y uno', 42: 'cuarenta y dos', 43: 'cuarenta y tres', 44: 'cuarenta y cuatro', 45: 'cuarenta y cinco', 46: 'cuarenta y seis', 47: 'cuarenta y siete', 48: 'cuarenta y ocho', 49: 'cuarenta y nueve',
            50: 'cincuenta', 51: 'cincuenta y uno', 52: 'cincuenta y dos', 53: 'cincuenta y tres', 54: 'cincuenta y cuatro', 55: 'cincuenta y cinco', 56: 'cincuenta y seis', 57: 'cincuenta y siete', 58: 'cincuenta y ocho', 59: 'cincuenta y nueve'
        };
        return words[n] || String(n);
    };

    const hoursMap: Record<number, string> = {
        0: 'las doce de la noche', 1: 'la una de la mañana', 2: 'las dos de la mañana', 3: 'las tres de la mañana',
        4: 'las cuatro de la mañana', 5: 'las cinco de la mañana', 6: 'las seis de la mañana', 7: 'las siete de la mañana',
        8: 'las ocho de la mañana', 9: 'las nueve de la mañana', 10: 'las diez de la mañana', 11: 'las once de la mañana',
        12: 'las doce del mediodía', 13: 'la una de la tarde', 14: 'las dos de la tarde', 15: 'las tres de la tarde',
        16: 'las cuatro de la tarde', 17: 'las cinco de la tarde', 18: 'las seis de la tarde', 19: 'las siete de la tarde',
        20: 'las ocho de la tarde', 21: 'las nueve de la noche', 22: 'las diez de la noche', 23: 'las once de la noche'
    };

    const hourWord = hoursMap[hours] || `${hours}`;

    if (minutes === 0) return hourWord;
    if (minutes === 30) return `${hourWord} y media`;
    if (minutes === 15) return `${hourWord} y cuarto`;

    return `${hourWord} y ${minutesToWords(minutes)} minutos`;
};

const groupBusinessHours = (hours: { day: string; open: string; close: string; closed: boolean }[]) => {
    const active = hours.filter(h => !h.closed);
    if (active.length === 0) return "Estamos cerrados todos los días.";

    const groups: { hoursKey: string; open: string; close: string; days: string[] }[] = [];

    active.forEach(h => {
        const hoursKey = `${h.open}-${h.close}`;
        const existing = groups.find(g => g.hoursKey === hoursKey);
        if (existing) {
            existing.days.push(h.day);
        } else {
            groups.push({ hoursKey, open: h.open, close: h.close, days: [h.day] });
        }
    });

    return groups.map(g => {
        const formattedDays = g.days.map((d, i) => i === 0 ? d : d.toLowerCase());
        const daysJoined = formattedDays.length === 1
            ? formattedDays[0]
            : formattedDays.slice(0, -1).join(', ') + ' y ' + formattedDays[formattedDays.length - 1];

        return `${daysJoined} de ${formatTimeToSpanishWords(g.open)} a ${formatTimeToSpanishWords(g.close)}.`;
    }).join(' ');
};

const formatPhoneForTTS = (phone: string) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/^\+34|^0034/, '');
    const digitWords: Record<string, string> = {
        '0': 'cero', '1': 'uno', '2': 'dos', '3': 'tres', '4': 'cuatro',
        '5': 'cinco', '6': 'seis', '7': 'siete', '8': 'ocho', '9': 'nueve'
    };

    return cleanPhone
        .split('')
        .map(d => digitWords[d] || d)
        .join(' ')
        .trim();
};

const formatUrlForTTS = (url: string) => {
    if (!url) return '';
    return url
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\//g, ' barra ')
        .replace(/\./g, ' punto ')
        .replace(/\s+/g, ' ')
        .trim();
};

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
        agentName, companyName, companyDescription, companyAddress, companyPhone, companyWebsite,
        model, prompt, voiceId, voiceName, voiceProvider,
        kbFiles, leadQuestions, enableTransfer, transferDestinations,
        enableCalBooking, calApiKey, enableCalCancellation,
        businessHours, personality, tone, customNotes,
        setStep, prevStep, updateField, editingAgentId
    } = wizardData;

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const [isCreating, setIsCreating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({ 1: true });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleStep = (s: number) => {
        setExpandedSteps(prev => ({ ...prev, [s]: !prev[s] }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        uploadMultipleFiles(files);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const uploadMultipleFiles = async (files: File[]) => {
        if (kbFiles.length + files.length > 5) {
            setErrorMessage('Máximo 5 archivos permitidos.');
            setShowError(true);
            return;
        }
        setIsUploading(true);
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
        setIsUploading(false);
    };

    const removeFile = (id: string) => {
        updateField('kbFiles', kbFiles.filter(f => f.id !== id));
    };

    const getUpdatedPrompt = useCallback(() => {
        const name = agentName || 'Asistente';
        const company = companyName || 'netelip';
        const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const formattedHours = groupBusinessHours(businessHours);
        const personalityStr = personality.length > 0
            ? `Tu personalidad es: ${personality.join(', ')}.`
            : 'Tienes una personalidad profesional, empática y atenta.';
        
        const toolsContentArr: string[] = [];
        if (enableCalBooking && calApiKey) {
            let calInstructions = `## Gestión de Agenda y Citas\nTienes acceso a la disponibilidad de la agenda de ${company} para agendar citas directamente.`;
            if (enableCalCancellation) {
                calInstructions += `\n- **Cancelaciones**: Tienes permiso para cancelar citas existentes.`;
            }
            toolsContentArr.push(calInstructions);
        }
        if (enableTransfer && transferDestinations.length > 0) {
            const transfers = transferDestinations
                .map(d => `- Si el usuario ${d.description || 'quiere hablar con un compañero'}, ejecuta \`transfer_to_${d.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}\`.`)
                .join('\n');
            toolsContentArr.push(`## Transferencias\n${transfers}`);
        }

        return `
# Perfil y Misión
Eres ${name}, representante de ${company}.
# Estilo
- Personalidad: ${personalityStr}
- Tono: ${tone}
- Fecha: ${today}
${toolsContentArr.length > 0 ? `\n# Herramientas\n${toolsContentArr.join('\n\n')}` : ''}
${kbFiles.length > 0 ? `\n# Base de Conocimientos\n` + kbFiles.map(f => `- ${f.name}`).join('\n') : ''}
# Empresa
${companyDescription ? `- Actividad: ${companyDescription}\n` : ''}- Horario: ${formattedHours}
${customNotes ? `\n# Notas Adicionales\n${customNotes}` : ''}
`.trim();
    }, [agentName, companyName, businessHours, personality, tone, enableCalBooking, calApiKey, enableCalCancellation, enableTransfer, transferDestinations, kbFiles, companyDescription, customNotes]);

    const handleCreateAgent = async () => {
        const finalPrompt = getUpdatedPrompt();
        const cleanedPrompt = cleanPromptForDeployment(finalPrompt);

        if (!agentName || !voiceId) {
            setErrorMessage('Faltan datos críticos para la activación.');
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
        } catch (e: any) {
            setErrorMessage(e.message || 'Error técnico');
            setShowError(true);
        } finally {
            setIsCreating(false);
        }
    };

    const SectionHeader = ({ step, icon, title, isComplete, onEdit }: { step: number, icon: string, title: string, isComplete: boolean, onEdit: (e: React.MouseEvent) => void }) => {
        const isExpanded = expandedSteps[step];
        return (
            <div 
                onClick={() => toggleStep(step)}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '20px 24px',
                    cursor: 'pointer',
                    background: isExpanded ? 'var(--azul-light)' : 'transparent',
                    borderBottom: isExpanded ? 'none' : '1px solid var(--slate-100)',
                    transition: 'all 0.2s'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '12px', 
                        background: isComplete ? 'var(--azul)' : 'var(--slate-100)', 
                        color: isComplete ? 'white' : 'var(--slate-400)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px'
                    }}>
                        <i className={`bi ${icon}`}></i>
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--slate-900)' }}>{title}</h3>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paso {step}</span>
                    </div>
                    {isComplete && (
                        <div style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 800 }}>
                            LISTO
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); onEdit(e); }}
                        style={{ background: 'white', border: '1.5px solid var(--slate-200)', color: 'var(--slate-600)', padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                    >
                        Editar
                    </button>
                    <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`} style={{ color: 'var(--slate-400)' }}></i>
                </div>
            </div>
        );
    };

    if (!mounted) return null;

    if (isSuccess) {
        return (
            <div className="content-area flex-center" style={{ padding: '80px', textAlign: 'center', justifyContent: 'center' }}>
                <div className="card-premium animate-in zoom-in-95 duration-500" style={{ maxWidth: '600px', padding: '60px', borderRadius: '40px' }}>
                    <div className="success-icon-v2" style={{ 
                        width: '100px', 
                        height: '100px', 
                        background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)', 
                        color: 'white', 
                        fontSize: '48px', 
                        margin: '0 auto 32px',
                        boxShadow: '0 20px 40px -10px rgba(16, 185, 129, 0.4)'
                    }}>
                        <i className="bi bi-check-lg"></i>
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--slate-900)', marginBottom: '16px', letterSpacing: '-0.03em' }}>
                        ¡Agente IA Activado!
                    </h1>
                    <p style={{ color: 'var(--slate-500)', fontSize: '17px', lineHeight: '1.6', marginBottom: '40px' }}>
                        Tu agente <strong>{agentName}</strong> ya está configurado y operando con el cerebro de {model}.
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Link href="/dashboard/agents" className="btn-s" style={{ padding: '16px', borderRadius: '18px', fontWeight: 800, justifyContent: 'center' }}>
                            Ir al panel
                        </Link>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="btn-p" 
                            style={{ padding: '16px', borderRadius: '18px', fontWeight: 800, justifyContent: 'center' }}
                        >
                            Ver Detalles
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="content-area" style={{ padding: '40px' }}>
            <WizardStepHeader
                title="Resumen y Activación"
                subtitle="Revisa los detalles finales antes de dar vida a tu agente inteligente."
                showArrows={false}
            />

            <div style={{ maxWidth: '1000px', margin: '32px auto 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
                            <SectionHeader step={1} icon="bi-person-badge" title="Información Básica" isComplete={!!agentName && !!companyName} onEdit={() => setStep(1)} />
                            {expandedSteps[1] && (
                                <div style={{ padding: '24px', background: 'white' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div style={{ background: 'var(--slate-50)', padding: '16px', borderRadius: '16px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: '4px' }}>Agente</div>
                                            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)' }}>{agentName}</div>
                                        </div>
                                        <div style={{ background: 'var(--slate-50)', padding: '16px', borderRadius: '16px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: '4px' }}>Empresa</div>
                                            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)' }}>{companyName}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
                            <SectionHeader step={2} icon="bi-cpu" title="Modelo e Inteligencia" isComplete={!!model && !!prompt} onEdit={() => setStep(2)} />
                            {expandedSteps[2] && (
                                <div style={{ padding: '24px', background: 'white' }}>
                                    <div style={{ background: 'var(--azul-light)', color: 'var(--azul)', display: 'inline-flex', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, marginBottom: '16px' }}>
                                        {model}
                                    </div>
                                    <div style={{ 
                                        background: 'var(--slate-50)', 
                                        padding: '16px', 
                                        borderRadius: '16px', 
                                        fontSize: '14px', 
                                        color: 'var(--slate-600)', 
                                        lineHeight: '1.6',
                                        maxHeight: '150px',
                                        overflowY: 'auto'
                                    }}>
                                        {prompt}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
                            <SectionHeader step={3} icon="bi-mic-fill" title="Voz Seleccionada" isComplete={!!voiceId} onEdit={() => setStep(3)} />
                            {expandedSteps[3] && (
                                <div style={{ padding: '24px', background: 'white' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--slate-50)', padding: '16px', borderRadius: '20px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--azul)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900 }}>
                                            {voiceName?.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)' }}>{voiceName}</div>
                                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-500)' }}>{voiceProvider} • Alta Fidelidad</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
                            <SectionHeader step={5} icon="bi-grid" title="Herramientas e Integraciones" isComplete={enableTransfer || enableCalBooking || leadQuestions.length > 0} onEdit={() => setStep(5)} />
                            {expandedSteps[5] && (
                                <div style={{ padding: '24px', background: 'white' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                                        {leadQuestions.length > 0 && <div className="btn-pill-v2" style={{ padding: '10px', fontSize: '12px', background: '#f0fdf4', color: '#166534', border: '1px solid #dcfce7' }}>Cualificación ACTIVA</div>}
                                        {enableTransfer && <div className="btn-pill-v2" style={{ padding: '10px', fontSize: '12px', background: '#eff6ff', color: '#1e40af', border: '1px solid #dbeafe' }}>Transferencia ACTIVA</div>}
                                        {enableCalBooking && <div className="btn-pill-v2" style={{ padding: '10px', fontSize: '12px', background: '#fdf2f8', color: '#9d174d', border: '1px solid #fce7f3' }}>Cal.com ACTIVO</div>}
                                        {!enableTransfer && !enableCalBooking && leadQuestions.length === 0 && <div style={{ fontSize: '14px', color: 'var(--slate-400)' }}>Sin herramientas configuradas.</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '40px' }}>
                        <div className="card-premium" style={{ padding: '24px' }}>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 800, color: 'var(--slate-900)' }}>Conocimiento del Agente</h4>
                            
                            <div 
                                style={{ 
                                    border: '2px dashed var(--slate-200)', 
                                    borderRadius: '20px', 
                                    padding: '24px 16px', 
                                    textAlign: 'center',
                                    background: '#f8fafc',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--azul)'}
                                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--slate-200)'}
                            >
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} multiple />
                                <i className="bi bi-cloud-arrow-up" style={{ fontSize: '24px', color: 'var(--azul)', marginBottom: '8px', display: 'block' }}></i>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--slate-700)' }}>Añadir Documentos</div>
                                <div style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '4px' }}>PDF, TXT, MD</div>
                            </div>

                            {kbFiles.length > 0 && (
                                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {kbFiles.map(f => (
                                        <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', borderRadius: '14px', border: '1px solid var(--slate-100)', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                            <i className="bi bi-file-earmark-text" style={{ color: 'var(--azul)' }}></i>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {f.name}
                                            </div>
                                            <button onClick={() => removeFile(f.id)} style={{ border: 'none', background: 'none', color: 'var(--slate-400)', cursor: 'pointer' }}>
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="card-premium" style={{ padding: '24px', background: 'var(--slate-900)', color: 'white', boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.3)' }}>
                            <h4 style={{ margin: '0 0 20px 0', fontSize: '12px', fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Estimación de Costes</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div className="flex-between">
                                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Suscripción Mensual</span>
                                    <span style={{ fontWeight: 800 }}>€0.00</span>
                                </div>
                                <div className="flex-between">
                                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Coste por Minuto</span>
                                    <span style={{ fontWeight: 800 }}>€0.12</span>
                                </div>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }}></div>
                                <div className="flex-between">
                                    <span style={{ fontSize: '14px', fontWeight: 800 }}>Pago Inicial</span>
                                    <span style={{ fontSize: '20px', fontWeight: 900, color: '#4ade80' }}>GRATIS</span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleCreateAgent}
                                disabled={isCreating}
                                className="btn-p w-full"
                                style={{ 
                                    marginTop: '28px', 
                                    padding: '18px', 
                                    borderRadius: '20px', 
                                    background: 'var(--azul)', 
                                    color: 'white', 
                                    border: 'none', 
                                    fontWeight: 900, 
                                    fontSize: '16px', 
                                    boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.5)',
                                    justifyContent: 'center'
                                }}
                            >
                                {isCreating ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" style={{ marginRight: '12px' }}></span>
                                        PROCESANDO...
                                    </>
                                ) : (
                                    <>
                                        {editingAgentId ? 'GUARDAR CAMBIOS' : 'ACTIVAR AGENTE'}
                                        <i className="bi bi-lightning-charge-fill" style={{ marginLeft: '10px' }}></i>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-between" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '40px', marginTop: '40px' }}>
                    <button type="button" className="btn-s" onClick={prevStep} style={{ padding: '14px 32px', borderRadius: '16px', fontWeight: 700 }}>
                        <i className="bi bi-arrow-left"></i> Modificar pasos
                    </button>
                    <div></div>
                </div>
            </div>

            {showError && (
                <div style={{ position: 'fixed', bottom: '40px', right: '40px', background: '#fff1f2', border: '1.5px solid #fecdd3', padding: '16px 24px', borderRadius: '20px', boxShadow: '0 20px 40px -10px rgba(225, 29, 72, 0.2)', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 5000 }} className="animate-in slide-in-from-right-10">
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#9f1239' }}>Error de Activación</div>
                        <div style={{ fontSize: '13px', color: '#e11d48' }}>{errorMessage}</div>
                    </div>
                    <button onClick={() => setShowError(false)} style={{ border: 'none', background: 'none', color: '#e11d48', cursor: 'pointer', fontSize: '20px' }}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
            )}
        </div>
    );
};
