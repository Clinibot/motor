"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';
import { createClient } from '../../../lib/supabase/client';

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

    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        const inputElement = e.target;
        inputElement.value = '';

        if (wizardData.kbFiles.length + files.length > 5) {
            setErrorMessage('Máximo 5 archivos permitidos en la base de conocimientos.');
            setShowError(true);
            return;
        }
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
                    setErrorMessage('Error al subir archivo ' + f.name + ': ' + data.error);
                    setShowError(true);
                }
            } catch {
                setErrorMessage('Error de conexión al subir archivo ' + f.name);
                setShowError(true);
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
        // No-op for now as examples logic was removed
    }, []);

    const editingAgentId = wizardData.editingAgentId;

    const getUpdatedPrompt = React.useCallback(() => {
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

        const finalPrompt = `
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
        wizardData.agentName, wizardData.companyName, wizardData.language,
        wizardData.businessHours, wizardData.personality, wizardData.tone, wizardData.customNotes,
        wizardData.companyAddress, wizardData.companyPhone, wizardData.companyWebsite, wizardData.companyDescription,
        wizardData.enableCalBooking, wizardData.calApiKey, wizardData.enableTransfer,
        wizardData.transferDestinations, wizardData.kbFiles
    ]);

    const handleCreateAgent = async () => {
        const finalGeneratedPrompt = getUpdatedPrompt();
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
            <div className="bg-white border border-[#e2e8f0] rounded-2xl mb-4 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all">
                <div 
                    onClick={() => toggleStep(step)} 
                    className={`flex items-center justify-between px-6 py-5 cursor-pointer transition-colors ${isExpanded ? 'bg-[#f8fafc]' : 'bg-white hover:bg-[#f8fafc]'}`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${color}15`, color: color }}>
                            <i className={`bi ${icon}`} style={{ fontSize: '18px' }}></i>
                        </div>
                        <div>
                            <div className="text-[15px] font-bold text-[#1e293b]">{label}</div>
                            <div className="text-[12px] text-[#94a3b8] font-semibold">Paso {step}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-5">
                        <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); setStep(step); }} 
                            className="bg-white border border-[#e2e8f0] rounded-lg px-4 py-1.5 text-[12px] font-bold text-[#64748b] hover:bg-[#f8fafc] transition-all flex items-center gap-2 shadow-sm"
                        >
                            <i className="bi bi-pencil text-[11px]"></i> Ir al paso
                        </button>
                        <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} text-[#94a3b8] text-[14px]`}></i>
                    </div>
                </div>
                {isExpanded && (
                    <div className="px-6 py-8 border-t border-[#f1f5f9] bg-white">
                        {children}
                    </div>
                )}
            </div>
        );
    };

    if (showSuccess) {
        return (
            <div className="content-area">
                <div className="form-card max-w-[800px] mx-auto bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-12 text-center">
                    <div className="w-20 h-20 bg-[#f0fdf4] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#dcfce7]">
                        <i className="bi bi-check-circle-fill text-[#10b981] text-[40px]" />
                    </div>
                    <h2 className="text-[24px] font-bold text-[#1e293b] mb-3">¡Agente IA {editingAgentId ? 'actualizado' : 'creado'} con éxito!</h2>
                    <p className="text-[15px] text-[#64748b] mb-10 max-w-[400px] mx-auto leading-relaxed">
                        Tu agente <strong>{wizardData.agentName}</strong> {editingAgentId ? 'se ha guardado correctamente' : 'está configurado y listo para empezar a trabajar'}.
                    </p>
                    <button 
                        className="bg-[#267ab0] text-white font-bold py-4 px-10 rounded-xl hover:bg-[#1e618b] transition-all shadow-md flex items-center gap-3 mx-auto text-[16px]"
                        onClick={() => window.location.href = '/dashboard/agents'}
                    >
                        <i className="bi bi-grid-fill" /> Ir al Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!mounted) return (
        <div className="content-area">
            <div className="form-card max-w-[800px] mx-auto bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-24 text-center">
                <div className="w-10 h-10 border-4 border-[#f3f3f3] border-t-[#267ab0] rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[#64748b] font-medium">Cargando resumen...</p>
            </div>
        </div>
    );

    return (
        <div className="content-area">
            <div className="form-card max-w-[800px] mx-auto bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-8">
                <WizardStepHeader 
                    title="Resumen y confirmación" 
                    subtitle="Revisa toda la configuración de tu agente. Puedes editar cualquier campo directamente o volver al paso correspondiente." 
                />

                <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 mb-8 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#10b981] flex items-center justify-center flex-shrink-0 border border-[#bbf7d0] shadow-sm">
                        <i className="bi bi-check-lg text-white text-[18px]" />
                    </div>
                    <div>
                        <div className="font-bold text-[15px] text-[#166534]">Configuración completada</div>
                        <div className="text-[13px] text-[#16a34a] mt-0.5">Todos los pasos están listos. Revisa y edita lo que necesites antes de crear el agente.</div>
                    </div>
                </div>

                {showError && (
                    <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-xl p-4 mb-8 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-[#e11d48] font-medium text-[14px]">
                            <i className="bi bi-exclamation-triangle-fill" />
                            <span>{errorMessage}</span>
                        </div>
                        <button onClick={() => setShowError(false)} className="text-[#e11d48] hover:bg-[#ffe4e6] w-8 h-8 rounded-lg flex items-center justify-center transition-all">
                            <i className="bi bi-x-lg text-[14px]"></i>
                        </button>
                    </div>
                )}

                <div className="space-y-4">
                    <SummarySection step={1} icon="bi-info-circle" color="#267ab0" label="Información básica">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[12px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Nombre</label>
                                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3.5 text-[15px] font-bold text-[#1e293b]">
                                    {wizardData.agentName || '—'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Empresa</label>
                                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3.5 text-[15px] font-bold text-[#1e293b]">
                                    {wizardData.companyName || '—'}
                                </div>
                            </div>
                        </div>
                    </SummarySection>

                    <SummarySection step={2} icon="bi-cpu" color="#8b5cf6" label="Modelo de IA y comportamiento">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[12px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Modelo IA</label>
                                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3.5 flex items-center gap-3">
                                    <i className="bi bi-cpu text-[#8b5cf6]"></i>
                                    <span className="text-[15px] font-bold text-[#1e293b]">{wizardData.model || '—'}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Temperatura</label>
                                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3.5 text-[15px] font-bold text-[#1e293b]">
                                    {wizardData.temperature || '0'}
                                </div>
                            </div>
                        </div>
                    </SummarySection>

                    <SummarySection step={3} icon="bi-mic" color="#10b981" label="Voz seleccionada">
                        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-6 flex items-center gap-5">
                            <div className="w-14 h-14 rounded-full bg-[#267ab0] flex items-center justify-center text-white font-extrabold text-[20px] shadow-sm">
                                {(wizardData.voiceName || 'V').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className="text-[17px] font-bold text-[#1e293b]">{wizardData.voiceName || 'Selecciona una voz'}</div>
                                <div className="text-[13px] text-[#64748b] mt-0.5">{wizardData.voiceProvider === 'eleven_labs' ? 'Eleven Labs' : 'Voz de sistema'} — Velocidad: {wizardData.voiceSpeed}x</div>
                            </div>
                        </div>
                    </SummarySection>

                    <SummarySection step={5} icon="bi-tools" color="#f43f5e" label="Herramientas activas">
                        <div className="space-y-3">
                            {[
                                { icon: 'bi-funnel-fill', color: '#267ab0', name: 'Cualificación de lead', active: wizardData.leadQuestions.length > 0 },
                                { icon: 'bi-telephone-forward', color: '#8b5cf6', name: 'Transferencia', active: wizardData.enableTransfer },
                                { icon: 'bi-calendar-event', color: '#f59e0b', name: 'Agenda (Cal.com)', active: wizardData.enableCalBooking },
                            ].map(tool => (
                                <div key={tool.name} className="flex items-center gap-4 p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${tool.color}15`, color: tool.color }}>
                                        <i className={`bi ${tool.icon}`} style={{ fontSize: '18px' }}></i>
                                    </div>
                                    <div className="flex-1 text-[14px] font-bold text-[#1e293b]">{tool.name}</div>
                                    <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border shadow-sm ${tool.active ? 'bg-[#f0fdf4] border-[#dcfce7] text-[#166534]' : 'bg-[#f1f5f9] border-[#e2e8f0] text-[#64748b]'}`}>
                                        {tool.active ? 'Activo' : 'Desactivado'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </SummarySection>
                </div>

                <div className="mt-12 mb-8">
                    <h3 className="text-[16px] font-bold text-[#1e293b] mb-4 flex items-center gap-2">
                        <i className="bi bi-book text-[#267ab0] text-[18px]"></i> Base de conocimiento
                    </h3>
                    
                    <div className="bg-white border-2 border-dashed border-[#e2e8f0] rounded-2xl p-10 text-center hover:border-[#267ab0] hover:bg-[#f8fafc] transition-all group">
                        <input 
                            type="file" 
                            id="kb-upload-summary" 
                            className="hidden" 
                            multiple 
                            accept=".md,.txt,.pdf,.docx" 
                            onChange={handleFileUpload} 
                        />
                        <label htmlFor="kb-upload-summary" className="cursor-pointer block">
                            <div className="w-16 h-16 rounded-full bg-[#f1f5f9] flex items-center justify-center mx-auto mb-4 group-hover:bg-[#eff6ff] transition-all">
                                <i className="bi bi-cloud-arrow-up text-[28px] text-[#94a3b8] group-hover:text-[#267ab0] transition-all"></i>
                            </div>
                            <div className="text-[16px] font-bold text-[#1e293b] mb-1">{isUploading ? 'Subiendo archivos...' : 'Subir documentos'}</div>
                            <p className="text-[13px] text-[#64748b]">Añade archivos para que tu agente tenga más información.</p>
                        </label>

                        {wizardData.kbFiles.length > 0 && (
                            <div className="mt-8 grid grid-cols-2 gap-3 text-left">
                                {wizardData.kbFiles.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white border border-[#e2e8f0] rounded-xl px-4 py-3 shadow-sm">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <i className="bi bi-file-earmark-text text-[#267ab0] flex-shrink-0"></i>
                                            <span className="text-[13px] font-medium text-[#1e293b] truncate">{f.name}</span>
                                        </div>
                                        <button onClick={() => removeFile(i)} className="text-[#94a3b8] hover:text-[#ef4444] p-1">
                                            <i className="bi bi-x-lg text-[14px]"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-10">
                    <button 
                        onClick={handleCreateAgent} 
                        disabled={isCreating} 
                        className="w-full bg-[#00a884] text-white py-4 px-8 rounded-xl font-bold text-[17px] hover:bg-[#008f70] transition-all shadow-[0_4px_14px_rgba(0,168,132,0.3)] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isCreating ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Procesando...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check2-circle text-[20px]"></i>
                                {editingAgentId ? 'Guardar cambios del agente' : 'Crear agente IA'}
                            </>
                        )}
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-[#f1f5f9]">
                    <button 
                        onClick={prevStep} 
                        className="bg-white border border-[#e2e8f0] rounded-xl px-6 py-2.5 text-[14px] font-bold text-[#64748b] hover:bg-[#f8fafc] transition-all flex items-center gap-2 shadow-sm"
                    >
                        <i className="bi bi-arrow-left"></i> Anterior
                    </button>
                </div>
            </div>
            <div className="h-10"></div>
        </div>
    );
};
