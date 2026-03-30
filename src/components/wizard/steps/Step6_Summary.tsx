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
        model, voiceId, voiceName, 
        kbFiles, enableTransfer, transferDestinations,
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

# Estilo y Comportamiento
- Personalidad: ${personalityStr}
- Tono: ${tone}
- Fecha Actual: ${today}

# Información de la Empresa
- Descripción: ${companyDescription || 'Empresa de servicios profesionales.'}
- Horario de Atención: ${formattedHours}

${toolsContentArr.length > 0 ? `# Herramientas de Automatización\n${toolsContentArr.join('\n\n')}\n` : ''}
${kbFiles.length > 0 ? `# Base de Conocimiento\n` + kbFiles.map(f => `- Documento: ${f.name}`).join('\n') + '\n' : ''}
${customNotes ? `# Notas Adicionales\n${customNotes}\n` : ''}
`.trim();
    }, [agentName, companyName, businessHours, personality, tone, enableCalBooking, calApiKey, enableCalCancellation, enableTransfer, transferDestinations, kbFiles, companyDescription, customNotes]);

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
        } catch (e: any) {
            setErrorMessage(e instanceof Error ? e.message : 'Error técnico durante la activación');
            setShowError(true);
        } finally {
            setIsCreating(false);
        }
    };

    if (!mounted) return null;

    if (isSuccess) {
        return (
            <div className="content-area flex-center" style={{ padding: '80px', textAlign: 'center', justifyContent: 'center' }}>
                <div className="card-premium animate-in zoom-in-95 duration-500" style={{ maxWidth: '600px', padding: '60px', borderRadius: '40px' }}>
                    <div style={{ 
                        width: '100px', height: '100px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)', 
                        color: 'white', fontSize: '48px', margin: '0 auto 32px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 20px 40px -10px rgba(16, 185, 129, 0.4)'
                    }}>
                        <i className="bi bi-check-lg"></i>
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--slate-900)', marginBottom: '16px', letterSpacing: '-0.03em' }}>
                        ¡Agente IA Listo!
                    </h1>
                    <p style={{ color: 'var(--slate-500)', fontSize: '17px', lineHeight: '1.6', marginBottom: '40px' }}>
                        Tu asistente <strong>{agentName}</strong> ha sido configurado con éxito y ya puede empezar a recibir llamadas.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Link href="/dashboard/agents" className="btn-s" style={{ padding: '16px', borderRadius: '18px', fontWeight: 800, justifyContent: 'center' }}>
                            Ver mis agentes
                        </Link>
                        <button onClick={() => window.location.href = '/dashboard/agents'} className="btn-p" style={{ padding: '16px', borderRadius: '18px', fontWeight: 800, justifyContent: 'center' }}>
                            Panel de control
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="content-area" style={{ padding: '60px' }}>
            <WizardStepHeader
                title="Resumen y Activación"
                subtitle="Revisa tu configuración técnica y activa el agente."
                showArrows={false}
            />

            <div style={{ maxWidth: '1100px', marginTop: '40px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '40px', alignItems: 'start' }}>
                    
                    {/* LEFT COLUMN: SUMMARY DETAILS */}
                    <div style={{ display: 'grid', gap: '24px' }}>
                        
                        {/* STEP 1 SUMMARY */}
                        <div className="card-premium" style={{ padding: '32px' }}>
                            <div className="flex-between" style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div className="flex-center" style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--azul-light)', color: 'var(--azul)', fontSize: '20px' }}>
                                        <i className="bi bi-person-circle"></i>
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Identidad del Agente</h3>
                                        <span style={{ fontSize: '12px', color: 'var(--slate-400)', fontWeight: 600 }}>PASO 1</span>
                                    </div>
                                </div>
                                <button onClick={() => setStep(1)} className="btn-s" style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px', border: '1.5px solid var(--slate-100)' }}>Editar</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={{ background: 'var(--slate-50)', padding: '20px', borderRadius: '16px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Nombre Agent</span>
                                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)' }}>{agentName}</span>
                                </div>
                                <div style={{ background: 'var(--slate-50)', padding: '20px', borderRadius: '16px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Empresa</span>
                                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)' }}>{companyName}</span>
                                </div>
                            </div>
                            {companyDescription && (
                                <div style={{ background: 'var(--slate-50)', padding: '20px', borderRadius: '16px', marginTop: '20px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.05em' }}>Descripción de Negocio</span>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--slate-600)', lineHeight: '1.6' }}>{companyDescription}</span>
                                </div>
                            )}
                        </div>

                        {/* STEP 2 SUMMARY: BRAIN */}
                        <div className="card-premium" style={{ padding: '32px' }}>
                            <div className="flex-between" style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div className="flex-center" style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#f0fdf4', color: '#16a34a', fontSize: '20px' }}>
                                        <i className="bi bi-cpu"></i>
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Modelo e Inteligencia</h3>
                                        <span style={{ fontSize: '12px', color: 'var(--slate-400)', fontWeight: 600 }}>PASO 2</span>
                                    </div>
                                </div>
                                <button onClick={() => setStep(2)} className="btn-s" style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px' }}>Editar</button>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ background: 'var(--slate-900)', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>{model.toUpperCase()}</div>
                                <div style={{ background: 'var(--slate-50)', color: 'var(--slate-600)', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>Tono {tone}</div>
                                {personality.map(p => (
                                    <div key={p} style={{ background: 'var(--azul-light)', color: 'var(--azul)', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>{p}</div>
                                ))}
                            </div>
                        </div>

                        {/* STEP 3 & 4 SUMMARY: VOICE & AUDIO */}
                        <div className="card-premium" style={{ padding: '32px' }}>
                            <div className="flex-between" style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div className="flex-center" style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#fdf2f8', color: '#db2777', fontSize: '20px' }}>
                                        <i className="bi bi-mic-fill"></i>
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Voz y Procesamiento</h3>
                                        <span style={{ fontSize: '12px', color: 'var(--slate-400)', fontWeight: 600 }}>PASO 3 Y 4</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => setStep(3)} className="btn-s" style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px' }}>Voz</button>
                                    <button onClick={() => setStep(4)} className="btn-s" style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px' }}>Audio</button>
                                </div>
                            </div>
                            <div style={{ background: 'var(--slate-50)', padding: '24px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div className="flex-center" style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--azul)', color: 'white', fontSize: '24px', fontWeight: 900 }}>
                                    {voiceName?.charAt(0)}
                                </div>
                                <div>
                                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)', letterSpacing: '-0.02em' }}>{voiceName}</div>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--azul)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--azul-light)', padding: '4px 10px', borderRadius: '100px', width: 'fit-content', marginTop: '4px' }}>Calidad HD Premium</div>
                                </div>
                            </div>
                        </div>

                        {/* STEP 5 SUMMARY: TOOLS */}
                        <div className="card-premium" style={{ padding: '32px' }}>
                            <div className="flex-between" style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div className="flex-center" style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#fff7ed', color: '#ea580c', fontSize: '20px' }}>
                                        <i className="bi bi-gear-fill"></i>
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Automatizaciones</h3>
                                        <span style={{ fontSize: '12px', color: 'var(--slate-400)', fontWeight: 600 }}>PASO 5</span>
                                    </div>
                                </div>
                                <button onClick={() => setStep(5)} className="btn-s" style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px' }}>Editar</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                <div style={{ border: '1px solid var(--slate-100)', padding: '16px', borderRadius: '16px', opacity: enableCalBooking ? 1 : 0.4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <i className="bi bi-calendar-check" style={{ color: 'var(--azul)' }}></i>
                                        <span style={{ fontWeight: 800, fontSize: '13px' }}>Agenda Citas</span>
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: enableCalBooking ? '#166534' : 'var(--slate-400)' }}>{enableCalBooking ? 'ACTIVADO' : 'DESACTIVADO'}</span>
                                </div>
                                <div style={{ border: '1px solid var(--slate-100)', padding: '16px', borderRadius: '16px', opacity: enableTransfer ? 1 : 0.4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <i className="bi bi-telephone-forward" style={{ color: '#ea580c' }}></i>
                                        <span style={{ fontWeight: 800, fontSize: '13px' }}>Transferencia</span>
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: enableTransfer ? '#166534' : 'var(--slate-400)' }}>{enableTransfer ? 'ACTIVADO' : 'DESACTIVADO'}</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: KNOWLEDGE BASE & DEPLOY */}
                    <div style={{ display: 'grid', gap: '24px', position: 'sticky', top: '40px' }}>
                        
                        {/* KNOWLEDGE BASE CARD */}
                        <div className="card-premium" style={{ padding: '32px' }}>
                            <h4 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 800, color: 'var(--slate-900)' }}>Conocimiento Pro</h4>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                style={{ 
                                    border: '2px dashed var(--slate-200)', borderRadius: '20px', padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
                                    background: '#f8fafc', transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--azul)'}
                                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--slate-200)'}
                            >
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} multiple />
                                <i className="bi bi-cloud-arrow-up-fill" style={{ fontSize: '32px', color: 'var(--azul)', marginBottom: '12px', display: 'block' }}></i>
                                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--slate-700)', display: 'block' }}>Subir Documentos</span>
                                <span style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '4px', display: 'block' }}>PDF, TXT para el cerebro IA</span>
                            </div>

                            {kbFiles.length > 0 && (
                                <div style={{ marginTop: '24px', display: 'grid', gap: '10px' }}>
                                    {kbFiles.map(f => (
                                        <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'white', borderRadius: '16px', border: '1px solid var(--slate-100)', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                                            <div className="flex-center" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--azul-light)', color: 'var(--azul)' }}>
                                                <i className="bi bi-file-earmark-text-fill"></i>
                                            </div>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                                            <button onClick={() => removeFile(f.id)} style={{ border: 'none', background: 'none', color: '#ef4444', opacity: 0.5, cursor: 'pointer' }}>
                                                <i className="bi bi-trash3"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* FINAL ACTIVATION CARD */}
                        <div className="card-premium" style={{ 
                            padding: '32px', background: 'var(--slate-900)', color: 'white', 
                            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.4)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <h4 style={{ margin: '0 0 24px 0', fontSize: '11px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Presupuesto Estimado</h4>
                            
                            <div style={{ display: 'grid', gap: '16px' }}>
                                <div className="flex-between">
                                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Tasa Mensual</span>
                                    <span style={{ fontWeight: 800 }}>€0.00</span>
                                </div>
                                <div className="flex-between">
                                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Coste/Minuto</span>
                                    <span style={{ fontWeight: 800 }}>€0.12</span>
                                </div>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }}></div>
                                <div className="flex-between">
                                    <span style={{ fontSize: '15px', fontWeight: 800 }}>Inversión Inicial</span>
                                    <span style={{ fontSize: '24px', fontWeight: 900, color: '#4ade80' }}>GRATIS</span>
                                </div>
                            </div>

                            <button 
                                onClick={handleCreateAgent}
                                disabled={isCreating}
                                className="btn-p"
                                style={{ 
                                    width: '100%', marginTop: '32px', height: '64px', borderRadius: '20px', 
                                    background: 'var(--azul)', color: 'white', fontWeight: 900, fontSize: '16px',
                                    boxShadow: '0 15px 30px -5px rgba(37, 99, 235, 0.4)',
                                    justifyContent: 'center', transition: 'all 0.3s'
                                }}
                            >
                                {isCreating ? 'SINCRONIZANDO...' : (editingAgentId ? 'GUARDAR AGENTE' : 'ACTIVAR AGENTE')}
                                {!isCreating && <i className="bi bi-lightning-charge-fill" style={{ marginLeft: '12px' }}></i>}
                            </button>
                            
                            <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '20px', margin: '20px 0 0 0', fontWeight: 600 }}>
                                Al activar, aceptas los términos de servicio de la Fábrica de Agentes IA.
                            </p>
                        </div>

                    </div>
                </div>

                {/* BOTTOM MODIFIER */}
                <div style={{ marginTop: '40px', borderTop: '1px solid var(--slate-100)', paddingTop: '40px' }}>
                    <button onClick={prevStep} className="btn-s" style={{ height: '56px', padding: '0 32px', borderRadius: '18px', fontWeight: 800 }}>
                        <i className="bi bi-arrow-left" style={{ marginRight: '12px' }}></i>
                        Regresar a Herramientas
                    </button>
                </div>
            </div>

            {/* ERROR TOAST */}
            {showError && (
                <div style={{ 
                    position: 'fixed', bottom: '40px', right: '40px', background: '#fff1f2', border: '1.5px solid #fecdd3', 
                    padding: '20px 32px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(225, 29, 72, 0.25)', 
                    display: 'flex', alignItems: 'center', gap: '20px', zIndex: 9999, animation: 'slideInRight 0.4s'
                }}>
                    <div className="flex-center" style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ef4444', color: 'white' }}>
                        <i className="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#9f1239' }}>Error de Configuración</div>
                        <div style={{ fontSize: '13px', color: '#e11d48', fontWeight: 600 }}>{errorMessage}</div>
                    </div>
                    <button onClick={() => setShowError(false)} style={{ background: 'none', border: 'none', color: '#e11d48', fontSize: '20px' }}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
            )}
            
            <style jsx>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
