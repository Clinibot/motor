"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';

interface LeadQuestion {
    question: string;
    key: string;
    failAction?: 'end_call' | 'transfer' | 'booking' | 'continue';
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
        enableCalBooking, calApiKey, calEventId, calTimezone, calUrl, enableCalCancellation,
        enableTransfer, transferDestinations,
        extractionVariables, leadQuestions,
        updateField, prevStep, nextStep
    } = useWizardStore();

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showCalGuide, setShowCalGuide] = useState(false);

    // Auto-add phone variable if Cal.com is enabled
    React.useEffect(() => {
        if (enableCalBooking) {
            const hasPhone = extractionVariables.some(v => 
                v.name.toLowerCase().includes('tel') || 
                v.name.toLowerCase().includes('phone') ||
                v.description.toLowerCase().includes('tel')
            );
            
            if (!hasPhone) {
                updateField('extractionVariables', [
                    ...extractionVariables,
                    { 
                        name: 'telefono', 
                        type: 'string', 
                        description: 'Número de teléfono del usuario para identificación y contacto.',
                        required: true 
                    }
                ]);
            }
        }
    }, [enableCalBooking, extractionVariables, updateField]);

    const timezones = [
        'Europe/Madrid',
        'Europe/London',
        'Europe/Paris',
        'America/New_York',
        'America/Los_Angeles',
        'America/Mexico_City',
        'America/Bogota',
        'America/Argentina/Buenos_Aires',
    ];

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (enableCalBooking) {
            if (!calApiKey) newErrors.calApiKey = 'La API Key de Cal.com es obligatoria.';
            if (!calEventId) newErrors.calEventId = 'El ID de evento es obligatorio.';
            if (!calTimezone) newErrors.calTimezone = 'La zona horaria es obligatoria.';
        }

        if (enableTransfer) {
            if (transferDestinations.length === 0) {
                newErrors.transfer = 'Debes añadir al menos un destino';
            } else {
                transferDestinations.forEach((dest, idx) => {
                    if (!dest.name.trim()) newErrors[`transfer_${idx}_name`] = 'Obligatorio';
                    if (!dest.number?.trim()) {
                        newErrors[`transfer_${idx}_number`] = 'Obligatorio';
                    }
                });
            }
        }

        extractionVariables.forEach((v, idx) => {
            if (!v.name.trim()) newErrors[`extraction_${idx}_name`] = 'Obligatorio';
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            nextStep();
        }
    };

    const addTransferDestination = () => {
        updateField('transferDestinations', [...transferDestinations, {
            name: '',
            description: '',
            number: '',
        }]);
    };

    const addVariable = (type: string = 'string') => {
        updateField('extractionVariables', [...extractionVariables, { name: '', type, description: '', required: true }]);
    };

    const addLeadQuestion = () => {
        if (leadQuestions.length >= 3) return;
        updateField('leadQuestions', [...leadQuestions, { question: '', key: '', failAction: 'end_call' }]);
    };

    return (
        <div className="content-area w-full max-w-[1100px] ml-0">
            <div className="form-card bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-8">
                <WizardStepHeader
                    title="Herramientas del agente"
                    subtitle="Activa las acciones que tu agente puede realizar durante las llamadas."
                />

                <form onSubmit={handleNext} className="mt-8 space-y-6">

                    {/* 1. CUALIFICACIÓN */}
                    <div className="border border-[#e2e8f0] rounded-2xl p-6 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${leadQuestions.length > 0 ? 'bg-[#267ab0]' : 'bg-[#e2e8f0] text-[#94a3b8]'}`}>
                                    <i className="bi bi-check2-square" style={{ fontSize: '18px' }}></i>
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
                            <div className="mt-8 pt-8 border-t border-[#f1f5f9]">
                                <h4 className="text-[12px] font-bold text-[#64748b] tracking-[0.1em] uppercase mb-3">PREGUNTAS DE CUALIFICACIÓN</h4>
                                <p className="text-[14px] text-[#475569] mb-4">Define hasta 3 preguntas que el agente hará al contacto. Cada una tiene un criterio: si no lo cumple, la llamada termina o se redirige.</p>
                                
                                <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-xl p-4 flex gap-3 items-center mb-6">
                                    <i className="bi bi-exclamation-triangle-fill text-[#d97706] text-[18px]"></i>
                                    <span className="text-[13px] text-[#92400e] font-medium"><strong>Máximo 3 preguntas.</strong> En voz, más preguntas aumentan el abandono de la llamada.</span>
                                </div>

                                <div className="text-right text-[12px] text-[#94a3b8] font-semibold mb-4">
                                    {leadQuestions.length} / 3 preguntas
                                </div>

                                <div className="space-y-6">
                                    {leadQuestions.map((q: LeadQuestion, idx: number) => (
                                        <div key={idx} className="bg-[#f8fafc]/50 border border-[#e2e8f0] rounded-2xl p-6 relative">
                                            <div className="flex justify-between items-center mb-6">
                                                <span className="px-3 py-1 bg-[#eff6ff] text-[#267ab0] text-[12px] font-bold rounded-lg border border-[#dbeafe]">
                                                    Pregunta {idx + 1}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = leadQuestions.filter((_, i) => i !== idx);
                                                        updateField('leadQuestions', updated);
                                                    }}
                                                    className="text-[#ef4444] bg-white border border-[#fee2e2] w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#fef2f2] transition-colors shadow-sm"
                                                >
                                                    <i className="bi bi-trash3"></i>
                                                </button>
                                            </div>

                                            <div className="space-y-5">
                                                <div>
                                                    <label className="block text-[13px] font-bold text-[#1e293b] mb-1.5">
                                                        ¿Qué pregunta hará el agente? <span className="text-[#ef4444]">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#267ab0] bg-white shadow-sm"
                                                        placeholder="Ej: ¿Tienes un presupuesto mensual definido para este servicio?"
                                                        value={q.question}
                                                        onChange={e => {
                                                            const updated = [...leadQuestions];
                                                            updated[idx].question = e.target.value;
                                                            updateField('leadQuestions', updated);
                                                        }}
                                                    />
                                                    <p className="text-[12px] text-[#94a3b8] mt-1.5">Escríbela tal como la diría el agente en voz alta.</p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-[13px] font-bold text-[#1e293b] mb-1.5">
                                                            Cualifica si... <span className="text-[#ef4444]">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#267ab0] bg-white shadow-sm"
                                                            placeholder="Ej: Menciona cualquier cifra o rango concreto"
                                                            value={q.key}
                                                            onChange={e => {
                                                                const updated = [...leadQuestions];
                                                                updated[idx].key = e.target.value;
                                                                updateField('leadQuestions', updated);
                                                            }}
                                                        />
                                                        <p className="text-[12px] text-[#94a3b8] mt-1.5">Describe qué respuesta indica interés real.</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[13px] font-bold text-[#1e293b] mb-1.5">
                                                            Si no cualifica
                                                        </label>
                                                        <div className="relative">
                                                            <select
                                                                className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#267ab0] bg-white appearance-none shadow-sm"
                                                                value={q.failAction || 'end_call'}
                                                                onChange={e => {
                                                                    const updated = [...leadQuestions];
                                                                    updated[idx].failAction = e.target.value as LeadQuestion['failAction'];
                                                                    updateField('leadQuestions', updated);
                                                                }}
                                                            >
                                                                <option value="end_call">Terminar la llamada</option>
                                                                <option value="booking">Agendar cita</option>
                                                                <option value="continue">Continuar sin cualificar</option>
                                                                <option value="transfer">Transferir llamada</option>
                                                            </select>
                                                            <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none"></i>
                                                        </div>
                                                        <p className="text-[12px] text-[#94a3b8] mt-1.5">Acción si la respuesta no es válida.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {leadQuestions.length < 3 && (
                                    <button
                                        type="button"
                                        onClick={addLeadQuestion}
                                        className="mt-4 text-[#1e293b] border border-[#e2e8f0] bg-white rounded-xl px-5 py-2.5 text-[13px] font-bold hover:bg-[#f8fafc] transition-all flex items-center gap-2 shadow-sm"
                                    >
                                        <i className="bi bi-plus-lg" style={{ fontSize: '14px' }}></i> Añadir pregunta
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
                                        onClick={addTransferDestination}
                                        className="text-[#64748b] border border-[#e2e8f0] bg-white rounded-lg px-4 py-2 text-[13px] font-bold hover:bg-[#f8fafc] transition-colors flex items-center gap-2"
                                    >
                                        <i className="bi bi-plus" style={{ fontSize: '18px', margin: '-4px' }}></i> Añadir destino
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. CAL.COM */}
                    <div className="border border-[#e2e8f0] rounded-2xl p-6 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${enableCalBooking ? 'bg-[#267ab0]' : 'bg-[#e2e8f0] text-[#94a3b8]'}`}>
                                    <i className="bi bi-calendar-check" style={{ fontSize: '18px' }}></i>
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-bold text-[#1e293b]">Reservar cita en el calendario (Cal.com)</h3>
                                    <p className="text-[14px] text-[#64748b] mt-1">Integración nativa con Cal.com para agendar citas automáticamente</p>
                                </div>
                            </div>
                            <ToggleSwitch checked={enableCalBooking} onChange={(v) => updateField('enableCalBooking', v)} id="enableCalBooking" />
                        </div>
                        
                        {enableCalBooking && (
                             <div className="mt-8 pt-8 border-t border-[#f1f5f9]">
                                <div className="flex items-center justify-between mb-6">
                                    <p className="text-[14px] text-[#64748b]">Configura la integración con Cal.com para que tu agente pueda consultar disponibilidad y reservar citas.</p>
                                    <button 
                                        type="button"
                                        onClick={() => setShowCalGuide(true)}
                                        className="flex items-center gap-2 px-4 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-bold text-[#1e293b] hover:bg-[#f8fafc] transition-all"
                                    >
                                        <i className="bi bi-book"></i> Ver guía
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[13px] font-bold text-[#1e293b] mb-1.5 flex items-center gap-1">
                                            Cal.com API Key <span className="text-[#ef4444]">*</span>
                                        </label>
                                        <input
                                            type="password"
                                            className={`w-full border ${errors.calApiKey ? 'border-[#ef4444]' : 'border-[#e2e8f0]'} rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#267ab0] bg-white shadow-sm transition-all`}
                                            value={calApiKey}
                                            onChange={e => updateField('calApiKey', e.target.value)}
                                            placeholder="Introduce tu clave de API de Cal.com"
                                        />
                                        <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#94a3b8]">
                                            <i className="bi bi-lock-fill"></i>
                                            <span>Guardada de forma segura. Obténla desde Cal.com → Configuración → Developer → API Keys</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-bold text-[#1e293b] mb-1.5">
                                            Event Type ID <span className="text-[#ef4444]">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={`w-full border ${errors.calEventId ? 'border-[#ef4444]' : 'border-[#e2e8f0]'} rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#267ab0] bg-white shadow-sm transition-all`}
                                            value={calEventId}
                                            onChange={e => updateField('calEventId', e.target.value)}
                                            placeholder="Ej: 1427703"
                                        />
                                        <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#94a3b8]">
                                            <i className="bi bi-lightbulb"></i>
                                            <span>Encuéntralo en la URL de tu evento: https://app.cal.com/usuario/evento/<strong>1427703</strong></span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-bold text-[#1e293b] mb-1.5">
                                            Zona horaria <span className="text-[#ef4444]">*</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#267ab0] bg-white appearance-none shadow-sm"
                                                value={calTimezone}
                                                onChange={e => updateField('calTimezone', e.target.value)}
                                            >
                                                <option value="" disabled>Seleccionar zona horaria</option>
                                                {timezones.map(tz => (
                                                    <option key={tz} value={tz}>{tz}</option>
                                                ))}
                                            </select>
                                            <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none"></i>
                                        </div>
                                        <p className="text-[12px] text-[#94a3b8] mt-1.5">Zona horaria para comprobar disponibilidad y confirmar citas.</p>
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-bold text-[#1e293b] mb-1.5">
                                            Cal.com Link <span className="text-[#94a3b8] font-normal">(opcional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#267ab0] bg-white shadow-sm transition-all"
                                            value={calUrl}
                                            onChange={e => updateField('calUrl', e.target.value)}
                                            placeholder="https://cal.com/usuario/evento"
                                        />
                                    </div>

                                    <div className="pt-4 border-t border-[#f1f5f9]">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-[14px] font-bold text-[#1e293b]">Permitir cancelación de citas</h4>
                                                <p className="text-[13px] text-[#64748b] mt-0.5">Activa esta opción para que el agente pueda cancelar citas existentes.</p>
                                            </div>
                                            <ToggleSwitch 
                                                checked={enableCalCancellation} 
                                                onChange={(v) => updateField('enableCalCancellation', v)} 
                                                id="enableCalCancellation" 
                                            />
                                        </div>
                                        
                                        <div className="mt-4 bg-[#eff6ff] border border-[#dbeafe] rounded-xl p-4 flex gap-3 items-start">
                                            <i className="bi bi-info-circle-fill text-[#267ab0] text-[16px] mt-0.5"></i>
                                            <div className="text-[13px] text-[#1e40af] leading-relaxed">
                                                <strong>Lógica de reagendado:</strong> Si un usuario desea cambiar su cita, el agente está instruido para primero cancelar la cita actual y posteriormente agendar una nueva. Es necesario tener activada la cancelación para esta funcionalidad.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        )}
                    </div>

                    <div className="h-px bg-[#f1f5f9] my-10"></div>

                    {/* DATOS A RECOGER */}
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <i className="bi bi-bar-chart-line text-[#267ab0]" style={{ fontSize: '22px' }}></i>
                            <h2 className="text-[20px] font-bold text-[#1e293b]">Datos a recoger al finalizar la llamada</h2>
                        </div>
                        <p className="text-[14px] text-[#64748b] mb-6">Análisis automático post-llamada — extrae información valiosa de cada conversación</p>

                        <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-xl p-5 flex gap-4 items-start mb-8">
                            <div className="w-6 h-6 rounded-full bg-[#3b82f6] flex items-center justify-center flex-shrink-0 mt-0.5">
                                <i className="bi bi-info text-white" style={{ fontSize: '20px' }}></i>
                            </div>
                            <div className="text-[14px] text-[#1e40af] leading-relaxed">
                                El análisis posterior a la llamada analiza automáticamente las conversaciones una vez finalizadas. Ofrecemos variables predefinidas que <strong>no puedes modificar</strong>, y puedes añadir categorías personalizadas adaptadas a tu negocio.<br/>
                                <span className="block mt-1"><strong>Nota:</strong> Los campos no se completarán en llamadas que no llegaron a conectarse o en las que no hubo conversación.</span>
                            </div>
                        </div>

                        <div className="mb-10">
                            <h4 className="text-[12px] font-bold text-[#94a3b8] tracking-widest uppercase mb-4">Variables Predefinidas</h4>
                            <div className="space-y-3">
                                {[
                                    { title: 'Resumen de la llamada', desc: 'Escribe un resumen de 1 a 3 frases basado en la transcripción, capturando la información importante y acciones tomadas.', type: 'Texto', icon: 'bi-list-task' },
                                    { title: 'Llamada exitosa', desc: 'Evalúa si el agente tuvo una llamada exitosa: conversación completa, tarea finalizada, sin problemas técnicos ni buzón de voz.', type: 'Si/No', icon: 'bi-check2-circle' },
                                    { title: 'Sentimiento del usuario', desc: 'Evalúa el sentimiento, estado de ánimo y nivel de satisfacción del usuario durante la llamada.', type: 'Texto', icon: 'bi-emoji-smile' },
                                ].map((item, i) => (
                                    <div key={i} className="bg-[#f8fafc] border border-[#f1f5f9] rounded-xl p-4 flex items-center justify-between pointer-events-none">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white border border-[#f1f5f9] rounded-lg flex items-center justify-center text-[#94a3b8]">
                                                <i className={`bi ${item.icon}`} style={{ fontSize: '18px' }}></i>
                                            </div>
                                            <div>
                                                <div className="text-[14px] font-bold text-[#1e293b]">{item.title}</div>
                                                <div className="text-[13px] text-[#64748b] mt-0.5">{item.desc}</div>
                                            </div>
                                        </div>
                                        <div className="bg-white border border-[#e2e8f0] text-[#94a3b8] text-[11px] font-bold px-3 py-1.5 rounded shadow-sm">
                                            {item.type}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mb-8">
                            <h4 className="text-[12px] font-bold text-[#94a3b8] tracking-widest uppercase mb-4">Categorías Personalizadas</h4>
                            <p className="text-[14px] text-[#64748b] mb-6">Añade variables de análisis adaptadas a tu negocio. Elige el tipo según qué dato necesites extraer:</p>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { name: 'Texto', desc: 'Información textual.', ej: 'Ej: Resumen, puntos de acción', icon: 'bi-fonts', typeVal: 'string', color: '#3b82f6' },
                                    { name: 'Selector', desc: 'Lista fija de opciones.', ej: 'Ej: Tipo de incidencia, estado', icon: 'bi-list-columns-reverse', typeVal: 'enum', color: '#8b5cf6' },
                                    { name: 'Booleano', desc: 'Sí o No.', ej: 'Ej: ¿Es primera llamada?', icon: 'bi-check2-circle', typeVal: 'boolean', color: '#10b981' },
                                    { name: 'Número', desc: 'Valor numérico.', ej: 'Ej: Puntuación, importe', icon: 'bi-hash', typeVal: 'number', color: '#f59e0b' },
                                ].map((t, i) => (
                                    <div key={i} 
                                         onClick={() => addVariable(t.typeVal)}
                                         className="border border-[#f1f5f9] bg-white hover:border-[#267ab0]/30 hover:shadow-lg hover:-translate-y-1 cursor-pointer transition-all rounded-2xl p-6 flex gap-4 group">
                                        <div className="w-12 h-12 rounded-xl bg-[#f8fafc] flex items-center justify-center text-[#64748b] group-hover:text-[#267ab0] group-hover:bg-[#f0f7ff] transition-all flex-shrink-0">
                                            <i className={`bi ${t.icon}`} style={{ fontSize: '22px' }}></i>
                                        </div>
                                        <div>
                                            <div className="text-[15px] font-bold text-[#1e293b] group-hover:text-[#267ab0] transition-colors">{t.name}</div>
                                            <div className="text-[13px] text-[#64748b] mt-1 leading-relaxed">{t.desc}</div>
                                            <div className="text-[12px] text-[#94a3b8] italic mt-1.5">{t.ej}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {extractionVariables.length > 0 && (
                            <div className="space-y-4 mb-8">
                                {extractionVariables.map((v, idx) => (
                                    <div key={idx} className="border border-[#e2e8f0] bg-white rounded-2xl overflow-hidden shadow-sm relative pt-4 pb-6 px-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-2">
                                                <i className={`bi ${v.type === 'string' ? 'bi-fonts' : v.type === 'boolean' ? 'bi-check2-circle' : v.type === 'number' ? 'bi-hash' : 'bi-list-columns-reverse'} text-[#267ab0]`}></i>
                                                <span className="text-[13px] font-bold text-[#267ab0]">{v.type === 'string' ? 'Texto' : v.type === 'boolean' ? 'Booleano' : v.type === 'number' ? 'Número' : 'Selector'}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => updateField('extractionVariables', extractionVariables.filter((_, i) => i !== idx))}
                                                className="text-[#94a3b8] hover:text-[#ef4444] transition-colors"
                                            >
                                                <i className="bi bi-x-lg" style={{ fontSize: '18px' }}></i>
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[13px] font-bold text-[#1e293b] mb-1.5">Nombre de la variable <span className="text-[#ef4444]">*</span></label>
                                                <input
                                                    type="text"
                                                    className="w-full border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#267ab0] bg-[#f8fafc] focus:bg-white transition-all"
                                                    placeholder="Ej: punto_de_accion"
                                                    value={v.name}
                                                    onChange={e => {
                                                        const updated = [...extractionVariables];
                                                        updated[idx].name = e.target.value;
                                                        updateField('extractionVariables', updated);
                                                    }}
                                                />
                                                <p className="text-[12px] text-[#94a3b8] mt-1.5 ml-1">Sin espacios, en minúscula.</p>
                                            </div>
                                            <div>
                                                <label className="block text-[13px] font-bold text-[#1e293b] mb-1.5">Descripción <span className="text-[#ef4444]">*</span></label>
                                                <input
                                                    type="text"
                                                    className="w-full border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#267ab0] bg-[#f8fafc] focus:bg-white transition-all"
                                                    placeholder="Ej: Resume los puntos de acción acordados durante la llamada."
                                                    value={v.description}
                                                    onChange={e => {
                                                        const updated = [...extractionVariables];
                                                        updated[idx].description = e.target.value;
                                                        updateField('extractionVariables', updated);
                                                    }}
                                                />
                                                <p className="text-[12px] text-[#94a3b8] mt-1.5 ml-1">Indica al agente qué debe extraer.</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="bg-white border border-[#e2e8f0] text-[#1e293b] text-[14px] font-bold rounded-xl px-5 py-2.5 shadow-sm flex items-center gap-2 hover:bg-[#f8fafc] transition-colors"
                            >
                                <i className="bi bi-plus-lg"></i> Añadir variable
                            </button>

                            {isDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                                    <div className="absolute bottom-full left-0 mb-2 w-[180px] bg-white border border-[#e2e8f0] rounded-xl shadow-xl z-20 py-2 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                        {[
                                            { name: 'Texto', icon: 'bi-fonts', val: 'string' },
                                            { name: 'Selector', icon: 'bi-list-columns-reverse', val: 'enum' },
                                            { name: 'Booleano', icon: 'bi-check2-circle', val: 'boolean' },
                                            { name: 'Número', icon: 'bi-hash', val: 'number' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.val}
                                                type="button"
                                                onClick={() => {
                                                    addVariable(opt.val);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-[#f8fafc] transition-colors"
                                            >
                                                <i className={`bi ${opt.icon} text-[#64748b]`}></i>
                                                <span className="text-[14px] font-medium text-[#1e293b]">{opt.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
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

            {/* MODAL GUÍA CAL.COM */}
            {showCalGuide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCalGuide(false)}></div>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[500px] z-10 overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 pb-0">
                            <div className="flex items-center gap-3 mb-2">
                                <i className="bi bi-book text-[#267ab0] text-[24px]"></i>
                                <h2 className="text-[22px] font-bold text-[#1e293b]">Guía de integración Cal.com</h2>
                            </div>
                            <p className="text-[15px] text-[#64748b]">Integra la reserva de citas de Cal.com con tu agente de voz.</p>
                        </div>

                        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {/* Requisitos */}
                            <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-2xl p-6">
                                <h3 className="text-[14px] font-bold text-[#92400e] mb-4 flex items-center gap-2">
                                    <i className="bi bi-exclamation-triangle-fill"></i> Antes de empezar necesitas:
                                </h3>
                                <ul className="space-y-2.5">
                                    {[
                                        'Una cuenta en Cal.com (cal.com)',
                                        'Un Event Type creado en tu cuenta',
                                        'Tu API Key desde Configuración → Developer'
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-2 text-[13px] text-[#92400e] font-medium">
                                            <i className="bi bi-check-circle-fill text-[#d97706]"></i> {item}
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-6">
                                    <p className="text-[12px] font-bold text-[#92400e] uppercase tracking-wider mb-3">Cal.com se integra con:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {['Google Calendar', 'HubSpot', 'Outlook', 'Salesforce', 'Zoom', 'Notion'].map(p => (
                                            <span key={p} className="bg-white px-3 py-1 rounded-full text-[11px] font-bold text-[#92400e] border border-[#fef3c7]">
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Pasos */}
                            <div className="space-y-8">
                                {[
                                    { step: 1, title: 'Crea una cuenta en Cal.com', desc: <>Visita <strong>cal.com</strong> y crea tu cuenta si no tienes una.</> },
                                    { step: 2, title: 'Configura un tipo de evento', desc: <>En tu panel de Cal.com: <strong>Tipos de evento → Nuevo</strong> → Configura duración, disponibilidad, nombre → <strong>Guardar</strong>.</> },
                                    { step: 3, title: 'Obtén el Event Type ID', desc: <>Abre el tipo de evento y mira la URL del navegador. El ID es el número al final:</>, code: 'https://app.cal.com/usuario/evento/1427703' },
                                    { step: 4, title: 'Obtén tu API Key', desc: <>En Cal.com: <strong>Configuración → Developer → API Keys</strong> → copia tu clave.</> },
                                    { step: 5, title: 'Pega los datos en la Fábrica', desc: <>Introduce la API Key, el Event Type ID y la zona horaria. El agente podrá consultar disponibilidad y reservar citas automáticamente durante las llamadas.</> }
                                ].map((s, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-[#267ab0] text-white flex items-center justify-center font-bold text-[14px] flex-shrink-0">
                                            {s.step}
                                        </div>
                                        <div className="pt-1">
                                            <h4 className="font-bold text-[#1e293b] text-[15px] mb-1">{s.title}</h4>
                                            <p className="text-[14px] text-[#64748b] leading-relaxed">{s.desc}</p>
                                            {s.code && (
                                                <div className="mt-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 font-mono text-[13px] text-[#267ab0]">
                                                    {s.code.split('1427703')[0]}<strong>1427703</strong>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer info */}
                            <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-2xl p-5 flex gap-4 items-start">
                                <i className="bi bi-info-circle-fill text-[#267ab0] text-[18px] mt-0.5"></i>
                                <p className="text-[13px] text-[#1e40af] leading-relaxed">
                                    Para más detalles consulta el <strong>Centro de ayuda</strong> de la plataforma → sección Cal.com.
                                </p>
                            </div>
                        </div>

                        <div className="p-8 pt-0">
                            <button
                                type="button"
                                onClick={() => setShowCalGuide(false)}
                                className="w-full bg-[#267ab0] hover:bg-[#1e6392] text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg active:scale-[0.98]"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
