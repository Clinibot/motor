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

    const removeFile = (index: number) => {
        const newFiles = [...wizardData.kbFiles];
        newFiles.splice(index, 1);
        updateField('kbFiles', newFiles);
    };

    const editingAgentId = wizardData.editingAgentId;

    const getUpdatedPrompt = React.useCallback(() => {
        const name = wizardData.agentName || 'Elio';
        const company = wizardData.companyName || 'netelip';
        const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const formattedHours = groupBusinessHours(wizardData.businessHours);
        const personalityStr = wizardData.personality.length > 0
            ? `Tu personalidad es: ${wizardData.personality.join(', ')}.`
            : 'Tienes una personalidad profesional, empática y atenta.';
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
            let calInstructions = `## Gestión de Agenda y Citas\nTienes acceso a la disponibilidad de la agenda de ${company} para agendar citas directamente.`;
            
            if (wizardData.enableCalCancellation) {
                calInstructions += `\n- **Cancelaciones y Reagendados**: Tienes permiso para cancelar citas existentes. Si un usuario desea cambiar o reagendar su cita, es obligatorio que primero canceles la cita actual usando la herramienta de cancelación y luego agendes la nueva.`;
            } else {
                calInstructions += `\n- **Cancelaciones**: No tienes permiso para cancelar citas. Si el usuario lo solicita, indícale que debe hacerlo manualmente.`;
            }
            
            toolsContentArr.push(calInstructions);
        }
        if (wizardData.enableTransfer && wizardData.transferDestinations.length > 0) {
            const transfers = wizardData.transferDestinations
                .map(d => `- Si el usuario ${d.description || 'quiere hablar con un compañero'}, ejecuta \`transfer_to_${d.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}\`.`)
                .join('\n');
            toolsContentArr.push(`## Transferencias\n${transfers}`);
        }

        const toolsSection = toolsContentArr.length > 0
            ? `\n\n<!-- AUTO_TOOLS_START -->\n# Capabilidades y Herramientas\n${toolsContentArr.join('\n\n')}\n<!-- AUTO_TOOLS_END -->\n`
            : '';

        const kbSection = wizardData.kbFiles.length > 0
            ? `\n\n<!-- AUTO_KB_START -->\n# Base de Conocimientos Corporativa\nTienes acceso a documentos internos para responder con precisión.\nRecursos disponibles:\n` + wizardData.kbFiles.map(f => `- ${f.retell_name || f.name}`).join('\n') + `\n<!-- AUTO_KB_END -->\n`
            : '';

        const companySection = `\n\n<!-- AUTO_COMPANY_START -->\n# Ficha de Empresa\n${wizardData.companyDescription ? `- Actividad: ${wizardData.companyDescription}\n` : ''}- Dirección: ${wizardData.companyAddress || 'No especificada'}\n- Teléfono: ${formatPhoneForTTS(wizardData.companyPhone || '')}\n- Web: ${formatUrlForTTS(wizardData.companyWebsite || '')}\n\n## Horario de Atención\n${formattedHours}\n<!-- AUTO_COMPANY_END -->\n`;

        return `
# Perfil y Misión
Eres ${name}, representante inteligente de ${company}. Tu misión es proporcionar una experiencia excepcional al cliente.

# Estilo y Configuración
- Personalidad: ${personalityStr}
- Tono: ${toneStr}
- Idioma Operativo: ${langStr}
- Fecha Actual: ${today}

${toolsSection}
${kbSection}
${companySection}
${wizardData.customNotes ? `\n<!-- AUTO_NOTES_START -->\n# Contexto Adicional\n${wizardData.customNotes}\n<!-- AUTO_NOTES_END -->` : ''}
`.trim();
    }, [
        wizardData.agentName, wizardData.companyName, wizardData.language,
        wizardData.businessHours, wizardData.personality, wizardData.tone, wizardData.customNotes,
        wizardData.companyAddress, wizardData.companyPhone, wizardData.companyWebsite, wizardData.companyDescription,
        wizardData.enableCalBooking, wizardData.calApiKey, wizardData.enableCalCancellation, wizardData.enableTransfer,
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
            setErrorMessage(`Faltan campos críticos: ${missing.join(', ')}`);
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
            if (!response.ok || !data.success) throw new Error(data.error || 'Error en la respuesta del servidor');
            setShowSuccess(true);
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : 'Error inesperado al procesar el agente');
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
            <div className={`bg-white border transition-all duration-300 rounded-2xl overflow-hidden shadow-sm hover:shadow-md ${isExpanded ? 'border-[var(--azul)]/30' : 'border-[var(--gris-borde)]'}`}>
                <div 
                    onClick={() => toggleStep(step)} 
                    className={`flex items-center justify-between px-6 py-5 cursor-pointer transition-colors ${isExpanded ? 'bg-[var(--azul)]/5' : 'bg-white hover:bg-[#f8fafc]'}`}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15`, color: color }}>
                            <i className={`bi ${icon} text-[18px]`}></i>
                        </div>
                        <div>
                            <div className="text-[15px] font-bold text-[var(--oscuro)]">{label}</div>
                            <div className="text-[12px] text-[var(--gris-texto)] font-semibold uppercase tracking-wider">Paso {step}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-5">
                        <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); setStep(step); }} 
                            className="bg-white border border-[var(--gris-borde)] rounded-lg px-4 py-1.5 text-[12px] font-bold text-[var(--gris-texto)] hover:bg-[var(--azul)] hover:text-white hover:border-[var(--azul)] transition-all flex items-center gap-2 shadow-sm active:scale-95"
                        >
                            <i className="bi bi-pencil text-[11px]"></i> Editar
                        </button>
                        <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} text-[var(--gris-texto)] text-[14px]`}></i>
                    </div>
                </div>
                {isExpanded && (
                    <div className="px-6 py-8 border-t border-[var(--gris-borde)] bg-white animate-in slide-in-from-top-2 duration-300">
                        {children}
                    </div>
                )}
            </div>
        );
    };

    if (showSuccess) {
        return (
            <div className="max-w-2xl mx-auto py-12 px-4">
                <div className="form-card text-center p-12">
                    <div className="w-24 h-24 bg-[#f0fdf4] rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm border border-[#dcfce7] animate-bounce">
                        <i className="bi bi-check-circle-fill text-[#10b981] text-[48px]" />
                    </div>
                    <h2 className="text-[28px] font-bold text-[var(--oscuro)] mb-4">¡Agente IA listo!</h2>
                    <p className="text-[16px] text-[var(--gris-texto)] mb-10 max-w-sm mx-auto leading-relaxed">
                        Tu agente <strong>{wizardData.agentName}</strong> se ha guardado correctamente y ya puede empezar a trabajar.
                    </p>
                    <button 
                        className="btn-p w-full justify-center py-4 text-[16px] shadow-xl shadow-[var(--azul)]/20"
                        onClick={() => window.location.href = '/dashboard/agents'}
                    >
                        <i className="bi bi-grid-fill" /> Ir al Panel de Agentes
                    </button>
                </div>
            </div>
        );
    }

    if (!mounted) return (
        <div className="content-area">
            <div className="form-card py-24 text-center">
                <div className="w-12 h-12 border-4 border-[var(--azul)]/20 border-t-[var(--azul)] rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-[var(--gris-texto)] font-bold">Generando resumen final...</p>
            </div>
        </div>
    );

    return (
        <div className="content-area">
            <div className="form-card p-8">
                <WizardStepHeader 
                    title="Resumen Final" 
                    subtitle="Confirma la identidad y comportamiento de tu nuevo agente antes de activarlo." 
                />

                <div className="bg-[#eff6ff] border border-[var(--azul)]/10 rounded-2xl p-5 mb-10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--azul)] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[var(--azul)]/20">
                        <i className="bi bi-shield-check text-white text-[18px]" />
                    </div>
                    <div>
                        <div className="font-bold text-[15px] text-[#1e40af]">Todo listo para el despliegue</div>
                        <div className="text-[13px] text-[#2563eb] mt-0.5">Revisa las secciones desplegables. Hemos unificado tu configuración para maximizar el rendimiento del agente.</div>
                    </div>
                </div>

                {showError && (
                    <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-2xl p-5 mb-10 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-3 text-[#e11d48] font-bold text-[14px]">
                            <i className="bi bi-exclamation-octagon-fill text-[20px]" />
                            <span>{errorMessage}</span>
                        </div>
                        <button onClick={() => setShowError(false)} className="w-9 h-9 rounded-xl flex items-center justify-center text-[#e11d48] hover:bg-[#ef4444]/10 transition-all">
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                )}

                <div className="space-y-6">
                    <SummarySection step={1} icon="bi-person-badge" color="var(--azul)" label="Perfil de Identidad">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="lbl">Nombre del Agente</label>
                                <div className="bg-[#f8fafc] border border-[var(--gris-borde)] rounded-xl px-5 py-4 text-[15px] font-bold text-[var(--oscuro)] flex items-center gap-3">
                                    <i className="bi bi-tag text-[var(--azul)]"></i>
                                    {wizardData.agentName || '—'}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="lbl">Empresa Representada</label>
                                <div className="bg-[#f8fafc] border border-[var(--gris-borde)] rounded-xl px-5 py-4 text-[15px] font-bold text-[var(--oscuro)] flex items-center gap-3">
                                    <i className="bi bi-building text-[var(--azul)]"></i>
                                    {wizardData.companyName || '—'}
                                </div>
                            </div>
                        </div>
                    </SummarySection>

                    <SummarySection step={2} icon="bi-brain" color="#8b5cf6" label="Inteligencia y Personalidad">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="lbl">Arquitectura LLM</label>
                                <div className="bg-[#f8fafc] border border-[var(--gris-borde)] rounded-xl px-4 py-3.5 flex items-center gap-3">
                                    <i className="bi bi-cpu text-[#8b5cf6]"></i>
                                    <span className="text-[14px] font-bold text-[var(--oscuro)]">{wizardData.model || '—'}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="lbl">Creatividad (Temp)</label>
                                <div className="bg-[#f8fafc] border border-[var(--gris-borde)] rounded-xl px-4 py-3.5 text-[14px] font-bold text-[var(--oscuro)]">
                                    {wizardData.temperature || '0.0'}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="lbl">Tono de Voz</label>
                                <div className="bg-[#f8fafc] border border-[var(--gris-borde)] rounded-xl px-4 py-3.5 text-[14px] font-bold text-[var(--oscuro)] capitalize">
                                    {wizardData.tone || 'Profesional'}
                                </div>
                            </div>
                        </div>
                        {wizardData.personality.length > 0 && (
                            <div className="mt-8 pt-8 border-t border-[var(--gris-borde)]">
                                <label className="lbl">Rasgos de Carácter</label>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {wizardData.personality.map(p => (
                                        <span key={p} className="bg-[#f3f0ff] text-[#6d28d9] px-4 py-2 rounded-xl text-[12px] font-bold border border-[#ddd6fe]">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </SummarySection>

                    <SummarySection step={3} icon="bi-waveform" color="#10b981" label="Voz y Lenguaje">
                        <div className="flex items-center gap-6 p-6 bg-[#f0fdf4] border border-[#bbf7d0] rounded-[24px]">
                            <div className="w-16 h-16 rounded-2xl bg-[var(--azul)] flex items-center justify-center text-white text-[24px] font-black shadow-xl shadow-[var(--azul)]/20 bounce-in">
                                {(wizardData.voiceName || 'V').charAt(0)}
                            </div>
                            <div className="flex-1">
                                <div className="text-[18px] font-bold text-[var(--oscuro)]">{wizardData.voiceName || 'Configurada'}</div>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-2 text-[13px] text-[#059669] font-medium bg-white px-3 py-1 rounded-full shadow-sm">
                                        <i className="bi bi-translate"></i> {wizardData.language}
                                    </div>
                                    <div className="flex items-center gap-2 text-[13px] text-[#059669] font-medium bg-white px-3 py-1 rounded-full shadow-sm">
                                        <i className="bi bi-speedometer2"></i> {wizardData.voiceSpeed}x velocidad
                                    </div>
                                </div>
                            </div>
                            <div className="hidden md:block px-6 border-l border-[#bbf7d0]">
                                <div className="text-[11px] font-bold text-[#059669] uppercase tracking-widest mb-1">Motor</div>
                                <div className="text-[14px] font-bold text-[var(--oscuro)]">{wizardData.voiceProvider === 'eleven_labs' ? 'Eleven Labs' : 'Neural System'}</div>
                            </div>
                        </div>
                    </SummarySection>

                    <SummarySection step={5} icon="bi-grid-1x2" color="#f43f5e" label="Integraciones y Webhooks">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { icon: 'bi-check2-square', color: 'var(--azul)', name: 'Cualificación', active: wizardData.leadQuestions.length > 0 },
                                { icon: 'bi-telephone-forward', color: '#8b5cf6', name: 'Transferencia', active: wizardData.enableTransfer },
                                { icon: 'bi-calendar2-check', color: '#f59e0b', name: 'Agenda Cal.com', active: wizardData.enableCalBooking },
                            ].map(tool => (
                                <div key={tool.name} className={`flex flex-col gap-4 p-5 rounded-2xl border transition-all ${tool.active ? 'bg-white border-[var(--azul)]/20 shadow-sm' : 'bg-[#f8fafc] border-[var(--gris-borde)] opacity-60'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${tool.color}15`, color: tool.color }}>
                                            <i className={`bi ${tool.icon} text-[20px]`}></i>
                                        </div>
                                        <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${tool.active ? 'bg-[#f0fdf4] text-[#166534] border-[#dcfce7]' : 'bg-[#f1f5f9] text-[var(--gris-texto)] border-[var(--gris-borde)]'}`}>
                                            {tool.active ? 'ACTIVO' : 'NO'}
                                        </div>
                                    </div>
                                    <div className="text-[14px] font-bold text-[var(--oscuro)]">{tool.name}</div>
                                </div>
                            ))}
                        </div>
                    </SummarySection>
                </div>

                <div className="mt-16 mb-10 text-center relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-[var(--gris-borde)]"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white px-6 text-[13px] font-bold text-[var(--gris-texto)] uppercase tracking-[4px]">Base de Conocimientos</span>
                    </div>
                </div>
                
                <div className={`bg-white border-2 border-dashed rounded-[32px] p-12 text-center transition-all group overflow-hidden relative ${isUploading ? 'border-[var(--azul)] bg-[var(--azul)]/5' : 'border-[var(--gris-borde)] hover:border-[var(--azul)]/40 hover:bg-[#f8fafc]'}`}>
                    <input 
                        type="file" 
                        id="kb-upload-summary" 
                        className="hidden" 
                        multiple 
                        accept=".md,.txt,.pdf,.docx" 
                        onChange={handleFileUpload} 
                        disabled={isUploading}
                    />
                    <label htmlFor="kb-upload-summary" className={`${isUploading ? 'cursor-wait' : 'cursor-pointer'} block`}>
                        <div className={`w-20 h-20 rounded-[24px] flex items-center justify-center mx-auto mb-6 transition-all shadow-sm ${isUploading ? 'bg-[var(--azul)] animate-pulse' : 'bg-[#f1f5f9] group-hover:bg-[var(--azul)]/10'}`}>
                            {isUploading ? (
                                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <i className="bi bi-cloud-arrow-up text-[32px] text-[var(--gris-texto)] group-hover:text-[var(--azul)] transition-all"></i>
                            )}
                        </div>
                        <h3 className="text-[18px] font-bold text-[var(--oscuro)] mb-2">{isUploading ? 'Procesando documentos...' : 'Enriquece su conocimiento'}</h3>
                        <p className="text-[14px] text-[var(--gris-texto)] max-w-sm mx-auto leading-relaxed">Arrastra o selecciona archivos PDF, TXT o MD para que tu agente responda con datos corporativos precisos.</p>
                    </label>

                    {wizardData.kbFiles.length > 0 && (
                        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left animate-in fade-in slide-in-from-bottom-4">
                            {wizardData.kbFiles.map((f, i) => (
                                <div key={i} className="flex items-center justify-between bg-white border border-[var(--gris-borde)] rounded-2xl px-5 py-4 shadow-sm hover:border-[var(--azul)]/30 transition-all group/item">
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <div className="w-9 h-9 rounded-xl bg-[var(--azul)]/5 flex items-center justify-center text-[var(--azul)]">
                                            <i className="bi bi-file-earmark-text text-[18px]"></i>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-bold text-[var(--oscuro)] truncate max-w-[150px]">{f.name}</span>
                                            <span className="text-[10px] text-[var(--gris-texto)] uppercase font-bold">Documento Activo</span>
                                        </div>
                                    </div>
                                    <button onClick={() => removeFile(i)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--gris-texto)] hover:bg-[#ef4444]/10 hover:text-[#ef4444] transition-all opacity-0 group-hover/item:opacity-100">
                                        <i className="bi bi-trash3 text-[14px]"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="wiz-footer mt-16 bg-[#f8fafc] -mx-8 -mb-8 p-10 rounded-b-2xl border-t border-[var(--gris-borde)] flex items-center gap-6">
                    <button 
                        onClick={prevStep} 
                        className="btn-s shrink-0"
                    >
                        <i className="bi bi-arrow-left"></i> Modificar pasos
                    </button>
                    
                    <button 
                        onClick={handleCreateAgent} 
                        disabled={isCreating} 
                        className="btn-p flex-1 justify-center py-5 text-[18px] shadow-2xl shadow-[var(--azul)]/30 active:scale-95 disabled:grayscale"
                    >
                        {isCreating ? (
                            <>
                                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Iniciando Despliegue...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-rocket-takeoff-fill text-[20px]"></i>
                                {editingAgentId ? 'Confirmar y Guardar Cambios' : 'Activar Agente de Voz'}
                            </>
                        )}
                    </button>
                </div>
            </div>
            <div className="h-12"></div>
        </div>
    );
};
