"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';

interface LeadQuestion {
    question: string;
    key: string;
    failAction?: 'end_call' | 'transfer' | 'booking' | 'continue';
}

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
        <div className="content-area" style={{ padding: '40px' }}>
            <WizardStepHeader
                title="Herramientas del agente"
                subtitle="Activa las acciones que tu agente puede realizar durante las llamadas."
                showArrows={false}
            />

            <div className="wizard-info-box">
                <i className="bi bi-info-circle-fill"></i>
                <div>
                    <p><strong>Herramientas y Automatización:</strong> Estas funciones permiten que tu agente interactúe con el mundo exterior. Puedes filtrar clientes interesados, transferir llamadas a humanos o incluso agendar citas directamente en tu calendario.</p>
                </div>
            </div>

            <form onSubmit={handleNext} style={{ maxWidth: '900px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    
                    {/* 1. CUALIFICACIÓN */}
                    <div style={{ 
                        background: 'white', 
                        border: '1px solid var(--slate-200)', 
                        borderRadius: '20px', 
                        padding: '32px',
                        transition: 'all 0.3s'
                    }}>
                        <div className="flex-between" style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div className="flex-center" style={{ 
                                    width: '48px', 
                                    height: '48px', 
                                    borderRadius: '14px', 
                                    background: leadQuestions.length > 0 ? 'var(--azul)' : 'var(--slate-100)',
                                    color: leadQuestions.length > 0 ? 'white' : 'var(--slate-400)',
                                    fontSize: '24px'
                                }}>
                                    <i className="bi bi-check2-square"></i>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--slate-900)' }}>Cualificar contacto antes de actuar</h3>
                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--slate-500)', lineHeight: '1.4' }}>Filtra leads automáticamente según tus criterios antes de agendar o transferir.</p>
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
                            <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '32px', animation: 'fadeIn 0.4s ease' }}>
                                <div className="flex-between" style={{ marginBottom: '24px' }}>
                                    <h4 style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '1px' }}>Pasos de cualificación</h4>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-500)', background: 'var(--slate-100)', padding: '4px 12px', borderRadius: '20px' }}>
                                        {leadQuestions.length} / 3 preguntas
                                    </span>
                                </div>

                                <div style={{ 
                                    background: 'rgba(255, 153, 0, 0.05)', 
                                    border: '1px solid rgba(255, 153, 0, 0.2)', 
                                    borderRadius: '12px', 
                                    padding: '16px', 
                                    display: 'flex', 
                                    gap: '12px', 
                                    marginBottom: '24px' 
                                }}>
                                    <i className="bi bi-exclamation-triangle-fill" style={{ color: '#f59e0b', fontSize: '18px' }}></i>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#92400e', fontWeight: 500 }}>
                                        <strong>Máximo 3 preguntas.</strong> En voz, un flujo corto aumenta significativamente la tasa de conversión.
                                    </p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {leadQuestions.map((q: LeadQuestion, idx: number) => (
                                        <div key={idx} style={{ 
                                            background: 'var(--slate-50)', 
                                            border: '1px solid var(--slate-200)', 
                                            borderRadius: '16px', 
                                            padding: '24px', 
                                            position: 'relative' 
                                        }}>
                                            <div className="flex-between" style={{ marginBottom: '20px' }}>
                                                <span style={{ 
                                                    background: 'white', 
                                                    color: 'var(--azul)', 
                                                    fontSize: '11px', 
                                                    fontWeight: 800, 
                                                    padding: '4px 12px', 
                                                    borderRadius: '8px', 
                                                    border: '1px solid rgba(0, 102, 255, 0.2)' 
                                                }}>
                                                    PREGUNTA {idx + 1}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = leadQuestions.filter((_, i) => i !== idx);
                                                        updateField('leadQuestions', updated);
                                                    }}
                                                    style={{ 
                                                        color: '#ef4444', 
                                                        background: 'white', 
                                                        border: '1px solid #fee2e2', 
                                                        width: '32px', 
                                                        height: '32px', 
                                                        borderRadius: '8px', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <i className="bi bi-trash3"></i>
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                <div>
                                                    <label className="lbl" style={{ marginBottom: '8px', display: 'block', fontWeight: 700 }}>¿Qué pregunta hará el agente? <span style={{ color: 'var(--error)' }}>*</span></label>
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
                                                        style={{ borderRadius: '10px' }}
                                                    />
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                    <div>
                                                        <label className="lbl" style={{ marginBottom: '8px', display: 'block', fontWeight: 700 }}>Cualifica si... <span style={{ color: 'var(--error)' }}>*</span></label>
                                                        <input
                                                            type="text"
                                                            className="inp"
                                                            placeholder="Ej: Menciona cualquier cifra"
                                                            value={q.key}
                                                            onChange={e => {
                                                                const updated = [...leadQuestions];
                                                                updated[idx].key = e.target.value;
                                                                updateField('leadQuestions', updated);
                                                            }}
                                                            style={{ borderRadius: '10px' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="lbl" style={{ marginBottom: '8px', display: 'block', fontWeight: 700 }}>Si no cualifica</label>
                                                        <select
                                                            className="inp"
                                                            value={q.failAction || 'end_call'}
                                                            onChange={e => {
                                                                const updated = [...leadQuestions];
                                                                updated[idx].failAction = e.target.value as LeadQuestion['failAction'];
                                                                updateField('leadQuestions', updated);
                                                            }}
                                                            style={{ borderRadius: '10px', padding: '10px' }}
                                                        >
                                                            <option value="end_call">Terminar la llamada</option>
                                                            <option value="booking">Agendar cita</option>
                                                            <option value="continue">Continuar sin cualificar</option>
                                                            <option value="transfer">Transferir llamada</option>
                                                        </select>
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
                                        className="btn-s"
                                        style={{ marginTop: '24px', borderRadius: '10px', width: '100%', justifyContent: 'center' }}
                                    >
                                        <i className="bi bi-plus-lg"></i> Añadir pregunta de filtro
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 2. TRANSFERENCIA */}
                    <div style={{ 
                        background: 'white', 
                        border: '1px solid var(--slate-200)', 
                        borderRadius: '20px', 
                        padding: '32px',
                        transition: 'all 0.3s'
                    }}>
                        <div className="flex-between" style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div className="flex-center" style={{ 
                                    width: '48px', 
                                    height: '48px', 
                                    borderRadius: '14px', 
                                    background: enableTransfer ? 'var(--azul)' : 'var(--slate-100)',
                                    color: enableTransfer ? 'white' : 'var(--slate-400)',
                                    fontSize: '24px'
                                }}>
                                    <i className="bi bi-telephone-outbound"></i>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--slate-900)' }}>Transferir llamada</h3>
                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--slate-500)', lineHeight: '1.4' }}>Permite que el agente pase la llamada a un humano en momentos clave.</p>
                                </div>
                            </div>
                            <ToggleSwitch checked={enableTransfer} onChange={(v) => updateField('enableTransfer', v)} id="enableTransfer" />
                        </div>
                        
                        {enableTransfer && (
                            <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '32px', animation: 'fadeIn 0.4s ease' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {transferDestinations.map((dest, idx) => (
                                        <div key={idx} style={{ 
                                            background: 'var(--slate-50)', 
                                            border: '1px solid var(--slate-200)', 
                                            borderRadius: '16px', 
                                            padding: '20px', 
                                            position: 'relative' 
                                        }}>
                                            <button
                                                type="button"
                                                onClick={() => updateField('transferDestinations', transferDestinations.filter((_, i) => i !== idx))}
                                                style={{ 
                                                    position: 'absolute', 
                                                    top: '16px', 
                                                    right: '16px', 
                                                    color: 'var(--slate-400)',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <i className="bi bi-trash3"></i>
                                            </button>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', paddingRight: '32px' }}>
                                                <div>
                                                    <label className="lbl" style={{ marginBottom: '8px', display: 'block', fontWeight: 700 }}>Nombre / Dept <span style={{ color: 'var(--error)' }}>*</span></label>
                                                    <input
                                                        type="text"
                                                        className="inp"
                                                        placeholder="Ej: Ventas"
                                                        value={dest.name}
                                                        onChange={e => {
                                                            const d = [...transferDestinations];
                                                            d[idx].name = e.target.value;
                                                            updateField('transferDestinations', d);
                                                        }}
                                                        style={{ borderRadius: '10px' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="lbl" style={{ marginBottom: '8px', display: 'block', fontWeight: 700 }}>Número <span style={{ color: 'var(--error)' }}>*</span></label>
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
                                                        style={{ borderRadius: '10px' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addTransferDestination}
                                        className="btn-s"
                                        style={{ marginTop: '8px', borderRadius: '10px', width: '100%', justifyContent: 'center' }}
                                    >
                                        <i className="bi bi-plus-lg"></i> Añadir destino de transferencia
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. CAL.COM */}
                    <div style={{ 
                        background: 'white', 
                        border: '1px solid var(--slate-200)', 
                        borderRadius: '20px', 
                        padding: '32px',
                        transition: 'all 0.3s'
                    }}>
                        <div className="flex-between" style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div className="flex-center" style={{ 
                                    width: '48px', 
                                    height: '48px', 
                                    borderRadius: '14px', 
                                    background: enableCalBooking ? 'var(--azul)' : 'var(--slate-100)',
                                    color: enableCalBooking ? 'white' : 'var(--slate-400)',
                                    fontSize: '24px'
                                }}>
                                    <i className="bi bi-calendar-check"></i>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--slate-900)' }}>Reservar cita (Cal.com)</h3>
                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--slate-500)', lineHeight: '1.4' }}>Integración nativa para agendar citas automáticamente en tu calendario.</p>
                                </div>
                            </div>
                            <ToggleSwitch checked={enableCalBooking} onChange={(v) => updateField('enableCalBooking', v)} id="enableCalBooking" />
                        </div>
                        
                        {enableCalBooking && (
                             <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '32px', animation: 'fadeIn 0.4s ease' }}>
                                <div className="flex-between" style={{ marginBottom: '32px' }}>
                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--slate-500)', maxWidth: '400px' }}>Configura la integración para que tu agente pueda consultar disponibilidad y reservar citas.</p>
                                    <button 
                                        type="button"
                                        onClick={() => setShowCalGuide(true)}
                                        className="btn-s"
                                        style={{ fontSize: '12px', padding: '8px 16px', borderRadius: '10px' }}
                                    >
                                        <i className="bi bi-book"></i> Guía de ayuda
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label className="lbl" style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                            <span>Cal.com API Key <span style={{ color: 'var(--error)' }}>*</span></span>
                                            <span style={{ fontSize: '11px', color: 'var(--slate-400)', fontWeight: 500 }}><i className="bi bi-shield-check"></i> Encriptado</span>
                                        </label>
                                        <input
                                            type="password"
                                            className="inp"
                                            value={calApiKey}
                                            onChange={e => updateField('calApiKey', e.target.value)}
                                            placeholder="Introduce tu clave de API de Cal.com"
                                            style={{ borderRadius: '10px' }}
                                        />
                                    </div>

                                    <div>
                                        <label className="lbl" style={{ marginBottom: '8px', display: 'block', fontWeight: 700 }}>Event Type ID <span style={{ color: 'var(--error)' }}>*</span></label>
                                        <input
                                            type="text"
                                            className="inp"
                                            value={calEventId}
                                            onChange={e => updateField('calEventId', e.target.value)}
                                            placeholder="Ej: 1427703"
                                            style={{ borderRadius: '10px' }}
                                        />
                                    </div>

                                    <div>
                                        <label className="lbl" style={{ marginBottom: '8px', display: 'block', fontWeight: 700 }}>Zona horaria <span style={{ color: 'var(--error)' }}>*</span></label>
                                        <select
                                            className="inp"
                                            value={calTimezone}
                                            onChange={e => updateField('calTimezone', e.target.value)}
                                            style={{ borderRadius: '10px', padding: '10px' }}
                                        >
                                            <option value="" disabled>Seleccionar zona...</option>
                                            {timezones.map(tz => (
                                                <option key={tz} value={tz}>{tz}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ gridColumn: 'span 2', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: '16px', padding: '20px' }}>
                                        <div className="flex-between" style={{ marginBottom: '16px' }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--slate-900)' }}>Permitir cancelación de citas</h4>
                                                <p style={{ margin: 0, fontSize: '12px', color: 'var(--slate-500)', marginTop: '2px' }}>El agente podrá anular citas si el usuario lo solicita.</p>
                                            </div>
                                            <ToggleSwitch 
                                                checked={enableCalCancellation} 
                                                onChange={(v) => updateField('enableCalCancellation', v)} 
                                                id="enableCalCancellation" 
                                            />
                                        </div>
                                        
                                        <div style={{ background: 'rgba(0, 102, 255, 0.05)', borderRadius: '12px', padding: '12px', display: 'flex', gap: '12px' }}>
                                            <i className="bi bi-info-circle-fill" style={{ color: 'var(--azul)', fontSize: '16px' }}></i>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#1e40af', lineHeight: '1.5' }}>
                                                <strong>Lógica de reagendado:</strong> Para cambiar una cita, el agente cancelará la actual y agendará una nueva.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        )}
                    </div>

                    <div style={{ height: '1px', background: 'var(--slate-100)', margin: '16px 0' }}></div>

                    {/* DATOS A RECOGER */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <div className="flex-center" style={{ width: '40px', height: '40px', background: 'rgba(0, 102, 255, 0.1)', color: 'var(--azul)', borderRadius: '12px', fontSize: '20px' }}>
                                    <i className="bi bi-bar-chart-line"></i>
                                </div>
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)' }}>Análisis de la llamada</h2>
                            </div>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--slate-500)' }}>Extracción automática de datos estructurados al finalizar la conversación.</p>
                        </div>

                        <div className="wizard-info-box" style={{ background: 'rgba(0, 102, 255, 0.03)', borderColor: 'var(--azul-claro)' }}>
                            <i className="bi bi-lightning-charge-fill" style={{ color: 'var(--azul)' }}></i>
                            <div>
                                <p style={{ color: '#1e40af' }}>El sistema analiza automáticamente las conversaciones finalizadas. Ofrecemos variables inteligentes y puedes añadir campos personalizados adaptados a tu negocio.</p>
                            </div>
                        </div>

                        <div>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '1px' }}>Métricas predefinidas</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                {[
                                    { title: 'Resumen', desc: 'Resumen ejecutivo de la llamada.', type: 'Texto', icon: 'bi-list-task' },
                                    { title: 'Éxito', desc: '¿Se cumplió el objetivo?', type: 'Si/No', icon: 'bi-check2-circle' },
                                    { title: 'Sentimiento', desc: 'Estado de ánimo del cliente.', type: 'Texto', icon: 'bi-emoji-smile' },
                                ].map((item, i) => (
                                    <div key={i} style={{ background: 'white', border: '1px solid var(--slate-200)', borderRadius: '16px', padding: '20px', opacity: 0.8 }}>
                                        <div className="flex-between" style={{ marginBottom: '12px' }}>
                                            <div className="flex-center" style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--slate-100)', color: 'var(--slate-500)', fontSize: '18px' }}>
                                                <i className={`bi ${item.icon}`}></i>
                                            </div>
                                            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--slate-400)', background: 'var(--slate-100)', padding: '2px 8px', borderRadius: '4px' }}>{item.type}</span>
                                        </div>
                                        <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--slate-900)', marginBottom: '4px' }}>{item.title}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--slate-500)', lineHeight: '1.4' }}>{item.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '1px' }}>Añadir variable personalizada</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                {[
                                    { name: 'Texto', icon: 'bi-fonts', typeVal: 'string' },
                                    { name: 'Selector', icon: 'bi-list-columns-reverse', typeVal: 'enum' },
                                    { name: 'Booleano', icon: 'bi-check2-circle', typeVal: 'boolean' },
                                    { name: 'Número', icon: 'bi-hash', typeVal: 'number' },
                                ].map((t, i) => (
                                    <div key={i} 
                                         onClick={() => addVariable(t.typeVal)}
                                         style={{ 
                                             background: 'white', 
                                             border: '1px solid var(--slate-200)', 
                                             borderRadius: '16px', 
                                             padding: '16px', 
                                             display: 'flex', 
                                             flexDirection: 'column', 
                                             alignItems: 'center', 
                                             cursor: 'pointer',
                                             transition: 'all 0.2s'
                                         }}
                                         className="hover-card"
                                    >
                                        <i className={`bi ${t.icon}`} style={{ fontSize: '24px', color: 'var(--slate-400)', marginBottom: '8px' }}></i>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-900)' }}>{t.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {extractionVariables.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {extractionVariables.map((v, idx) => (
                                    <div key={idx} style={{ 
                                        background: 'white', 
                                        border: '1px solid var(--slate-200)', 
                                        borderRadius: '16px', 
                                        padding: '24px', 
                                        position: 'relative',
                                        borderLeft: '4px solid var(--azul)'
                                    }}>
                                        <div className="flex-between" style={{ marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <i className="bi bi-tag-fill" style={{ color: 'var(--azul)', fontSize: '14px' }}></i>
                                                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--azul)', textTransform: 'uppercase' }}>Variable: {v.type}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => updateField('extractionVariables', extractionVariables.filter((_, i) => i !== idx))}
                                                style={{ color: 'var(--slate-400)', background: 'none', border: 'none', cursor: 'pointer' }}
                                            >
                                                <i className="bi bi-x-lg"></i>
                                            </button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div>
                                                <label className="lbl" style={{ marginBottom: '8px', display: 'block', fontWeight: 700 }}>Nombre <span style={{ color: 'var(--error)' }}>*</span></label>
                                                <input
                                                    type="text"
                                                    className="inp"
                                                    placeholder="Ej: presupuesto"
                                                    value={v.name}
                                                    onChange={e => {
                                                        const updated = [...extractionVariables];
                                                        updated[idx].name = e.target.value.toLowerCase().replace(/\s/g, '_');
                                                        updateField('extractionVariables', updated);
                                                    }}
                                                    style={{ borderRadius: '10px' }}
                                                />
                                            </div>
                                            <div>
                                                <label className="lbl" style={{ marginBottom: '8px', display: 'block', fontWeight: 700 }}>Instrucciones <span style={{ color: 'var(--error)' }}>*</span></label>
                                                <input
                                                    type="text"
                                                    className="inp"
                                                    placeholder="¿Qué quieres extraer?"
                                                    value={v.description}
                                                    onChange={e => {
                                                        const updated = [...extractionVariables];
                                                        updated[idx].description = e.target.value;
                                                        updateField('extractionVariables', updated);
                                                    }}
                                                    style={{ borderRadius: '10px' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-between" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '48px', marginTop: '48px' }}>
                    <button type="button" className="btn-s" onClick={prevStep} style={{ padding: '12px 24px', borderRadius: '12px' }}>
                        <i className="bi bi-arrow-left"></i> Anterior
                    </button>
                    <button type="submit" className="btn-p" style={{ padding: '12px 32px', borderRadius: '12px' }}>
                        Siguiente paso
                        <i className="bi bi-arrow-right"></i>
                    </button>
                </div>
            </form>

            {/* MODAL GUÍA CAL.COM */}
            {showCalGuide && (
                <div style={{ 
                    position: 'fixed', 
                    inset: 0, 
                    zIndex: 9999, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '24px',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div 
                        onClick={() => setShowCalGuide(false)}
                        style={{ 
                            position: 'absolute', 
                            inset: 0, 
                            background: 'rgba(15, 23, 42, 0.6)', 
                            backdropFilter: 'blur(8px)' 
                        }} 
                    />
                    <div style={{ 
                        position: 'relative', 
                        background: 'white', 
                        width: '100%', 
                        maxWidth: '600px', 
                        borderRadius: '32px', 
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div className="flex-center" style={{ width: '40px', height: '40px', background: 'var(--azul)', color: 'white', borderRadius: '12px' }}>
                                    <i className="bi bi-calendar-star" style={{ fontSize: '20px' }}></i>
                                </div>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)' }}>Configurar Cal.com</h3>
                            </div>
                            <button 
                                onClick={() => setShowCalGuide(false)}
                                style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'var(--slate-100)', color: 'var(--slate-500)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        
                        <div style={{ padding: '40px', maxHeight: '70vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <div className="flex-center" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--azul)', color: 'white', fontSize: '14px', fontWeight: 800, flexShrink: 0 }}>1</div>
                                    <div>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 800, color: 'var(--slate-900)' }}>Obtén tu API Key</h4>
                                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--slate-500)', lineHeight: '1.6' }}>
                                            Inicia sesión en Cal.com, ve a <strong>Settings &gt; Developer &gt; API Keys</strong> y crea una nueva clave. Cópiala y pégala en el campo correspondiente.
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <div className="flex-center" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--azul)', color: 'white', fontSize: '14px', fontWeight: 800, flexShrink: 0 }}>2</div>
                                    <div>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 800, color: 'var(--slate-900)' }}>Busca el Event Type ID</h4>
                                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--slate-500)', lineHeight: '1.6' }}>
                                            En tu panel de Cal.com, haz clic en el evento que quieras usar. El ID es el número que aparece al final de la URL (ej: <code>cal.com/event-types/123456</code>).
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <div className="flex-center" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--azul)', color: 'white', fontSize: '14px', fontWeight: 800, flexShrink: 0 }}>3</div>
                                    <div>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 800, color: 'var(--slate-900)' }}>Variables de Captura</h4>
                                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--slate-500)', lineHeight: '1.4' }}>
                                            Para que la cita se agende correctamente, tu agente <strong>debe preguntar el nombre y el correo electrónico</strong> del usuario durante la llamada.
                                        </p>
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(0, 102, 255, 0.05)', border: '1px solid rgba(0, 102, 255, 0.1)', borderRadius: '20px', padding: '24px', display: 'flex', gap: '16px' }}>
                                    <i className="bi bi-lightbulb-fill" style={{ color: 'var(--azul)', fontSize: '20px' }}></i>
                                    <div>
                                        <h5 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800, color: 'var(--azul)' }}>Consejo Pro</h5>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#1e40af', lineHeight: '1.5' }}>
                                            Asegúrate de que el evento en Cal.com no tenga demasiadas preguntas obligatorias personalizadas, ya que el agente solo preguntará lo básico para agendar.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '24px 40px', background: 'var(--slate-50)', borderTop: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                type="button"
                                onClick={() => setShowCalGuide(false)}
                                className="btn-p"
                                style={{ borderRadius: '12px' }}
                            >
                                Entendido, gracias
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
