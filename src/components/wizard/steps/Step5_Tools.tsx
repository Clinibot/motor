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
// Toggle switch component (Enhanced)
const ToggleSwitch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; id: string }> = ({ checked, onChange, id }) => (
    <label htmlFor={id} className="relative inline-block w-11 h-6 cursor-pointer flex-shrink-0">
        <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} className="opacity-0 w-0 h-0 peer" />
        <span className={`absolute inset-0 rounded-full transition-all duration-300 ${checked ? 'bg-[var(--azul)]' : 'bg-[#cbd5e1]'} peer-focus:ring-4 peer-focus:ring-[var(--azul)]/10`}>
            <span className={`absolute bg-white rounded-full w-[18px] h-[18px] top-[3px] transition-all duration-300 shadow-sm ${checked ? 'left-[calc(100%-21px)]' : 'left-[3px]'}`} />
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
        <div className="content-area">
            <div className="form-card">
                <WizardStepHeader
                    title="Herramientas del agente"
                    subtitle="Activa las acciones que tu agente puede realizar durante las llamadas."
                />

                <form onSubmit={handleNext} className="mt-10 space-y-8">

                    {/* 1. CUALIFICACIÓN */}
                    <div className="p-6 rounded-2xl bg-white border border-[var(--gris-borde)] shadow-sm hover:border-[var(--azul)]/30 transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${leadQuestions.length > 0 ? 'bg-[var(--azul)] text-white shadow-lg shadow-[var(--azul)]/20' : 'bg-[#f1f5f9] text-[#94a3b8]'}`}>
                                    <i className="bi bi-check2-square text-[20px]"></i>
                                </div>
                                <div className="pt-0.5">
                                    <h3 className="text-[17px] font-bold text-[var(--oscuro)]">Cualificar contacto antes de actuar</h3>
                                    <p className="text-[14px] text-[var(--gris-texto)] mt-1">Filtra leads automáticamente según tus criterios antes de agendar o transferir</p>
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
                            <div className="mt-8 pt-8 border-t border-[#f1f5f9] animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-[12px] font-bold text-[var(--gris-texto)] tracking-[0.1em] uppercase">PASOS DE CUALIFICACIÓN</h4>
                                    <div className="text-[12px] text-[var(--gris-texto)] font-semibold bg-[#f8fafc] px-3 py-1 rounded-full border border-[#f1f5f9]">
                                        {leadQuestions.length} / 3 preguntas
                                    </div>
                                </div>

                                <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-xl p-4 flex gap-3 items-center mb-6">
                                    <i className="bi bi-exclamation-triangle-fill text-[#d97706] text-[18px]"></i>
                                    <p className="text-[13px] text-[#92400e] font-medium m-0"><strong>Máximo 3 preguntas.</strong> En voz, un flujo corto aumenta la tasa de conversión.</p>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    {leadQuestions.map((q: LeadQuestion, idx: number) => (
                                        <div key={idx} className="bg-[#f8fafc]/50 border border-[#e2e8f0] rounded-2xl p-6 relative group hover:border-[var(--azul)]/20 transition-all">
                                            <div className="flex justify-between items-center mb-6">
                                                <span className="px-3 py-1 bg-white text-[var(--azul)] text-[12px] font-bold rounded-lg border border-[var(--azul)]/20 shadow-sm">
                                                    Pregunta {idx + 1}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = leadQuestions.filter((_, i) => i !== idx);
                                                        updateField('leadQuestions', updated);
                                                    }}
                                                    className="text-[#ef4444] bg-white border border-[#fee2e2] w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#ef4444] hover:text-white transition-all shadow-sm"
                                                >
                                                    <i className="bi bi-trash3"></i>
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2">
                                                    <label className="lbl">
                                                        ¿Qué pregunta hará el agente? <span className="text-[#ef4444]">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="inp"
                                                        placeholder="Ej: ¿Tienes un presupuesto mensual definido para este servicio?"
                                                        value={q.question}
                                                        onChange={e => {
                                                            const updated = [...leadQuestions];
                                                            updated[idx].question = e.target.value;
                                                            updateField('leadQuestions', updated);
                                                        }}
                                                    />
                                                    <p className="hint mt-1.5">Escríbela tal como la diría el agente en voz alta.</p>
                                                </div>

                                                <div>
                                                    <label className="lbl">
                                                        Cualifica si... <span className="text-[#ef4444]">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="inp"
                                                        placeholder="Ej: Menciona cualquier cifra o rango concreto"
                                                        value={q.key}
                                                        onChange={e => {
                                                            const updated = [...leadQuestions];
                                                            updated[idx].key = e.target.value;
                                                            updateField('leadQuestions', updated);
                                                        }}
                                                    />
                                                    <p className="hint mt-1.5">Describe qué respuesta indica interés real.</p>
                                                </div>
                                                <div>
                                                    <label className="lbl">
                                                        Si no cualifica
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            className="inp sel"
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
                                                    </div>
                                                    <p className="hint mt-1.5">Acción si la respuesta no es válida.</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {leadQuestions.length < 3 && (
                                    <button
                                        type="button"
                                        onClick={addLeadQuestion}
                                        className="btn-s mt-6"
                                    >
                                        <i className="bi bi-plus-lg"></i> Añadir pregunta de filtro
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 2. TRANSFERENCIA */}
                    <div className="p-6 rounded-2xl bg-white border border-[var(--gris-borde)] shadow-sm hover:border-[var(--azul)]/30 transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${enableTransfer ? 'bg-[var(--azul)] text-white shadow-lg shadow-[var(--azul)]/20' : 'bg-[#f1f5f9] text-[#94a3b8]'}`}>
                                    <i className="bi bi-telephone-outbound text-[20px]"></i>
                                </div>
                                <div className="pt-0.5">
                                    <h3 className="text-[17px] font-bold text-[var(--oscuro)]">Transferir llamada</h3>
                                    <p className="text-[14px] text-[var(--gris-texto)] mt-1">Transfiere a un número específico o persona determinada</p>
                                </div>
                            </div>
                            <ToggleSwitch checked={enableTransfer} onChange={(v) => updateField('enableTransfer', v)} id="enableTransfer" />
                        </div>
                        
                        {enableTransfer && (
                            <div className="mt-8 pt-8 border-t border-[#f1f5f9] animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="space-y-4">
                                    {transferDestinations.map((dest, idx) => (
                                        <div key={idx} className="bg-[#f8fafc] border border-[var(--gris-borde)] rounded-xl p-5 relative group">
                                            <button
                                                type="button"
                                                onClick={() => updateField('transferDestinations', transferDestinations.filter((_, i) => i !== idx))}
                                                className="absolute top-4 right-4 text-[#94a3b8] hover:text-[#ef4444] transition-colors"
                                            >
                                                <i className="bi bi-trash3"></i>
                                            </button>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                                                <div>
                                                    <label className="lbl">Nombre / Departamento <span className="text-[#ef4444]">*</span></label>
                                                    <input
                                                        type="text"
                                                        className="inp"
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
                                                    <label className="lbl">Número de teléfono <span className="text-[#ef4444]">*</span></label>
                                                    <input
                                                        type="text"
                                                        className="inp"
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
                                        className="btn-s mt-2"
                                    >
                                        <i className="bi bi-plus-lg"></i> Añadir destino de transferencia
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. CAL.COM */}
                    <div className="p-6 rounded-2xl bg-white border border-[var(--gris-borde)] shadow-sm hover:border-[var(--azul)]/30 transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${enableCalBooking ? 'bg-[var(--azul)] text-white shadow-lg shadow-[var(--azul)]/20' : 'bg-[#f1f5f9] text-[#94a3b8]'}`}>
                                    <i className="bi bi-calendar-check text-[20px]"></i>
                                </div>
                                <div className="pt-0.5">
                                    <h3 className="text-[17px] font-bold text-[var(--oscuro)]">Reservar cita en el calendario (Cal.com)</h3>
                                    <p className="text-[14px] text-[var(--gris-texto)] mt-1">Integración nativa con Cal.com para agendar citas automáticamente</p>
                                </div>
                            </div>
                            <ToggleSwitch checked={enableCalBooking} onChange={(v) => updateField('enableCalBooking', v)} id="enableCalBooking" />
                        </div>
                        
                        {enableCalBooking && (
                             <div className="mt-8 pt-8 border-t border-[#f1f5f9] animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center justify-between mb-8">
                                    <p className="text-[14px] text-[var(--gris-texto)] m-0">Configura la integración para que tu agente pueda consultar disponibilidad y reservar citas.</p>
                                    <button 
                                        type="button"
                                        onClick={() => setShowCalGuide(true)}
                                        className="btn-s"
                                    >
                                        <i className="bi bi-book"></i> Ver guía de ayuda
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="lbl flex justify-between">
                                            <span>Cal.com API Key <span className="text-[#ef4444]">*</span></span>
                                            <span className="text-[11px] font-normal text-[var(--gris-texto)] flex items-center gap-1"><i className="bi bi-shield-check"></i> Encriptado</span>
                                        </label>
                                        <input
                                            type="password"
                                            className={`inp ${errors.calApiKey ? 'border-[#ef4444]' : ''}`}
                                            value={calApiKey}
                                            onChange={e => updateField('calApiKey', e.target.value)}
                                            placeholder="Introduce tu clave de API de Cal.com"
                                        />
                                        <p className="hint mt-1.5 flex items-center gap-1">
                                            <i className="bi bi-info-circle"></i> Cal.com → Configuración → Developer → API Keys
                                        </p>
                                    </div>

                                    <div>
                                        <label className="lbl">Event Type ID <span className="text-[#ef4444]">*</span></label>
                                        <input
                                            type="text"
                                            className={`inp ${errors.calEventId ? 'border-[#ef4444]' : ''}`}
                                            value={calEventId}
                                            onChange={e => updateField('calEventId', e.target.value)}
                                            placeholder="Ej: 1427703"
                                        />
                                        <p className="hint mt-1.5">ID numérico que aparece en la URL del evento.</p>
                                    </div>

                                    <div>
                                        <label className="lbl">Zona horaria <span className="text-[#ef4444]">*</span></label>
                                        <div className="relative">
                                            <select
                                                className={`inp sel ${errors.calTimezone ? 'border-[#ef4444]' : ''}`}
                                                value={calTimezone}
                                                onChange={e => updateField('calTimezone', e.target.value)}
                                            >
                                                <option value="" disabled>Seleccionar zona horaria</option>
                                                {timezones.map(tz => (
                                                    <option key={tz} value={tz}>{tz}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="lbl">Cal.com Link <span className="text-[var(--gris-texto)] font-normal">(opcional)</span></label>
                                        <input
                                            type="text"
                                            className="inp"
                                            value={calUrl}
                                            onChange={e => updateField('calUrl', e.target.value)}
                                            placeholder="https://cal.com/usuario/evento"
                                        />
                                    </div>

                                    <div className="md:col-span-2 mt-4 p-5 bg-[#f8fafc] border border-[var(--gris-borde)] rounded-2xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h4 className="text-[14px] font-bold text-[var(--oscuro)]">Permitir cancelación de citas</h4>
                                                <p className="text-[13px] text-[var(--gris-texto)] mt-0.5">El agente podrá anular citas si el usuario lo solicita.</p>
                                            </div>
                                            <ToggleSwitch 
                                                checked={enableCalCancellation} 
                                                onChange={(v) => updateField('enableCalCancellation', v)} 
                                                id="enableCalCancellation" 
                                            />
                                        </div>
                                        
                                        <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-xl p-4 flex gap-3 items-start">
                                            <i className="bi bi-info-circle-fill text-[var(--azul)] text-[16px] mt-0.5"></i>
                                            <div className="text-[13px] text-[#1e40af] leading-relaxed">
                                                <strong>Lógica de reagendado:</strong> Para cambiar una cita, el agente cancelará la actual y agendará una nueva. Requiere activar esta opción.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        )}
                    </div>

                    <div className="h-px bg-[#f1f5f9] my-10"></div>

                    {/* DATOS A RECOGER */}
                    <div className="space-y-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-[var(--azul)]/10 flex items-center justify-center text-[var(--azul)]">
                                    <i className="bi bi-bar-chart-line text-[22px]"></i>
                                </div>
                                <h2 className="text-[20px] font-bold text-[var(--oscuro)]">Análisis de la llamada</h2>
                            </div>
                            <p className="text-[14px] text-[var(--gris-texto)]">Extracción automática de datos estructurados al finalizar la conversación.</p>
                        </div>

                        <div className="bg-[#eff6ff] border border-[var(--azul)]/10 rounded-2xl p-5 flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-[var(--azul)] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                                <i className="bi bi-info-lg text-white"></i>
                            </div>
                            <p className="text-[14px] text-[#1e40af] leading-relaxed m-0">
                                El sistema analiza automáticamente las conversaciones finalizadas. Ofrecemos variables predefinidas e inteligentes, y puedes añadir campos personalizados adaptados a tus KPIs de negocio.
                            </p>
                        </div>

                        <div>
                            <h4 className="text-[12px] font-bold text-[var(--gris-texto)] tracking-widest uppercase mb-4">Métricas Inteligentes Predefinidas</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { title: 'Resumen', desc: 'Captura lo más importante de la llamada.', type: 'Texto', icon: 'bi-list-task' },
                                    { title: 'Éxito', desc: '¿Se cumplió el objetivo del agente?', type: 'Si/No', icon: 'bi-check2-circle' },
                                    { title: 'Sentimiento', desc: 'Estado de ánimo del cliente.', type: 'Texto', icon: 'bi-emoji-smile' },
                                ].map((item, i) => (
                                    <div key={i} className="bg-white border border-[var(--gris-borde)] rounded-xl p-4 flex flex-col gap-3 opacity-80 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="w-9 h-9 bg-[#f8fafc] rounded-lg flex items-center justify-center text-[var(--gris-texto)]">
                                                <i className={`bi ${item.icon} text-[18px]`}></i>
                                            </div>
                                            <span className="text-[10px] font-bold px-2 py-1 bg-[#f1f5f9] rounded text-[var(--gris-texto)] uppercase">{item.type}</span>
                                        </div>
                                        <div>
                                            <div className="text-[14px] font-bold text-[var(--oscuro)]">{item.title}</div>
                                            <div className="text-[12px] text-[var(--gris-texto)] leading-snug mt-1">{item.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[12px] font-bold text-[var(--gris-texto)] tracking-widest uppercase mb-4">Nueva Categoría de Análisis</h4>
                            <p className="text-[13px] text-[var(--gris-texto)] mb-6">Selecciona el tipo de dato que deseas que el agente extraiga automáticamente:</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { name: 'Texto', desc: 'Info textual.', icon: 'bi-fonts', typeVal: 'string' },
                                    { name: 'Selector', desc: 'Opciones fijas.', icon: 'bi-list-columns-reverse', typeVal: 'enum' },
                                    { name: 'Booleano', desc: 'Acierto/Error.', icon: 'bi-check2-circle', typeVal: 'boolean' },
                                    { name: 'Número', desc: 'Valor cifrado.', icon: 'bi-hash', typeVal: 'number' },
                                ].map((t, i) => (
                                    <div key={i} 
                                         onClick={() => addVariable(t.typeVal)}
                                         className="border border-[var(--gris-borde)] bg-white hover:border-[var(--azul)] hover:shadow-md cursor-pointer transition-all rounded-xl p-4 flex flex-col items-center text-center group active:scale-95">
                                        <div className="w-12 h-12 rounded-xl bg-[#f8fafc] flex items-center justify-center text-[var(--gris-texto)] group-hover:text-[var(--azul)] group-hover:bg-[var(--azul)]/5 transition-all mb-3 text-[22px]">
                                            <i className={`bi ${t.icon}`}></i>
                                        </div>
                                        <div className="text-[13px] font-bold text-[var(--oscuro)] group-hover:text-[var(--azul)] transition-colors">{t.name}</div>
                                        <div className="text-[11px] text-[var(--gris-texto)] mt-1">{t.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {extractionVariables.length > 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h4 className="text-[12px] font-bold text-[var(--gris-texto)] tracking-widest uppercase">Variables Configuradas</h4>
                                {extractionVariables.map((v, idx) => (
                                    <div key={idx} className="bg-white border border-[var(--gris-borde)] rounded-2xl p-6 shadow-sm hover:border-[var(--azul)]/20 transition-all relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-[var(--azul)]/20 group-hover:bg-[var(--azul)] transition-all"></div>
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--azul)]/5 flex items-center justify-center text-[var(--azul)]">
                                                    <i className={`bi ${v.type === 'string' ? 'bi-fonts' : v.type === 'boolean' ? 'bi-check2-circle' : v.type === 'number' ? 'bi-hash' : 'bi-list-columns-reverse'}`}></i>
                                                </div>
                                                <span className="text-[12px] font-bold text-[var(--azul)] uppercase tracking-wider">{v.type === 'string' ? 'Texto' : v.type === 'boolean' ? 'Booleano' : v.type === 'number' ? 'Número' : 'Selector'}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => updateField('extractionVariables', extractionVariables.filter((_, i) => i !== idx))}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94a3b8] hover:bg-[#ef4444]/10 hover:text-[#ef4444] transition-all"
                                            >
                                                <i className="bi bi-x-lg"></i>
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="lbl">Nombre de la variable <span className="text-[#ef4444]">*</span></label>
                                                <input
                                                    type="text"
                                                    className="inp"
                                                    placeholder="Ej: punto_de_accion"
                                                    value={v.name}
                                                    onChange={e => {
                                                        const updated = [...extractionVariables];
                                                        updated[idx].name = e.target.value.toLowerCase().replace(/\s/g, '_');
                                                        updateField('extractionVariables', updated);
                                                    }}
                                                />
                                                <p className="hint mt-1.5 italic">Sin espacios, solo minúsculas y guiones bajos.</p>
                                            </div>
                                            <div>
                                                <label className="lbl">Instrucciones de extracción <span className="text-[#ef4444]">*</span></label>
                                                <input
                                                    type="text"
                                                    className="inp"
                                                    placeholder="Ej: Resume los acuerdos alcanzados..."
                                                    value={v.description}
                                                    onChange={e => {
                                                        const updated = [...extractionVariables];
                                                        updated[idx].description = e.target.value;
                                                        updateField('extractionVariables', updated);
                                                    }}
                                                />
                                                <p className="hint mt-1.5">Guía al agente sobre qué fragmento capturar.</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ACTIONS */}
                    <div className="wiz-footer mt-12 bg-[#f8fafc] -mx-8 -mb-8 p-8 rounded-b-2xl border-t border-[var(--gris-borde)]">
                        <button
                            type="button"
                            onClick={prevStep}
                            className="btn-s"
                        >
                            <i className="bi bi-arrow-left"></i> Anterior
                        </button>
                        <button
                            type="submit"
                            className="btn-p"
                        >
                            Siguiente paso <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            </div>

            {/* MODAL GUÍA CAL.COM */}
            {showCalGuide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-[var(--oscuro)]/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowCalGuide(false)}></div>
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[550px] z-10 overflow-hidden animate-in fade-in zoom-in duration-300 border border-[var(--gris-borde)]">
                        <div className="p-8 pb-0">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="w-12 h-12 rounded-2xl bg-[var(--azul)]/10 flex items-center justify-center text-[var(--azul)]">
                                    <i className="bi bi-calendar-check text-[24px]"></i>
                                </div>
                                <div>
                                    <h2 className="text-[22px] font-bold text-[var(--oscuro)]">Guía de integración Cal.com</h2>
                                    <p className="text-[14px] text-[var(--gris-texto)] m-0">Sincroniza tu agenda con el agente de voz.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
                            <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-2xl p-5">
                                <h3 className="text-[13px] font-bold text-[#92400e] mb-3 uppercase tracking-wider flex items-center gap-2">
                                    <i className="bi bi-shield-lock"></i> Requisitos Previos
                                </h3>
                                <ul className="space-y-3 m-0">
                                    {[
                                        'Cuenta activa en Cal.com',
                                        'Event Type configurado (30 min, 1h...)',
                                        'API Key (Configuración → Developer)'
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-[13px] text-[#92400e] font-medium">
                                            <i className="bi bi-check-circle-fill text-[#d97706]/60"></i> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-8">
                                {[
                                    { step: 1, title: 'Obtén tu API Key', desc: <>En Cal.com: <strong>Configuración → Developer → API Keys</strong>. Genera una nueva y cópiala.</> },
                                    { step: 2, title: 'Identifica el Event Type ID', desc: <>Entra en tu evento y copia el número final de la URL:</>, code: '.../evento/1427703' },
                                    { step: 3, title: 'Configura la zona horaria', desc: <>Asegúrate de que coincide con la de tu cuenta de Cal.com para evitar errores de agenda.</> }
                                ].map((s, i) => (
                                    <div key={i} className="flex gap-5">
                                        <div className="w-8 h-8 rounded-full bg-[var(--azul)] text-white flex items-center justify-center font-bold text-[14px] flex-shrink-0 shadow-lg shadow-[var(--azul)]/20">
                                            {s.step}
                                        </div>
                                        <div className="pt-0.5">
                                            <h4 className="font-bold text-[var(--oscuro)] text-[15px] mb-1.5">{s.title}</h4>
                                            <p className="text-[14px] text-[var(--gris-texto)] leading-relaxed m-0">{s.desc}</p>
                                            {s.code && (
                                                <div className="mt-3 bg-[#f8fafc] border border-[var(--gris-borde)] rounded-xl px-4 py-2.5 font-mono text-[12px] text-[var(--azul)]">
                                                    {s.code}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-2xl p-5 flex gap-4 items-start">
                                <i className="bi bi-lightning-charge-fill text-[var(--azul)] text-[18px]"></i>
                                <p className="text-[13px] text-[#1e40af] leading-relaxed m-0">
                                    Una vez configurado, el agente podrá responder a preguntas como &quot;¿Tienes hueco mañana por la tarde?&quot; y proceder a la reserva automáticamente.
                                </p>
                            </div>
                        </div>

                        <div className="p-8 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowCalGuide(false)}
                                className="btn-p w-full justify-center py-3.5 rounded-2xl shadow-xl shadow-[var(--azul)]/20"
                            >
                                Entendido, configurar ahora
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
