"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';

interface LeadQuestion {
    question: string;
    key: string;
    failAction?: 'end_call' | 'transfer' | 'booking' | 'continue';
}

// Global Toggle Switch Component for v2
const PremiumToggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; id: string }> = ({ checked, onChange, id }) => (
    <label className="premium-toggle">
        <input
            type="checkbox"
            id={id}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
        />
        <span className="premium-toggle-slider"></span>
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

    const timezones = [
        'Europe/Madrid', 'Europe/London', 'Europe/Paris', 'America/New_York',
        'America/Los_Angeles', 'America/Mexico_City', 'America/Bogota', 'America/Argentina/Buenos_Aires',
    ];

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (enableCalBooking) {
            if (!calApiKey) newErrors.calApiKey = 'Obligatorio';
            if (!calEventId) newErrors.calEventId = 'Obligatorio';
        }
        if (enableTransfer && transferDestinations.length === 0) {
            newErrors.transfer = 'Añade al menos un destino';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validate()) nextStep();
    };

    const addTransferDestination = () => {
        updateField('transferDestinations', [...transferDestinations, { name: '', description: '', number: '' }]);
    };

    const addLeadQuestion = () => {
        if (leadQuestions.length >= 3) return;
        updateField('leadQuestions', [...leadQuestions, { question: '', key: '', failAction: 'end_call' }]);
    };

    const addVariable = (type: string) => {
        updateField('extractionVariables', [...extractionVariables, { name: '', type, description: '', required: true }]);
    };

    return (
        <div className="content-area" style={{ padding: '60px' }}>
            <WizardStepHeader
                title="Herramientas del agente"
                subtitle="Configura las capacidades interactivas y automatizaciones."
                showArrows={false}
            />

            <div style={{ maxWidth: '1000px', marginTop: '40px' }}>
                <div style={{ 
                    background: 'var(--azul-light)', 
                    border: '1.5px solid rgba(37, 99, 235, 0.1)',
                    borderRadius: '20px', 
                    padding: '24px 32px', 
                    display: 'flex', 
                    gap: '20px', 
                    alignItems: 'center',
                    marginBottom: '48px',
                    boxShadow: '0 4px 20px rgba(37, 99, 235, 0.05)'
                }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--azul)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                        <i className="bi bi-gear-wide-connected"></i>
                    </div>
                    <p style={{ margin: 0, color: 'var(--slate-700)', fontSize: '15px', fontWeight: 600, lineHeight: '1.5' }}>
                        <strong>Automatización:</strong> Activa herramientas para que tu agente pueda agendar citas, transferir llamadas o extraer datos estructurados automáticamente.
                    </p>
                </div>

                <div style={{ display: 'grid', gap: '32px' }}>
                    
                    {/* CUALIFICACIÓN CARD */}
                    <div className="card-premium" style={{ padding: '40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: leadQuestions.length > 0 ? '40px' : 0 }}>
                            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                <div style={{ 
                                    width: '64px', height: '64px', borderRadius: '20px', 
                                    background: leadQuestions.length > 0 ? 'var(--azul)' : 'var(--slate-50)',
                                    color: leadQuestions.length > 0 ? 'white' : 'var(--slate-400)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
                                    transition: 'all 0.3s',
                                    boxShadow: leadQuestions.length > 0 ? '0 10px 20px rgba(37, 99, 235, 0.2)' : 'none'
                                }}>
                                    <i className="bi bi-funnel-fill"></i>
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)', letterSpacing: '-0.02em' }}>Cualificación de Leads</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '15px', color: 'var(--slate-500)', fontWeight: 500 }}>Filtra clientes antes de realizar acciones críticas.</p>
                                </div>
                            </div>
                            <PremiumToggle 
                                checked={leadQuestions.length > 0} 
                                onChange={(val) => val ? addLeadQuestion() : updateField('leadQuestions', [])} 
                                id="qualifier" 
                            />
                        </div>

                        {leadQuestions.length > 0 && (
                            <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '40px', animation: 'slideDown 0.3s ease-out' }}>
                                <div style={{ display: 'grid', gap: '24px' }}>
                                    {leadQuestions.map((q, idx) => (
                                        <div key={idx} style={{ background: 'var(--slate-50)', borderRadius: '24px', padding: '32px', border: '1.5px solid var(--slate-100)', position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--azul)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'white', padding: '4px 12px', borderRadius: '30px', border: '1.5px solid var(--azul-light)' }}>Filtro {idx + 1}</span>
                                                </div>
                                                <button onClick={() => updateField('leadQuestions', leadQuestions.filter((_, i) => i !== idx))}
                                                        style={{ background: 'white', border: '1.5px solid #fee2e2', color: '#ef4444', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                                    <i className="bi bi-trash3"></i>
                                                </button>
                                            </div>
                                            <div style={{ display: 'grid', gap: '20px' }}>
                                                <div>
                                                    <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--slate-500)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Pregunta de cualificación</label>
                                                    <input type="text" className="inp" placeholder="¿Qué pregunta debe hacer el agente?" value={q.question}
                                                        onChange={e => { const l = [...leadQuestions]; l[idx].question = e.target.value; updateField('leadQuestions', l); }} 
                                                        style={{ borderRadius: '16px', padding: '18px 20px', border: '1px solid var(--slate-100)', background: 'white', fontSize: '15px' }} />
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                    <div>
                                                        <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--slate-500)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Respuesta de éxito</label>
                                                        <input type="text" className="inp" placeholder="Criterio de éxito (ej: Sí)" value={q.key}
                                                            onChange={e => { const l = [...leadQuestions]; l[idx].key = e.target.value; updateField('leadQuestions', l); }}
                                                            style={{ borderRadius: '16px', padding: '18px 20px', background: 'white' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--slate-500)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Acción si falla</label>
                                                        <select className="inp" value={q.failAction} 
                                                            onChange={e => { const l = [...leadQuestions]; l[idx].failAction = e.target.value as any; updateField('leadQuestions', l); }}
                                                            style={{ borderRadius: '16px', padding: '18px 20px', background: 'white' }}>
                                                            <option value="end_call">Terminar llamada</option>
                                                            <option value="continue">Continuar conversación</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {leadQuestions.length < 3 && (
                                        <button onClick={addLeadQuestion} className="btn-s" style={{ width: '100%', justifyContent: 'center', height: '56px', borderRadius: '18px', border: '2px dashed var(--slate-200)', background: 'transparent' }}>
                                            <i className="bi bi-plus-lg" style={{ marginRight: '8px' }}></i> Añadir Filtro Adicional
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* TRANSFERENCIA CARD */}
                    <div className="card-premium" style={{ padding: '40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: enableTransfer ? '40px' : 0 }}>
                            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                <div style={{ 
                                    width: '64px', height: '64px', borderRadius: '20px', 
                                    background: enableTransfer ? 'var(--exito)' : 'var(--slate-50)',
                                    color: enableTransfer ? 'white' : 'var(--slate-400)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
                                    transition: 'all 0.3s',
                                    boxShadow: enableTransfer ? '0 10px 20px rgba(16, 185, 129, 0.2)' : 'none'
                                }}>
                                    <i className="bi bi-telephone-outbound-fill"></i>
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)', letterSpacing: '-0.02em' }}>Transferencia Inteligente</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '15px', color: 'var(--slate-500)', fontWeight: 500 }}>Pasa la llamada a un agente humano dinámicamente.</p>
                                </div>
                            </div>
                            <PremiumToggle checked={enableTransfer} onChange={(v) => updateField('enableTransfer', v)} id="transfer" />
                        </div>
                        {enableTransfer && (
                            <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '40px', animation: 'slideDown 0.3s ease-out' }}>
                                <div style={{ display: 'grid', gap: '20px' }}>
                                    {transferDestinations.map((dest, idx) => (
                                        <div key={idx} style={{ background: 'white', borderRadius: '20px', padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '20px', alignItems: 'center', border: '1.5px solid var(--slate-50)', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>Departamento</label>
                                                <input type="text" className="inp" placeholder="ej: Soporte" value={dest.name} onChange={e => { const d = [...transferDestinations]; d[idx].name = e.target.value; updateField('transferDestinations', d); }} style={{ borderRadius: '12px', padding: '14px 18px', background: 'var(--slate-50)', border: 'none' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>Teléfono de destino</label>
                                                <input type="text" className="inp" placeholder="+34..." value={dest.number} onChange={e => { const d = [...transferDestinations]; d[idx].number = e.target.value; updateField('transferDestinations', d); }} style={{ borderRadius: '12px', padding: '14px 18px', background: 'var(--slate-50)', border: 'none' }} />
                                            </div>
                                            <button onClick={() => updateField('transferDestinations', transferDestinations.filter((_, i) => i !== idx))} style={{ background: '#fef2f2', border: 'none', color: '#ef4444', width: '44px', height: '44px', borderRadius: '12px', cursor: 'pointer', marginTop: '18px' }}>
                                                <i className="bi bi-trash3"></i>
                                            </button>
                                        </div>
                                    ))}
                                    <button onClick={addTransferDestination} className="btn-s" style={{ height: '56px', borderRadius: '18px', justifyContent: 'center', border: '2px dashed var(--slate-200)', background: 'transparent' }}>
                                        <i className="bi bi-plus-lg" style={{ marginRight: '8px' }}></i> Añadir Destino de Transferencia
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CALENDARIO CARD */}
                    <div className="card-premium" style={{ padding: '40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: enableCalBooking ? '40px' : 0 }}>
                            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                <div style={{ 
                                    width: '64px', height: '64px', borderRadius: '20px', 
                                    background: enableCalBooking ? 'var(--purpura)' : 'var(--slate-50)',
                                    color: enableCalBooking ? 'white' : 'var(--slate-400)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
                                    transition: 'all 0.3s',
                                    boxShadow: enableCalBooking ? '0 10px 20px rgba(139, 92, 246, 0.2)' : 'none'
                                }}>
                                    <i className="bi bi-calendar2-check-fill"></i>
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)', letterSpacing: '-0.02em' }}>Citas con Cal.com</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '15px', color: 'var(--slate-500)', fontWeight: 500 }}>Reserva directamente en tu calendario de forma fluida.</p>
                                </div>
                            </div>
                            <PremiumToggle checked={enableCalBooking} onChange={(v) => updateField('enableCalBooking', v)} id="cal" />
                        </div>
                        {enableCalBooking && (
                             <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '40px', animation: 'slideDown 0.3s ease-out' }}>
                                <div style={{ display: 'grid', gap: '24px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--slate-500)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Clave de API de Cal.com</label>
                                        <input type="password" className="inp" placeholder="cal_..." value={calApiKey} onChange={e => updateField('calApiKey', e.target.value)} style={{ borderRadius: '16px', padding: '18px 24px', fontSize: '15px' }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--slate-500)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Tipo de Evento (ID)</label>
                                            <input type="text" className="inp" placeholder="ej: 123456" value={calEventId} onChange={e => updateField('calEventId', e.target.value)} style={{ borderRadius: '16px', padding: '18px' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--slate-500)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Zona Horaria</label>
                                            <select className="inp" value={calTimezone} onChange={e => updateField('calTimezone', e.target.value)} style={{ borderRadius: '16px', padding: '18px' }}>
                                                {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        )}
                    </div>

                    {/* EXTRACCIÓN DE DATOS */}
                    <div style={{ marginTop: '48px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
                            <div className="flex-center" style={{ width: '48px', height: '48px', background: 'var(--azul-light)', color: 'var(--azul)', borderRadius: '14px', fontSize: '20px' }}>
                                <i className="bi bi-database-fill-check"></i>
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--slate-900)', letterSpacing: '-0.02em' }}>Extracción de Información</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '15px', color: 'var(--slate-500)', fontWeight: 500 }}>Captura datos estructurados de la conversación automáticamente.</p>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                            {extractionVariables.map((v, idx) => (
                                <div key={idx} className="card-premium" style={{ padding: '32px', borderLeft: '5px solid var(--azul)', background: 'white' }}>
                                    <div className="flex-between" style={{ marginBottom: '20px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--azul)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--azul-light)', padding: '4px 12px', borderRadius: '30px' }}>Variable: {v.type}</span>
                                        <button onClick={() => updateField('extractionVariables', extractionVariables.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--slate-300)', cursor: 'pointer', fontSize: '18px' }}>
                                            <i className="bi bi-x-circle-fill"></i>
                                        </button>
                                    </div>
                                    <div style={{ display: 'grid', gap: '16px' }}>
                                        <input type="text" className="inp" placeholder="Nombre (ej: email_cliente)" value={v.name} onChange={e => { const vrs = [...extractionVariables]; vrs[idx].name = e.target.value; updateField('extractionVariables', vrs); }} style={{ borderRadius: '12px', padding: '14px 16px', background: 'var(--slate-50)', border: 'none' }} />
                                        <textarea className="inp" placeholder="Instrucciones para la IA..." value={v.description} onChange={e => { const vrs = [...extractionVariables]; vrs[idx].description = e.target.value; updateField('extractionVariables', vrs); }} style={{ borderRadius: '12px', padding: '14px 16px', background: 'var(--slate-50)', border: 'none', minHeight: '80px', resize: 'none', fontSize: '14px' }} />
                                    </div>
                                </div>
                            ))}
                            <div onClick={() => addVariable('string')} 
                                 className="card-premium" 
                                 style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', border: '2px dashed var(--slate-200)', background: 'rgba(248, 250, 252, 0.5)', cursor: 'pointer', transition: 'all 0.2s' }}
                                 onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--azul)'; e.currentTarget.style.background = 'var(--azul-light)'; }}
                                 onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--slate-200)'; e.currentTarget.style.background = 'rgba(248, 250, 252, 0.5)'; }}
                            >
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'white', color: 'var(--slate-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: '1px solid var(--slate-100)' }}>
                                    <i className="bi bi-plus-lg"></i>
                                </div>
                                <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--slate-600)' }}>Añadir variable personalizada</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* BOTTOM ACTIONS */}
                <div className="flex-between" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '60px', marginTop: '80px' }}>
                    <button type="button" className="btn-s" onClick={prevStep} style={{ height: '60px', padding: '0 40px', borderRadius: '20px', fontWeight: 800, fontSize: '16px' }}>
                        Anterior
                    </button>
                    <button type="button" className="btn-p" onClick={handleNext} style={{ height: '60px', padding: '0 56px', borderRadius: '20px', fontWeight: 900, fontSize: '16px', boxShadow: '0 20px 40px -10px rgba(37, 99, 235, 0.4)' }}>
                        Revisar y Activar
                        <i className="bi bi-arrow-right" style={{ marginLeft: '12px' }}></i>
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};
