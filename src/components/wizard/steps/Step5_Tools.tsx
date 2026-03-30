"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
    <div
        className={checked ? 'tog-on' : 'tog-off'}
        onClick={() => onChange(!checked)}
    />
);

export const Step5_Tools: React.FC = () => {
    const {
        enableCalBooking, calApiKey, calEventId, calTimezone,
        enableTransfer, transferDestinations,
        leadQuestions,
        updateField, prevStep, nextStep
    } = useWizardStore();

    const timezones = [
        'Europe/Madrid', 'Europe/London', 'Europe/Paris', 'America/New_York',
        'America/Los_Angeles', 'America/Mexico_City', 'America/Bogota', 'America/Argentina/Buenos_Aires',
    ];

    const enableLeadQualification = leadQuestions.length > 0;

    const addLeadQuestion = () => {
        if (leadQuestions.length >= 3) return;
        updateField('leadQuestions', [...leadQuestions, { question: '', key: '', failAction: 'end_call' }]);
    };

    const addTransferDestination = () => {
        updateField('transferDestinations', [...transferDestinations, { name: '', description: '', number: '' }]);
    };

    const validate = () => {
        if (enableCalBooking && (!calApiKey || !calEventId)) return false;
        if (enableTransfer && transferDestinations.length === 0) return false;
        return true;
    };

    return (
        <div className="form-card">
            <div className="form-title">Herramientas del agente</div>
            <div className="form-sub">Activa las acciones que tu agente puede realizar durante las llamadas.</div>

            <div className="ci" style={{ marginBottom: '20px' }}>
                <i className="bi bi-info-circle-fill" style={{ flexShrink: 0, marginTop: '1px' }}></i>
                <div style={{ fontSize: '12px', lineHeight: '1.6' }}>Cada herramienta es opcional. Activa solo las que necesites. Puedes cambiarlas en cualquier momento después de crear el agente.</div>
            </div>

            {/* ═══ CUALIFICACIÓN ═══ */}
            <div className="tool-block">
                <div className="tool-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '6px',
                            background: enableLeadQualification ? 'var(--azul)' : 'var(--gris-borde)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <i className={`bi bi-funnel`} style={{ color: enableLeadQualification ? 'white' : 'var(--gris-texto)', fontSize: '14px' }}></i>
                        </div>
                        <div>
                            <div style={{ fontSize: '15px', fontWeight: 700 }}>Cualificar contacto antes de actuar</div>
                            <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>Filtra leads automáticamente según tus criterios antes de agendar o transferir</div>
                        </div>
                    </div>
                    <Toggle
                        checked={enableLeadQualification}
                        onChange={(val) => val ? addLeadQuestion() : updateField('leadQuestions', [])}
                    />
                </div>

                {enableLeadQualification && (
                    <div>
                        <hr className="divider" style={{ margin: 0 }} />
                        <div style={{ padding: '20px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--gris-texto)', marginBottom: '10px' }}>
                                Preguntas de cualificación
                            </div>
                            <p style={{ fontSize: '13px', color: '#374151', marginBottom: '12px' }}>Define hasta 3 preguntas que el agente hará al contacto. Cada una tiene un criterio: si no lo cumple, la llamada termina o se redirige.</p>
                            <div className="cw" style={{ marginBottom: '16px', marginTop: 0 }}>
                                <i className="bi bi-exclamation-triangle-fill" style={{ flexShrink: 0 }}></i>
                                Máximo 3 preguntas. En voz, más preguntas aumentan el abandono de la llamada.
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--gris-texto)', marginBottom: '12px' }}>
                                {leadQuestions.length} / 3 preguntas
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {leadQuestions.map((q, idx) => (
                                    <div key={idx} style={{ background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', padding: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <span style={{ background: 'var(--azul-light)', color: 'var(--azul)', border: '1px solid #bee3f8', borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 700 }}>
                                                Pregunta {idx + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateField('leadQuestions', leadQuestions.filter((_, i) => i !== idx))}
                                                style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                        <div className="fg">
                                            <label className="lbl">¿Qué pregunta hará el agente? <span style={{ color: 'var(--error)' }}>*</span></label>
                                            <input type="text" className="inp" placeholder="Ej: ¿Tienes un presupuesto mensual definido para este servicio?"
                                                value={q.question}
                                                onChange={e => { const l = [...leadQuestions]; l[idx].question = e.target.value; updateField('leadQuestions', l); }}
                                            />
                                            <div className="hint">Escríbela tal como la diría el agente en voz alta.</div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div className="fg" style={{ marginBottom: 0 }}>
                                                <label className="lbl">Cualifica si... <span style={{ color: 'var(--error)' }}>*</span></label>
                                                <input type="text" className="inp" placeholder="Ej: Menciona cualquier cifra o rango concreto"
                                                    value={q.key}
                                                    onChange={e => { const l = [...leadQuestions]; l[idx].key = e.target.value; updateField('leadQuestions', l); }}
                                                />
                                            </div>
                                            <div className="fg" style={{ marginBottom: 0 }}>
                                                <label className="lbl">Si no cualifica</label>
                                                <select className="inp sel" value={q.failAction}
                                                    onChange={e => { const l = [...leadQuestions]; l[idx].failAction = e.target.value as 'end_call' | 'continue'; updateField('leadQuestions', l); }}
                                                >
                                                    <option value="end_call">Terminar llamada</option>
                                                    <option value="continue">Continuar conversación</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {leadQuestions.length < 3 && (
                                    <button type="button" className="btn-s" onClick={addLeadQuestion} style={{ fontSize: '12px', marginTop: '4px' }}>
                                        <i className="bi bi-plus"></i> Añadir pregunta
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ TRANSFERIR LLAMADA ═══ */}
            <div className="tool-block">
                <div className="tool-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '6px',
                            background: enableTransfer ? 'var(--exito)' : 'var(--gris-borde)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <i className="bi bi-telephone-forward" style={{ color: enableTransfer ? 'white' : 'var(--gris-texto)', fontSize: '14px' }}></i>
                        </div>
                        <div>
                            <div style={{ fontSize: '15px', fontWeight: 700 }}>Transferir llamada</div>
                            <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>Transfiere a un número específico o persona determinada</div>
                        </div>
                    </div>
                    <Toggle checked={enableTransfer} onChange={(v) => updateField('enableTransfer', v)} />
                </div>

                {enableTransfer && (
                    <div>
                        <hr className="divider" style={{ margin: 0 }} />
                        <div style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {transferDestinations.map((dest, idx) => (
                                    <div key={idx} style={{ background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', padding: '16px' }}>
                                        <div style={{ marginBottom: '12px' }}>
                                            <span style={{ background: 'var(--azul-light)', color: 'var(--azul)', border: '1px solid #bee3f8', borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 700 }}>
                                                Destino #{idx + 1}
                                            </span>
                                        </div>
                                        <div className="fg">
                                            <label className="lbl">Nombre del contacto <span style={{ color: 'var(--error)' }}>*</span></label>
                                            <input type="text" className="inp" placeholder="Ej: Recepción / Soporte"
                                                value={dest.name}
                                                onChange={e => { const d = [...transferDestinations]; d[idx].name = e.target.value; updateField('transferDestinations', d); }}
                                            />
                                            <div className="hint">Nombre interno, no se dice en voz alta</div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div className="fg" style={{ marginBottom: 0 }}>
                                                <label className="lbl">Instrucción para el agente</label>
                                                <input type="text" className="inp" placeholder="Ej: Si el cliente pide hablar con una persona"
                                                    value={dest.description}
                                                    onChange={e => { const d = [...transferDestinations]; d[idx].description = e.target.value; updateField('transferDestinations', d); }}
                                                />
                                            </div>
                                            <div className="fg" style={{ marginBottom: 0, position: 'relative' }}>
                                                <label className="lbl">Número de teléfono <span style={{ color: 'var(--error)' }}>*</span></label>
                                                <input type="text" className="inp" placeholder="+34911234567"
                                                    value={dest.number}
                                                    onChange={e => { const d = [...transferDestinations]; d[idx].number = e.target.value; updateField('transferDestinations', d); }}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => updateField('transferDestinations', transferDestinations.filter((_, i) => i !== idx))}
                                            style={{ marginTop: '12px', background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <i className="bi bi-trash"></i> Eliminar destino
                                        </button>
                                    </div>
                                ))}
                                <button type="button" className="btn-s" onClick={addTransferDestination} style={{ fontSize: '12px', marginTop: '4px' }}>
                                    <i className="bi bi-plus"></i> Añadir destino
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ RESERVA CITAS CAL.COM ═══ */}
            <div className="tool-block">
                <div className="tool-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '6px',
                            background: enableCalBooking ? 'var(--purpura)' : 'var(--gris-borde)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <i className="bi bi-calendar2-check" style={{ color: enableCalBooking ? 'white' : 'var(--gris-texto)', fontSize: '14px' }}></i>
                        </div>
                        <div>
                            <div style={{ fontSize: '15px', fontWeight: 700 }}>Reserva de citas (Cal.com)</div>
                            <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>El agente reserva citas directamente en tu calendario durante la llamada</div>
                        </div>
                    </div>
                    <Toggle checked={enableCalBooking} onChange={(v) => updateField('enableCalBooking', v)} />
                </div>

                {enableCalBooking && (
                    <div>
                        <hr className="divider" style={{ margin: 0 }} />
                        <div style={{ padding: '20px' }}>
                            <div className="fg">
                                <label className="lbl">Clave de API de Cal.com <span style={{ color: 'var(--error)' }}>*</span></label>
                                <input type="password" className="inp" placeholder="cal_..."
                                    value={calApiKey} onChange={e => updateField('calApiKey', e.target.value)}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="fg" style={{ marginBottom: 0 }}>
                                    <label className="lbl">Event Type ID <span style={{ color: 'var(--error)' }}>*</span></label>
                                    <input type="text" className="inp" placeholder="Ej: 1427703"
                                        value={calEventId} onChange={e => updateField('calEventId', e.target.value)}
                                    />
                                </div>
                                <div className="fg" style={{ marginBottom: 0 }}>
                                    <label className="lbl">Zona horaria</label>
                                    <select className="inp sel" value={calTimezone} onChange={e => updateField('calTimezone', e.target.value)}>
                                        {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="wiz-footer">
                <button type="button" className="btn-s" onClick={prevStep}>
                    <i className="bi bi-arrow-left"></i> Anterior
                </button>
                <button type="button" className="btn-p" onClick={() => validate() && nextStep()}>
                    Siguiente <i className="bi bi-arrow-right"></i>
                </button>
            </div>
        </div>
    );
};
