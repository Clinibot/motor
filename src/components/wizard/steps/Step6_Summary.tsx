"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';
import { createClient } from '../../../lib/supabase/client';

const PROMPT_NOTE_EXAMPLES = [
    "No menciones precios concretos. Si el usuario los solicita, indícale que recibirá un presupuesto personalizado.",
    "Si el usuario se muestra agresivo o usa lenguaje inapropiado, avisa una vez y finaliza la llamada si continúa.",
    "El horario de atención es de lunes a viernes de 9h a 18h. Los sábados no hay servicio.",
    "Si el usuario dice que está conduciendo, ofrécele llamarle en otro momento en lugar de continuar.",
    "Si el usuario ya es cliente, no le ofrezcas el descuento de bienvenida.",
    "Nunca confirmes ni desmientas información sobre pedidos sin haber verificado antes el número de referencia.",
    "Si el usuario pregunta por la competencia, redirige la conversación hacia las ventajas del servicio sin hacer comparativas.",
    "Si el usuario solicita hablar con un humano, indícale que alguien le llamará en un plazo máximo de 24 horas."
];

const S = {
    btnCreateAgent: {
        padding: '14px 20px',
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '14px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        background: '#10b981',
        color: 'white',
        transition: 'all 0.2s',
    } as React.CSSProperties,
};

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
    const { setStep, prevStep, updateField } = wizardData;

    const [mounted, setMounted] = useState(false);
    React.useEffect(() => { setMounted(true); }, []);

    const [isCreating, setIsCreating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [placeholderIndex, setPlaceholderIndex] = useState(0);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        const inputElement = e.target;
        inputElement.value = '';

        if (wizardData.kbFiles.length + files.length > 5) {
            setUploadError('Máximo 5 archivos permitidos en la base de conocimientos.');
            return;
        }
        setUploadError(null);
        setIsUploading(true);
        const newFiles = [...wizardData.kbFiles];

        for (const f of files) {
            const formData = new FormData();
            formData.append('file', f);
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const { data: user } = await supabase.from('users').select('workspace_id').eq('id', session.user.id).single();
                    if (user && user.workspace_id) {
                        formData.append('workspace_id', user.workspace_id);
                    }
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
                    setUploadError('Error al subir archivo ' + f.name + ': ' + data.error);
                }
            } catch {
                setUploadError('Error de conexión al subir archivo ' + f.name);
            }
        }
        updateField('kbFiles', newFiles);
        setIsUploading(false);
    };

    const removeFile = (index: number) => {
        const newFiles = [...wizardData.kbFiles];
        newFiles.splice(index, 1);
        updateField('kbFiles', newFiles);
    };

    React.useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % PROMPT_NOTE_EXAMPLES.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const editingAgentId = wizardData.editingAgentId;

    const getUpdatedPrompt = React.useCallback((forceRebuild = false) => {
        const name = wizardData.agentName || 'Elio';
        const company = wizardData.companyName || 'netelip';
        const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const formattedHours = groupBusinessHours(wizardData.businessHours);
        const personalityStr = wizardData.personality.length > 0
            ? `Tu personalidad es: ${wizardData.personality.join(', ')}.`
            : 'Tienes una personalidad profesional y atenta.';
        const toneStr = `Tu tono de comunicación es ${wizardData.tone}.`;
        const langMap: Record<string, string> = {
            'es-ES': 'español de España', 'es-MX': 'español con acento mexicano',
            'es-AR': 'español con acento argentino', 'es-419': 'español latinoamericano neutro',
            'en-US': 'inglés americano', 'en-GB': 'inglés británico',
            'pt-BR': 'portugués de Brasil', 'fr-FR': 'francés',
        };
        const langStr = langMap[wizardData.language] || 'español';

        const toolsContentArr: string[] = [];
        if (wizardData.enableCalBooking && wizardData.calApiKey) {
            toolsContentArr.push(`## Gestión de Agenda y Citas\nTienes acceso a la disponibilidad...`);
        }
        if (wizardData.enableTransfer && wizardData.transferDestinations.length > 0) {
            const transfers = wizardData.transferDestinations
                .map(d => `- Si el usuario ${d.description || 'quiere hablar con un compañero'}, ejecuta \`transfer_to_${d.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}\`.`)
                .join('\n');
            toolsContentArr.push(`## Transferencias\n${transfers}`);
        }

        const toolsSection = toolsContentArr.length > 0
            ? `\n\n<!-- AUTO_TOOLS_START -->\n# Herramientas\n${toolsContentArr.join('\n\n')}\n<!-- AUTO_TOOLS_END -->\n`
            : '';

        const kbSection = wizardData.kbFiles.length > 0
            ? `\n\n<!-- AUTO_KB_START -->\n# Base de Conocimientos\nTienes acceso a una base de conocimientos...\nBases de conocimiento disponibles:\n` + wizardData.kbFiles.map(f => `- ${f.retell_name || f.name}`).join('\n') + `\n<!-- AUTO_KB_END -->\n`
            : '';

        const companySection = `\n\n<!-- AUTO_COMPANY_START -->\n# Información de la Empresa\n${wizardData.companyDescription ? `- Actividad: ${wizardData.companyDescription}\n` : ''}- Dirección: ${wizardData.companyAddress || 'No especificada'}\n- Teléfono: ${formatPhoneForTTS(wizardData.companyPhone || '')}\n- Web: ${formatUrlForTTS(wizardData.companyWebsite || '')}\n\n## Horario comercial\n${formattedHours}\n<!-- AUTO_COMPANY_END -->\n`;

        let finalPrompt = `
# Rol y Objetivo
Eres ${name} y tu objetivo es atender a los clientes de ${company}.

# Estilo de Comunicación
- ${personalityStr}
- ${toneStr}
- Idioma: ${langStr}
- Fecha: ${today}

${toolsSection}
${kbSection}
${companySection}
${wizardData.customNotes ? `\n<!-- AUTO_NOTES_START -->\n# Notas\n${wizardData.customNotes}\n<!-- AUTO_NOTES_END -->` : ''}
`.trim();

        return finalPrompt;
    }, [
        wizardData.prompt, wizardData.agentName, wizardData.companyName, wizardData.agentType, wizardData.language,
        wizardData.businessHours, wizardData.personality, wizardData.tone, wizardData.customNotes,
        wizardData.companyAddress, wizardData.companyPhone, wizardData.companyWebsite, wizardData.companyDescription,
        wizardData.enableCalBooking, wizardData.calApiKey, wizardData.enableTransfer,
        wizardData.transferDestinations, wizardData.kbFiles, wizardData.kbUsageInstructions,
        wizardData.extractionVariables, wizardData.leadQuestions
    ]);

    const handleCreateAgent = async () => {
        const finalGeneratedPrompt = getUpdatedPrompt(false);
        const cleanedPrompt = cleanPromptForDeployment(finalGeneratedPrompt);

        const missing = [];
        if (!wizardData.agentName) missing.push('Nombre del agente');
        if (!wizardData.model) missing.push('Modelo LLM');
        if (!wizardData.voiceId) missing.push('Voz');

        if (missing.length > 0) {
            setErrorMessage(`Faltan campos obligatorios: ${missing.join(', ')}`);
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
            if (!response.ok || !data.success) throw new Error(data.error || 'Error al comunicarse con el servidor');
            setShowSuccess(true);
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : 'Error al crear el agente');
            setShowError(true);
        } finally {
            setIsCreating(false);
        }
    };

    const [expandedStep, setExpandedStep] = useState<number | null>(1);
    const toggleStep = (step: number) => setExpandedStep(expandedStep === step ? null : step);

    const SummarySection = ({ step, icon, color, label, children }: { step: number; icon: string; color: string; label: string; children: React.ReactNode }) => {
        const isExpanded = expandedStep === step;
        return (
            <div style={{ background: 'white', border: '1px solid #edf2f7', borderRadius: '14px', marginBottom: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div onClick={() => toggleStep(step)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer', background: isExpanded ? '#f8fafc' : 'white', transition: 'background 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className={`bi ${icon}`} style={{ color, fontSize: '16px' }}></i>
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{label}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Paso {step}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setStep(step); }} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', color: '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="bi bi-pencil" style={{ fontSize: '11px' }}></i> Ir al paso
                        </button>
                        <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '14px' }}></i>
                    </div>
                </div>
                {isExpanded && <div style={{ padding: '20px', borderTop: '1px solid #edf2f7', background: 'white' }}>{children}</div>}
            </div>
        );
    };

    if (showSuccess) {
        return (
            <div className="content-area">
                <div className="form-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
                    <div style={{ width: '80px', height: '80px', background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <i className="bi bi-check-circle-fill" style={{ fontSize: '48px', color: '#10b981' }} />
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a2428', marginBottom: '12px' }}>¡Agente IA {editingAgentId ? 'actualizado' : 'creado'} con éxito!</h2>
                    <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '28px' }}>Tu agente <strong>{wizardData.agentName}</strong> {editingAgentId ? 'se ha guardado correctamente' : 'está configurado y listo para usar'}.</p>
                    <button style={{ ...S.btnCreateAgent, padding: '14px 32px', fontSize: '15px', margin: '0 auto', borderRadius: '12px' }} onClick={() => window.location.href = '/dashboard/agents'}>
                        <i className="bi bi-grid-fill" /> Ir al Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!mounted) return (
        <div className="content-area">
            <div className="form-card" style={{ textAlign: 'center', padding: '100px 40px' }}>
                <div role="status" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #267ab0', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
                <p style={{ color: '#6c757d', fontSize: '16px' }}>Cargando resumen...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );

    return (
        <div className="content-area">
            <div className="form-card">
                <WizardStepHeader title="Resumen y confirmación" subtitle="Revisa toda la configuración de tu agente. Puedes editar cualquier campo directamente o volver al paso correspondiente." />

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="bi bi-check-lg" style={{ fontSize: '18px', color: 'white' }} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#166534' }}>Configuración completada</div>
                        <div style={{ fontSize: '13px', color: '#16a34a', marginTop: '2px' }}>Todos los pasos están listos. Revisa y edita lo que necesites antes de crear el agente.</div>
                    </div>
                </div>

                {showError && (
                    <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: 500 }}><i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '8px' }} />{errorMessage}</span>
                        <button onClick={() => setShowError(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#ef4444', lineHeight: 1 }}>×</button>
                    </div>
                )}

                <SummarySection step={1} icon="bi-info-circle" color="#267ab0" label="Información básica">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>Nombre</label>
                            <input readOnly type="text" className="form-control" value={wizardData.agentName || '—'} style={{ background: '#f8fafc', color: '#1e293b', fontWeight: 600 }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>Empresa</label>
                            <input readOnly type="text" className="form-control" value={wizardData.companyName || '—'} style={{ background: '#f8fafc', color: '#1e293b', fontWeight: 600 }} />
                        </div>
                    </div>
                </SummarySection>

                <SummarySection step={2} icon="bi-cpu" color="#8b5cf6" label="Modelo de IA y comportamiento">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>Modelo IA</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <i className="bi bi-cpu" style={{ color: '#8b5cf6' }}></i>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{wizardData.model || '—'}</span>
                            </div>
                        </div>
                    </div>
                </SummarySection>

                <SummarySection step={3} icon="bi-mic" color="#10b981" label="Voz seleccionada">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc', borderRadius: '16px', padding: '16px 20px', border: '1px solid #e2e8f0' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#267ab0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '18px' }}>{(wizardData.voiceName || 'V').charAt(0)}</div>
                        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>{wizardData.voiceName || 'Selecciona una voz'}</div></div>
                    </div>
                </SummarySection>

                <SummarySection step={5} icon="bi-tools" color="#f43f5e" label="Herramientas activas">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            { icon: 'bi-funnel-fill', color: '#267ab0', name: 'Cualificación de lead', active: true },
                            { icon: 'bi-telephone-forward', color: '#8b5cf6', name: 'Transferencia', active: wizardData.enableTransfer },
                        ].map(tool => (
                            <div key={tool.name} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${tool.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className={`bi ${tool.icon}`} style={{ color: tool.color }}></i>
                                </div>
                                <div style={{ flex: 1, fontSize: '14px', fontWeight: 700 }}>{tool.name}</div>
                                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 12px', borderRadius: '20px', background: tool.active ? '#f0fdf4' : '#f1f5f9', color: tool.active ? '#166534' : '#64748b' }}>{tool.active ? 'Activo' : 'Desactivado'}</span>
                            </div>
                        ))}
                    </div>
                </SummarySection>

                <div style={{ marginTop: '32px', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><i className="bi bi-book" style={{ color: '#267ab0' }}></i> Base de conocimiento</h3>
                    <div style={{ background: 'white', border: '1.5px dashed #e2e8f0', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
                        <input type="file" id="kb-upload-summary" style={{ display: 'none' }} multiple accept=".md,.txt,.pdf,.docx" onChange={handleFileUpload} />
                        <label htmlFor="kb-upload-summary" style={{ cursor: 'pointer' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#eff6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><i className="bi bi-cloud-arrow-up" style={{ fontSize: '24px', color: '#267ab0' }}></i></div>
                            <div style={{ fontSize: '15px', fontWeight: 700 }}>{isUploading ? 'Subiendo...' : 'Subir documentos'}</div>
                        </label>
                    </div>
                </div>

                <div style={{ marginTop: '40px' }}>
                    <button onClick={handleCreateAgent} disabled={isCreating} style={{ width: '100%', padding: '16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
                        {isCreating ? 'Procesando...' : (editingAgentId ? 'Guardar Cambios' : 'Crear agente IA')}
                    </button>
                </div>

                <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #edf2f7' }}>
                    <button onClick={prevStep} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <i className="bi bi-arrow-left"></i> Anterior
                    </button>
                </div>
            </div>
            <div style={{ height: '40px' }}></div>
        </div>
    );
};
