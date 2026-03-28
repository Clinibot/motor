"use client";

import React, { useState, useEffect } from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';
import { createClient } from '../../../lib/supabase/client';

interface AvailableAgent {
    id: string;
    name: string;
    retell_agent_id: string | null;
}

// Toggle switch component
const ToggleSwitch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; id: string }> = ({ checked, onChange, id }) => (
    <label htmlFor={id} className="relative inline-block w-11 h-6 cursor-pointer flex-shrink-0">
        <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} className="opacity-0 w-0 h-0" />
        <span className={`absolute inset-0 rounded-full transition-colors duration-200 ${checked ? 'bg-[#00a884]' : 'bg-[#cbd5e1]'}`}>
            <span className={`absolute bg-white rounded-full w-[18px] h-[18px] top-[3px] transition-all duration-200 shadow-sm ${checked ? 'left-[calc(100%-21px)]' : 'left-[3px]'}`} />
        </span>
    </label>
);

export const Step5_Tools: React.FC = () => {
    const {
        enableCalBooking, calUrl, calApiKey, calEventId, calSearchDays,
        enableTransfer, transferDestinations,
        extractionVariables, leadQuestions, enableAnalysis,
        updateField, prevStep, nextStep, editingAgentId, agentName
    } = useWizardStore();

    const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
    const [isLoadingAgents, setIsLoadingAgents] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchAgents = async () => {
            setIsLoadingAgents(true);
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const { data: profile } = await supabase
                    .from('users')
                    .select('workspace_id')
                    .eq('id', session.user.id)
                    .single();

                if (profile?.workspace_id) {
                    const { data: agentList } = await supabase
                        .from('agents')
                        .select('id, name, retell_agent_id')
                        .eq('workspace_id', profile.workspace_id)
                        .not('retell_agent_id', 'is', null)
                        .order('name', { ascending: true });

                    const filteredList = (agentList || []).filter(a => {
                        const isSelfById = editingAgentId ? a.id === editingAgentId : false;
                        const isSelfByName = a.name.toLowerCase() === agentName.toLowerCase();
                        return !isSelfById && !isSelfByName;
                    });
                    setAvailableAgents(filteredList);
                }
            } catch (error) {
                console.error("Error fetching agents for transfer:", error);
            } finally {
                setIsLoadingAgents(false);
            }
        };

        if (enableTransfer) {
            fetchAgents();
        }
    }, [enableTransfer, editingAgentId, agentName]);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (enableCalBooking) {
            if (!calApiKey) newErrors.calApiKey = 'La API Key de Cal.com es obligatoria.';
            if (!calEventId) newErrors.calEventId = 'El ID de evento es obligatorio.';
        }

        if (enableTransfer) {
            if (transferDestinations.length === 0) {
                newErrors.transfer = 'Debes añadir al menos un destino de transferencia si la función está activa.';
            } else {
                transferDestinations.forEach((dest, idx) => {
                    if (!dest.name.trim()) newErrors[`transfer_${idx}_name`] = 'Obligatorio';
                    if (dest.destination_type === 'number' && !dest.number?.trim()) {
                        newErrors[`transfer_${idx}_number`] = 'Obligatorio';
                    }
                    if (dest.destination_type === 'agent' && !dest.agentId) {
                        newErrors[`transfer_${idx}_agent`] = 'Obligatorio';
                    }
                });
            }
        }

        extractionVariables.forEach((v, idx) => {
            if (!v.name.trim()) newErrors[`extraction_${idx}_name`] = 'Obligatorio';
        });

        // For lead questions, enable setting validation only if there's at least one question added
        // Actually, no strict validation needed as per prototype.

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            nextStep();
        }
    };

    const addTransfer = () => {
        updateField('transferDestinations', [...transferDestinations, {
            name: '',
            description: '',
            number: '',
            destination_type: 'number',
            transfer_mode: 'cold'
        }]);
    };

    const addVariable = (type: string = 'string') => {
        updateField('extractionVariables', [...extractionVariables, { name: '', type, description: '', required: true }]);
    };

    const addLeadQuestion = () => {
        if (leadQuestions.length >= 3) return;
        updateField('leadQuestions', [...leadQuestions, { question: '', key: '', failAction: 'end_call' } as any]);
    };

    return (
        <div className="content-area">
            <div className="form-card max-w-[800px] mx-auto bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-8">
                <WizardStepHeader
                    title="Herramientas del agente"
                    subtitle="Activa las acciones que tu agente puede realizar durante las llamadas."
                />

                <form onSubmit={handleNext} className="mt-8 space-y-6">

                    {/* 1. CUALIFICACIÓN */}
                    <div className={`border rounded-2xl p-6 ${leadQuestions.length > 0 || true ? 'border-[#e2e8f0]' : 'border-[#e2e8f0]'}`}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div className={`w-6 h-6 rounded flex items-center justify-center mt-0.5 text-white ${leadQuestions.length > 0 ? 'bg-[#267ab0]' : 'bg-[#e2e8f0] text-[#94a3b8]'}`}>
                                    {leadQuestions.length > 0 ? <i className="bi bi-check2"></i> : <i className="bi bi-dash"></i>}
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-bold text-[#1e293b]">Cualificar contacto antes de actuar</h3>
                                    <p className="text-[14px] text-[#64748b] mt-1">Filtra leads automáticamente según tus criterios antes de agendar o transferir</p>
                                </div>
                            </div>
                            <ToggleSwitch
                                checked={leadQuestions.length > 0}
                                onChange={(val) => {
                                    if (val && leadQuestions.length === 0) addLeadQuestion();
                                    else if (!val) updateField('leadQuestions', []);
                                }}
                                id="qualifyToggle"
                            />
                        </div>

                        {leadQuestions.length > 0 && (
                            <div className="mt-8 pl-10 border-t border-[#f1f5f9] pt-6">
                                <h4 className="text-[12px] font-bold text-[#64748b] tracking-wider uppercase mb-2">Preguntas de cualificación</h4>
                                <p className="text-[14px] text-[#475569] mb-4">Define hasta 3 preguntas que el agente hará al contacto. Cada una tiene un criterio: si no lo cumple, la llamada termina o se redirige.</p>
                                
                                <div className="bg-[#fffbeb] border border-[#fde68a] rounded-lg p-3 flex gap-3 items-start mb-6">
                                    <i className="bi bi-exclamation-triangle-fill text-[#d97706] mt-0.5"></i>
                                    <span className="text-[13px] text-[#92400e]"><strong>Máximo 3 preguntas.</strong> En voz, más preguntas aumentan el abandono de la llamada.</span>
                                </div>

                                <div className="text-right text-[12px] text-[#64748b] font-medium mb-4">
                                    {leadQuestions.length} / 3 preguntas
                                </div>

                                {leadQuestions.map((q: any, idx) => (
                                    <div key={idx} className="bg-white border border-[#e2e8f0] rounded-xl p-5 mb-4 shadow-sm relative group">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="px-3 py-1 bg-[#f0f9ff] text-[#0284c7] text-[12px] font-bold rounded-full border border-[#bae6fd]">
                                                Pregunta {idx + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updated = leadQuestions.filter((_, i) => i !== idx);
                                                    updateField('leadQuestions', updated);
                                                }}
                                                className="text-[#ef4444] bg-[#fef2f2] hover:bg-[#fee2e2] w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                            >
                                                <i className="bi bi-trash3"></i>
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[13px] font-bold text-[#1e293b] mb-1">
                                                    ¿Qué pregunta hará el agente? <span className="text-[#ef4444]">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#267ab0]"
                                                    placeholder="Ej: ¿Tienen un presupuesto mensual definido para este servicio?"
                                                    value={q.question}
                                                    onChange={e => {
                                                        const updated = [...leadQuestions] as any[];
                                                        updated[idx].question = e.target.value;
                                                        updateField('leadQuestions', updated);
                                                    }}
                                                />
                                                <p className="text-[12px] text-[#64748b] mt-1">Escríbela tal como la diría el agente en voz alta.</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[13px] font-bold text-[#1e293b] mb-1">
                                                        Cualifica si... <span className="text-[#ef4444]">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#267ab0]"
                                                        placeholder="Ej: Menciona cualquier cifra o rango concreto"
                                                        value={q.key}
                                                        onChange={e => {
                                                            const updated = [...leadQuestions] as any[];
                                                            if (!updated[idx]) return;
                                                            updated[idx].key = e.target.value;
                                                            updateField('leadQuestions', updated);
                                                        }}
                                                    />
                                                    <p className="text-[12px] text-[#64748b] mt-1">Describe qué respuesta indica interés real.</p>
                                                </div>
                                                <div>
                                                    <label className="block text-[13px] font-bold text-[#1e293b] mb-1">
                                                        Si no cualifica
                                                    </label>
                                                    <select
                                                        className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#267ab0] bg-white appearance-none"
                                                        value={q.failAction || 'end_call'}
                                                        onChange={e => {
                                                            const updated = [...leadQuestions] as any[];
                                                            if (!updated[idx]) return;
                                                            updated[idx].failAction = e.target.value;
                                                            updateField('leadQuestions', updated);
                                                        }}
                                                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'currentColor\' class=\'bi bi-chevron-down\' viewBox=\'0 0 16 16\'%3E%3Cpath fill-rule=\'evenodd\' d=\'M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                                                    >
                                                        <option value="end_call">Terminar llamada amablemente</option>
                                                        <option value="transfer">Transferir a un humano</option>
                                                    </select>
                                                    <p className="text-[12px] text-[#64748b] mt-1">Acción si la respuesta no es válida.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {leadQuestions.length < 3 && (
                                    <button
                                        type="button"
                                        onClick={addLeadQuestion}
                                        className="text-[#64748b] border border-[#e2e8f0] bg-white rounded-lg px-4 py-2 text-[13px] font-bold hover:bg-[#f8fafc] transition-colors flex items-center gap-2"
                                    >
                                        <i className="bi bi-plus" style={{ fontSize: '18px', margin: '-4px' }}></i> Añadir pregunta
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 2. TRANSFERENCIA */}
                    <div className="border border-[#e2e8f0] rounded-2xl p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-6 h-6 rounded flex items-center justify-center bg-[#e2e8f0] text-[#94a3b8]">
                                    <i className="bi bi-dash"></i>
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-bold text-[#1e293b]">Transferir llamada</h3>
                                    <p className="text-[14px] text-[#64748b] mt-1">Transfiere a un número específico o persona determinada</p>
                                </div>
                            </div>
                            <ToggleSwitch checked={enableTransfer} onChange={(v) => updateField('enableTransfer', v)} id="enableTransfer" />
                        </div>
                        
                        {enableTransfer && (
                            <div className="mt-6 pl-10 border-t border-[#f1f5f9] pt-6">
                                <div className="space-y-4">
                                    {transferDestinations.map((dest, idx) => (
                                        <div key={idx} className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-5 relative">
                                            <button
                                                type="button"
                                                onClick={() => updateField('transferDestinations', transferDestinations.filter((_, i) => i !== idx))}
                                                className="absolute top-4 right-4 text-[#ef4444] hover:text-[#dc2626]"
                                            >
                                                <i className="bi bi-trash3"></i>
                                            </button>
                                            <div className="grid grid-cols-2 gap-4 pr-8">
                                                <div>
                                                    <label className="block text-[13px] font-bold text-[#1e293b] mb-1">Nombre / Departamento <span className="text-[#ef4444]">*</span></label>
                                                    <input
                                                        type="text"
                                                        className="w-full border border-[#cbd5e1] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#267ab0]"
                                                        placeholder="Ej: Equipo de ventas"
                                                        value={dest.name}
                                                        onChange={e => {
                                                            const d = [...transferDestinations];
                                                            d[idx].name = e.target.value;
                                                            updateField('transferDestinations', d);
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[13px] font-bold text-[#1e293b] mb-1">Número de teléfono <span className="text-[#ef4444]">*</span></label>
                                                    <input
                                                        type="text"
                                                        className="w-full border border-[#cbd5e1] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#267ab0]"
                                                        placeholder="+34 600..."
                                                        value={dest.number || ''}
                                                        onChange={e => {
                                                            const d = [...transferDestinations];
                                                            d[idx].number = e.target.value;
                                                            updateField('transferDestinations', d);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addTransfer}
                                        className="text-[#64748b] border border-[#e2e8f0] bg-white rounded-lg px-4 py-2 text-[13px] font-bold hover:bg-[#f8fafc] transition-colors flex items-center gap-2"
                                    >
                                        <i className="bi bi-plus" style={{ fontSize: '18px', margin: '-4px' }}></i> Añadir destino
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. CAL.COM */}
                    <div className="border border-[#e2e8f0] rounded-2xl p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-6 h-6 rounded flex items-center justify-center bg-[#e2e8f0] text-[#94a3b8]">
                                    <i className="bi bi-dash"></i>
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-bold text-[#1e293b]">Reservar cita en el calendario (Cal.com)</h3>
                                    <p className="text-[14px] text-[#64748b] mt-1">Integración nativa con Cal.com para agendar citas automáticamente</p>
                                </div>
                            </div>
                            <ToggleSwitch checked={enableCalBooking} onChange={(v) => updateField('enableCalBooking', v)} id="enableCalBooking" />
                        </div>
                        
                        {enableCalBooking && (
                             <div className="mt-6 pl-10 border-t border-[#f1f5f9] pt-6 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[13px] font-bold text-[#1e293b] mb-1">Cal.com API Key <span className="text-[#ef4444]">*</span></label>
                                    <input
                                        type="password"
                                        className={`w-full border ${errors.calApiKey ? 'border-[#ef4444]' : 'border-[#cbd5e1]'} rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#267ab0]`}
                                        value={calApiKey}
                                        onChange={e => updateField('calApiKey', e.target.value)}
                                        placeholder="cal_live_..."
                                    />
                                    {errors.calApiKey && <span className="text-[12px] text-[#ef4444]">{errors.calApiKey}</span>}
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-[#1e293b] mb-1">Event Type ID <span className="text-[#ef4444]">*</span></label>
                                    <input
                                        type="text"
                                        className={`w-full border ${errors.calEventId ? 'border-[#ef4444]' : 'border-[#cbd5e1]'} rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#267ab0]`}
                                        value={calEventId}
                                        onChange={e => updateField('calEventId', e.target.value)}
                                        placeholder="123456"
                                    />
                                    {errors.calEventId && <span className="text-[12px] text-[#ef4444]">{errors.calEventId}</span>}
                                </div>
                             </div>
                        )}
                    </div>

                    <div className="h-px bg-[#f1f5f9] my-10"></div>

                    {/* DATOS A RECOGER */}
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <i className="bi bi-bar-chart-fill text-[#267ab0] text-[20px]"></i>
                            <h2 className="text-[18px] font-bold text-[#1e293b]">Datos a recoger al finalizar la llamada</h2>
                        </div>
                        <p className="text-[14px] text-[#64748b] mb-6">Análisis automático post-llamada — extrae información valiosa de cada conversación</p>

                        <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-lg p-4 flex gap-3 items-start mb-8">
                            <i className="bi bi-info-circle-fill text-[#3b82f6] mt-0.5"></i>
                            <div className="text-[13px] text-[#1e40af] leading-relaxed">
                                El análisis posterior a la llamada analiza automáticamente las conversaciones una vez finalizadas. Ofrecemos variables predefinidas que <strong>no puedes modificar</strong>, y puedes añadir categorías personalizadas adaptadas a tu negocio.<br/>
                                <strong>Nota:</strong> Los campos no se completarán en llamadas que no llegaron a conectarse o en las que no hubo conversación.
                            </div>
                        </div>

                        <h4 className="text-[12px] font-bold text-[#64748b] tracking-wider uppercase mb-3">Variables Predefinidas</h4>
                        <div className="space-y-3 mb-10">
                            {[
                                { title: 'Resumen de la llamada', desc: 'Escribe un resumen de 1 a 3 frases basado en la transcripción, capturando la información importante y acciones tomadas.', type: 'Texto', icon: 'bi-text-paragraph' },
                                { title: 'Llamada exitosa', desc: 'Evalúa si el agente tuvo una llamada exitosa: conversación completa, tarea finalizada, sin problemas técnicos ni buzón de voz.', type: 'Sí/No', icon: 'bi-check-circle' },
                                { title: 'Sentimiento del usuario', desc: 'Evalúa el sentimiento, estado de ánimo y nivel de satisfacción del usuario durante la llamada.', type: 'Texto', icon: 'bi-emoji-smile' },
                            ].map((item, i) => (
                                <div key={i} className="bg-[#f8fafc] border border-[#f1f5f9] rounded-xl p-4 flex items-center justify-between pointer-events-none">
                                    <div className="flex items-start gap-4">
                                        <div className="w-6 h-6 rounded flex items-center justify-center text-[#94a3b8] mt-0.5">
                                            <i className={`bi ${item.icon}`}></i>
                                        </div>
                                        <div>
                                            <div className="text-[14px] font-bold text-[#1e293b]">{item.title}</div>
                                            <div className="text-[13px] text-[#64748b] mt-1">{item.desc}</div>
                                        </div>
                                    </div>
                                    <div className="border border-[#e2e8f0] bg-white text-[#64748b] text-[12px] font-bold px-3 py-1 rounded shadow-sm">
                                        {item.type}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <h4 className="text-[12px] font-bold text-[#64748b] tracking-wider uppercase mb-3">Categorías Personalizadas</h4>
                        <p className="text-[14px] text-[#475569] mb-4">Añade variables de análisis adaptadas a tu negocio. Elige el tipo según qué dato necesites extraer:</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {[
                                { name: 'Texto', desc: 'Información textual.', ej: 'Ej: Resumen, puntos de acción', icon: 'bi-fonts', typeVal: 'string' },
                                { name: 'Selector', desc: 'Lista fija de opciones.', ej: 'Ej: Tipo de incidencia, estado', icon: 'bi-ui-radios', typeVal: 'enum' },
                                { name: 'Booleano', desc: 'Sí o No.', ej: 'Ej: ¿Es primera llamada?', icon: 'bi-toggle-on', typeVal: 'boolean' },
                                { name: 'Número', desc: 'Valor numérico.', ej: 'Ej: Puntuación, importe', icon: 'bi-123', typeVal: 'number' },
                            ].map((t, i) => (
                                <div key={i} 
                                     onClick={() => addVariable(t.typeVal)}
                                     className="border border-[#e2e8f0] bg-[#f8fafc] hover:bg-white hover:border-[#cbd5e1] hover:shadow-sm cursor-pointer transition-all rounded-xl p-4 flex gap-3">
                                    <div className="text-[#64748b]"><i className={`bi ${t.icon}`}></i></div>
                                    <div>
                                        <div className="text-[14px] font-bold text-[#1e293b]">{t.name}</div>
                                        <div className="text-[13px] text-[#475569] mt-1">{t.desc}</div>
                                        <div className="text-[12px] text-[#94a3b8] italic mt-1">{t.ej}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {extractionVariables.length > 0 && (
                            <div className="space-y-4 mb-6">
                                {extractionVariables.map((v, idx) => (
                                    <div key={idx} className="border border-[#cbd5e1] bg-white rounded-xl p-4 relative flex gap-4">
                                        <button
                                            type="button"
                                            onClick={() => updateField('extractionVariables', extractionVariables.filter((_, i) => i !== idx))}
                                            className="absolute top-4 right-4 text-[#ef4444] hover:text-[#dc2626]"
                                        >
                                            <i className="bi bi-trash3"></i>
                                        </button>
                                        <div className="mt-1">
                                            <div className="border border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] text-[12px] font-bold px-2 py-1 rounded">
                                                {v.type === 'string' ? 'Texto' : v.type === 'boolean' ? 'Booleano' : v.type === 'number' ? 'Número' : 'Selector'}
                                            </div>
                                        </div>
                                        <div className="flex-[2]">
                                            <label className="block text-[12px] font-bold text-[#64748b] mb-1">Nombre (Inglés preferiblemente) <span className="text-[#ef4444]">*</span></label>
                                            <input
                                                type="text"
                                                className="w-full border border-[#cbd5e1] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#267ab0]"
                                                placeholder="Ej: user_intent"
                                                value={v.name}
                                                onChange={e => {
                                                    const updated = [...extractionVariables];
                                                    updated[idx].name = e.target.value;
                                                    updateField('extractionVariables', updated);
                                                }}
                                            />
                                        </div>
                                        <div className="flex-[3] pr-8">
                                            <label className="block text-[12px] font-bold text-[#64748b] mb-1">Descripción de lo que se debe extraer <span className="text-[#ef4444]">*</span></label>
                                            <input
                                                type="text"
                                                className="w-full border border-[#cbd5e1] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#267ab0]"
                                                placeholder="Ej: El motivo principal por el que llama el usuario."
                                                value={v.description}
                                                onChange={e => {
                                                    const updated = [...extractionVariables];
                                                    updated[idx].description = e.target.value;
                                                    updateField('extractionVariables', updated);
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => addVariable('string')}
                            className="bg-white border border-[#e2e8f0] text-[#1e293b] text-[14px] font-bold rounded-xl px-5 py-2.5 shadow-sm flex items-center gap-2 hover:bg-[#f8fafc] transition-colors"
                        >
                            <i className="bi bi-plus-lg"></i> Añadir variable
                        </button>
                    </div>

                    {/* ACTIONS */}
                    <div className="border-t border-[#e2e8f0] pt-6 flex justify-between mt-12">
                        <button
                            type="button"
                            onClick={prevStep}
                            className="bg-white border border-[#e2e8f0] text-[#64748b] font-bold px-6 py-2.5 rounded-xl hover:bg-[#f8fafc] transition-colors flex items-center gap-2 text-[15px]"
                        >
                            <i className="bi bi-arrow-left"></i> Anterior
                        </button>
                        <button
                            type="submit"
                            className="bg-[#267ab0] hover:bg-[#1e6392] text-white font-bold px-8 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-[15px] shadow-sm"
                        >
                            Siguiente <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
