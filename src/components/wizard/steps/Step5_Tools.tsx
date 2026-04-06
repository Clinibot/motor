"use client";

import React, { useState, useEffect } from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { createClient } from '../../../lib/supabase/client';

interface AgentOption {
    id: string;
    name: string;
    retell_agent_id: string | null;
}

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
    <div
        className={checked ? 'tog-on' : 'tog-off'}
        onClick={() => onChange(!checked)}
    />
);

export const Step5_Tools: React.FC = () => {
    const {
        enableCalBooking, calApiKey, calEventId, calTimezone, calUrl, calSearchDays, enableCalCancellation,
        enableTransfer, transferDestinations,
        leadQuestions,
        extractionVariables,
        updateField, prevStep, nextStep
    } = useWizardStore();

    const [showVarDropdown, setShowVarDropdown] = useState(false);
    const [availableAgents, setAvailableAgents] = useState<AgentOption[]>([]);
    const [validationError, setValidationError] = useState('');
    const [showCalGuide, setShowCalGuide] = useState(false);

    useEffect(() => {
        const fetchAgents = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: profile } = await supabase.from('users').select('workspace_id').eq('id', user.id).single();
            if (!profile?.workspace_id) return;
            const { data } = await supabase.from('agents').select('id, name, retell_agent_id').eq('workspace_id', profile.workspace_id);
            setAvailableAgents(data ?? []);
        };
        fetchAgents();
    }, []);

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
        updateField('transferDestinations', [...transferDestinations, { name: '', description: '', number: '', destination_type: 'number' }]);
    };

    const addVariable = (type: string) => {
        setShowVarDropdown(false);
        updateField('extractionVariables', [...extractionVariables, { name: '', type, description: '' }]);
    };

    const getValidationError = () => {
        if (enableCalBooking && !calApiKey) return 'La Cal.com API Key es obligatoria para activar la reserva de citas.';
        if (enableCalBooking && !calEventId) return 'El Event Type ID es obligatorio para activar la reserva de citas.';
        if (enableTransfer && transferDestinations.length === 0) return 'Añade al menos un destino de transferencia o desactiva la transferencia.';
        if (enableTransfer) {
            for (let i = 0; i < transferDestinations.length; i++) {
                const dest = transferDestinations[i];
                if (!dest.name?.trim()) return `El destino #${i + 1} necesita un nombre.`;
                if (!dest.description?.trim()) return `El destino #${i + 1} necesita una instrucción para el agente (campo obligatorio).`;
                if (dest.destination_type !== 'agent' && !dest.number?.trim()) return `El destino #${i + 1} necesita un número de teléfono.`;
                if (dest.destination_type === 'agent' && !dest.agentId) return `El destino #${i + 1} necesita un agente seleccionado.`;
            }
        }
        return '';
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
                            <i className="bi bi-funnel" style={{ color: enableLeadQualification ? 'white' : 'var(--gris-texto)', fontSize: '14px' }}></i>
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
                                                <select className="inp sel" value={q.failAction || 'end_call'}
                                                    onChange={e => { const l = [...leadQuestions]; l[idx].failAction = e.target.value as 'end_call' | 'transfer' | 'booking' | 'continue'; if (e.target.value !== 'transfer') l[idx].failTransferIdx = undefined; updateField('leadQuestions', l); }}
                                                >
                                                    <option value="" disabled>¿Qué hace el agente?</option>
                                                    <option value="end_call">Terminar la llamada</option>
                                                    <option value="transfer">Ejecutar transferencia</option>
                                                    <option value="booking" disabled={!enableCalBooking}>Agendar cita{!enableCalBooking ? ' (activa Cal.com primero)' : ''}</option>
                                                    <option value="continue">Continuar sin cualificar</option>
                                                </select>
                                            </div>
                                        </div>
                                        {q.failAction === 'transfer' && (
                                            <div className="fg" style={{ marginTop: '10px', marginBottom: 0 }}>
                                                <label className="lbl">¿A qué destino transferir?</label>
                                                {transferDestinations.length === 0 ? (
                                                    <div className="hint" style={{ color: 'var(--error)' }}>
                                                        <i className="bi bi-exclamation-triangle" style={{ marginRight: '4px' }}></i>
                                                        Activa y configura &quot;Transferir llamada&quot; primero para poder seleccionar un destino.
                                                    </div>
                                                ) : (
                                                    <select className="inp sel"
                                                        value={q.failTransferIdx ?? ''}
                                                        onChange={e => { const l = [...leadQuestions]; l[idx].failTransferIdx = Number(e.target.value); updateField('leadQuestions', l); }}
                                                    >
                                                        <option value="" disabled>Selecciona un destino</option>
                                                        {transferDestinations.map((dest, di) => (
                                                            <option key={di} value={di}>{dest.name || `Destino #${di + 1}`}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        )}
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
                                            {dest.name && `transfer_to_${dest.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`.length > 64 && (
                                                <div className="hint" style={{ color: 'var(--error)', marginTop: '4px' }}>
                                                    <i className="bi bi-exclamation-triangle" style={{ marginRight: '4px' }}></i>
                                                    Nombre demasiado largo — usa algo más corto (ej: &quot;Doctor Pedro&quot;).
                                                </div>
                                            )}
                                        </div>
                                        <div className="fg">
                                            <label className="lbl">Instrucción para el agente <span style={{ color: 'var(--error)' }}>*</span></label>
                                            <input type="text" className="inp" placeholder="Ej: Si el cliente pide hablar con administración"
                                                value={dest.description}
                                                onChange={e => { const d = [...transferDestinations]; d[idx].description = e.target.value; updateField('transferDestinations', d); }}
                                            />
                                            {!dest.description?.trim() && (
                                                <div className="hint" style={{ color: 'var(--error)', marginTop: '4px' }}>
                                                    <i className="bi bi-exclamation-circle" style={{ marginRight: '4px' }}></i>
                                                    Campo obligatorio — sin instrucción el agente no sabrá cuándo transferir y la herramienta no se creará.
                                                </div>
                                            )}
                                            {dest.description?.trim() && <div className="hint"><i className="bi bi-info-circle" style={{ marginRight: '3px' }}></i>Describe en lenguaje natural cuándo debe transferir a este destino. Sé específico para evitar transferencias innecesarias.</div>}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div className="fg" style={{ marginBottom: 0 }}>
                                                <label className="lbl">Tipo de destino</label>
                                                <select className="inp sel"
                                                    value={dest.destination_type || 'number'}
                                                    onChange={e => { const d = [...transferDestinations]; d[idx].destination_type = e.target.value as 'number' | 'agent'; updateField('transferDestinations', d); }}
                                                >
                                                    <option value="number">Humano (Número)</option>
                                                    <option value="agent">Otro agente IA</option>
                                                </select>
                                            </div>
                                            {dest.destination_type === 'agent' ? (
                                                <div className="fg" style={{ marginBottom: 0 }}>
                                                    <label className="lbl">Agente destino <span style={{ color: 'var(--error)' }}>*</span></label>
                                                    <select className="inp sel"
                                                        value={dest.agentId || ''}
                                                        onChange={e => { const d = [...transferDestinations]; d[idx].agentId = e.target.value; updateField('transferDestinations', d); }}
                                                    >
                                                        <option value="" disabled>Selecciona un agente</option>
                                                        {availableAgents.filter(a => a.retell_agent_id).map(a => (
                                                            <option key={a.id} value={a.retell_agent_id!}>{a.name}</option>
                                                        ))}
                                                    </select>
                                                    {availableAgents.filter(a => a.retell_agent_id).length === 0 && (
                                                        <div className="hint">No hay otros agentes disponibles en tu workspace.</div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="fg" style={{ marginBottom: 0 }}>
                                                    <label className="lbl">Número de teléfono <span style={{ color: 'var(--error)' }}>*</span></label>
                                                    <input type="text" className="inp" placeholder="+34911234567"
                                                        value={dest.number || ''}
                                                        onChange={e => { const d = [...transferDestinations]; d[idx].number = e.target.value; updateField('transferDestinations', d); }}
                                                    />
                                                    {!dest.number?.trim()
                                                        ? <div className="hint" style={{ color: 'var(--error)', marginTop: '4px' }}><i className="bi bi-exclamation-circle" style={{ marginRight: '4px' }}></i>Obligatorio — sin número la transferencia no se creará en Retell.</div>
                                                        : <div className="hint">Formato E.164 (ej: +34911234567)</div>
                                                    }
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newDests = transferDestinations.filter((_, i) => i !== idx);
                                                const newLeadQ = leadQuestions.map(q => {
                                                    if (q.failTransferIdx === undefined) return q;
                                                    if (q.failTransferIdx === idx) return { ...q, failTransferIdx: undefined, failAction: 'end_call' as const };
                                                    if (q.failTransferIdx > idx) return { ...q, failTransferIdx: q.failTransferIdx - 1 };
                                                    return q;
                                                });
                                                updateField('transferDestinations', newDests);
                                                updateField('leadQuestions', newLeadQ);
                                            }}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button type="button" onClick={() => setShowCalGuide(true)}
                            style={{ background: 'none', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', padding: '5px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--oscuro)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <i className="bi bi-book"></i> Ver guía
                        </button>
                        <Toggle checked={enableCalBooking} onChange={(v) => updateField('enableCalBooking', v)} />
                    </div>
                </div>

                {enableCalBooking && (
                    <div>
                        <hr className="divider" style={{ margin: 0 }} />
                        <div style={{ padding: '20px' }}>
                            <div className="fg">
                                <label className="lbl">Cal.com API Key <span style={{ color: 'var(--error)' }}>*</span></label>
                                <input type="password" className="inp" placeholder="cal_..."
                                    value={calApiKey} onChange={e => updateField('calApiKey', e.target.value)}
                                />
                                <div className="hint"><i className="bi bi-lock" style={{ marginRight: '3px' }}></i>Guardada de forma segura. Obténla desde Cal.com → Configuración → Developer → API Keys</div>
                            </div>
                            <div className="fg">
                                <label className="lbl">Event Type ID <span style={{ color: 'var(--error)' }}>*</span></label>
                                <input type="text" className="inp" placeholder="Ej: 1427703"
                                    value={calEventId} onChange={e => updateField('calEventId', e.target.value)}
                                />
                                <div className="hint"><i className="bi bi-lightbulb" style={{ marginRight: '3px' }}></i>Encuéntralo en la URL de tu evento: https://app.cal.com/usuario/evento/<strong>1427703</strong></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="fg" style={{ marginBottom: 0 }}>
                                    <label className="lbl">Zona horaria <span style={{ color: 'var(--error)' }}>*</span></label>
                                    <select className="inp sel" value={calTimezone} onChange={e => updateField('calTimezone', e.target.value)}>
                                        {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                                    </select>
                                </div>
                                <div className="fg" style={{ marginBottom: 0 }}>
                                    <label className="lbl">Cal.com Link <span style={{ fontWeight: 400, color: 'var(--gris-texto)' }}>(opcional)</span></label>
                                    <input type="text" className="inp" placeholder="https://cal.com/usuario/evento"
                                        value={calUrl} onChange={e => updateField('calUrl', e.target.value)}
                                    />
                                </div>
                            </div>

                            <hr className="divider" style={{ margin: '20px 0' }} />

                            <div className="fg">
                                <label className="lbl"><i className="bi bi-calendar-range" style={{ marginRight: '4px', color: 'var(--azul)' }}></i>Días de disponibilidad a consultar</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <select className="inp sel" style={{ width: 'auto', padding: '8px 36px 8px 12px', fontSize: '13px' }}
                                        value={calSearchDays}
                                        onChange={e => updateField('calSearchDays', Number(e.target.value))}
                                    >
                                        <option value={7}>7 días</option>
                                        <option value={14}>14 días</option>
                                        <option value={21}>21 días</option>
                                        <option value={31}>31 días</option>
                                    </select>
                                    <div style={{ fontSize: '12px', color: 'var(--gris-texto)', lineHeight: '1.5' }}>El agente consultará la disponibilidad del calendario en este rango de días a partir de hoy.</div>
                                </div>
                                <div className="hint"><i className="bi bi-info-circle" style={{ marginRight: '3px' }}></i>Para la mayoría de negocios 7 días es suficiente. En clínicas o asesorías, recomendamos 31 días para ofrecer más opciones al cliente.</div>
                            </div>

                            <hr className="divider" style={{ margin: '20px 0' }} />

                            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--oscuro)' }}>Funcionalidades adicionales</div>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>
                                <input type="checkbox" style={{ marginTop: '2px', width: '16px', height: '16px', flexShrink: 0, accentColor: 'var(--azul)' }}
                                    checked={enableCalCancellation}
                                    onChange={e => updateField('enableCalCancellation', e.target.checked)}
                                />
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>Permitir cancelación de citas</div>
                                    <div style={{ fontSize: '12px', color: 'var(--gris-texto)', lineHeight: '1.5' }}>El agente podrá cancelar una cita existente durante la llamada. El sistema gestiona automáticamente la cancelación en Cal.com.</div>
                                </div>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ DATOS A RECOGER AL FINALIZAR ═══ */}
            <div className="tool-block">
                <div style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <i className="bi bi-bar-chart-line" style={{ color: 'var(--azul)', fontSize: '18px' }}></i>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--oscuro)' }}>Datos a recoger al finalizar la llamada</div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--gris-texto)', marginBottom: '16px' }}>Análisis automático post-llamada — extrae información valiosa de cada conversación</div>

                    <div className="ci" style={{ marginBottom: '20px' }}>
                        <i className="bi bi-info-circle-fill" style={{ flexShrink: 0, marginTop: '1px' }}></i>
                        <div style={{ fontSize: '12px', lineHeight: '1.7' }}>
                            El análisis posterior a la llamada analiza automáticamente las conversaciones una vez finalizadas. Ofrecemos variables predefinidas que no puedes modificar, y puedes añadir categorías personalizadas adaptadas a tu negocio.<br />
                            <strong>Nota:</strong> Los campos no se completarán en llamadas que no llegaron a conectarse o en las que no hubo conversación.
                        </div>
                    </div>

                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--gris-texto)', marginBottom: '10px' }}>Variables predefinidas</div>
                    <div style={{ background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: '24px' }}>
                        {[
                            { icon: 'bi-list-ul', name: 'Resumen de la llamada', desc: 'Escribe un resumen de 1 a 3 frases basado en la transcripción, capturando la información importante y acciones tomadas.', badge: 'Texto' },
                            { icon: 'bi-slash-circle', name: 'Llamada exitosa', desc: 'Evalúa si el agente tuvo una llamada exitosa: conversación completa, tarea finalizada, sin problemas técnicos ni buzón de voz.', badge: 'Sí/No' },
                            { icon: 'bi-list-ul', name: 'Sentimiento del usuario', desc: 'Evalúa el sentimiento, estado de ánimo y nivel de satisfacción del usuario durante la llamada.', badge: 'Texto' },
                        ].map((v, i, arr) => (
                            <div key={i} style={{ padding: '13px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--gris-borde)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <i className={`bi ${v.icon}`} style={{ color: 'var(--gris-texto)', fontSize: '15px', flexShrink: 0 }}></i>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{v.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--gris-texto)', marginTop: '2px' }}>{v.desc}</div>
                                    </div>
                                </div>
                                <span style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, color: 'var(--gris-texto)', whiteSpace: 'nowrap', marginLeft: '12px' }}>{v.badge}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--gris-texto)', marginBottom: '10px' }}>Categorías personalizadas</div>
                    <p style={{ fontSize: '13px', color: '#374151', marginBottom: '16px' }}>Añade variables de análisis adaptadas a tu negocio. Elige el tipo según qué dato necesitas extraer:</p>
                    <div className="hint" style={{ marginBottom: '16px' }}><i className="bi bi-info-circle" style={{ marginRight: '3px' }}></i>Ejemplo: si eres una clínica, podrías añadir &quot;Motivo de consulta&quot; (Texto) y &quot;¿Es primera visita?&quot; (Booleano). Estos datos se extraen automáticamente de cada conversación.</div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                        {[
                            { icon: 'bi-list-ul', label: 'Texto', desc: 'Información textual.', ex: 'Ej: Resumen, puntos de acción.' },
                            { icon: 'bi-menu-button-wide', label: 'Selector', desc: 'Lista fija de opciones.', ex: 'Ej: Tipo de incidencia, estado.' },
                            { icon: 'bi-slash-circle', label: 'Booleano', desc: 'Sí o No.', ex: 'Ej: ¿Es primera llamada?' },
                            { icon: 'bi-hash', label: 'Número', desc: 'Valor numérico.', ex: 'Ej: Puntuación, importe.' },
                        ].map(t => (
                            <div key={t.label} style={{ background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className={`bi ${t.icon}`} style={{ color: 'var(--azul)' }}></i> {t.label}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--gris-texto)', lineHeight: '1.5' }}>{t.desc}<br /><em>{t.ex}</em></div>
                            </div>
                        ))}
                    </div>

                    {extractionVariables.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                            {extractionVariables.map((v, idx) => (
                                <div key={idx} style={{ background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div className="fg" style={{ marginBottom: 0 }}>
                                                <label className="lbl">Nombre de la variable</label>
                                                <input type="text" className="inp" placeholder="Ej: Motivo de consulta"
                                                    value={v.name}
                                                    onChange={e => { const vars = [...extractionVariables]; vars[idx].name = e.target.value; updateField('extractionVariables', vars); }}
                                                />
                                            </div>
                                            <div className="fg" style={{ marginBottom: 0 }}>
                                                <label className="lbl">Descripción / instrucción</label>
                                                <input type="text" className="inp" placeholder="Ej: Extrae el motivo principal de la llamada"
                                                    value={v.description}
                                                    onChange={e => { const vars = [...extractionVariables]; vars[idx].description = e.target.value; updateField('extractionVariables', vars); }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                                            <span style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, color: 'var(--gris-texto)', whiteSpace: 'nowrap' }}>
                                                {v.type.charAt(0).toUpperCase() + v.type.slice(1)}
                                            </span>
                                            <button type="button"
                                                onClick={() => updateField('extractionVariables', extractionVariables.filter((_, i) => i !== idx))}
                                                style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '14px', padding: '2px' }}
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button type="button" className="btn-s" onClick={() => setShowVarDropdown(!showVarDropdown)} style={{ gap: '6px' }}>
                            <i className="bi bi-plus"></i> Añadir variable
                        </button>
                        {showVarDropdown && (
                            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: 'white', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 100, minWidth: '180px', overflow: 'hidden' }}>
                                {[
                                    { value: 'texto', icon: 'bi-list-ul', label: 'Texto' },
                                    { value: 'booleano', icon: 'bi-slash-circle', label: 'Booleano' },
                                    { value: 'numero', icon: 'bi-hash', label: 'Número' },
                                ].map(t => (
                                    <div key={t.value} onClick={() => addVariable(t.value)}
                                        style={{ padding: '11px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 500 }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--gris-bg)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                                    >
                                        <i className={`bi ${t.icon}`} style={{ color: 'var(--gris-texto)', width: '16px' }}></i> {t.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {validationError && (
                <div className="cw" style={{ marginBottom: '8px' }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ flexShrink: 0 }}></i>
                    {validationError}
                </div>
            )}
            <div className="wiz-footer">
                <button type="button" className="btn-s" onClick={prevStep}>
                    <i className="bi bi-arrow-left"></i> Anterior
                </button>
                <button type="button" className="btn-p" onClick={() => {
                    const err = getValidationError();
                    if (err) { setValidationError(err); return; }
                    setValidationError('');
                    nextStep();
                }}>
                    Siguiente <i className="bi bi-arrow-right"></i>
                </button>
            </div>
            {/* MODAL GUÍA CAL.COM */}
            {showCalGuide && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setShowCalGuide(false)} />
                    <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,.2)', width: '100%', maxWidth: '500px', zIndex: 10, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ padding: '28px 28px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                <i className="bi bi-book" style={{ color: 'var(--azul)', fontSize: '22px' }}></i>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--oscuro)' }}>Guía de integración Cal.com</div>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--gris-texto)' }}>Integra la reserva de citas de Cal.com con tu agente de voz.</div>
                        </div>

                        <div style={{ padding: '24px 28px', maxHeight: '65vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="cw" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ fontWeight: 700, fontSize: '13px' }}><i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '6px' }}></i>Antes de empezar necesitas:</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                                    {['Una cuenta en Cal.com (cal.com)', 'Un Event Type creado en tu cuenta', 'Tu API Key desde Configuración → Developer'].map(item => (
                                        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <i className="bi bi-check-circle-fill" style={{ color: '#d97706', fontSize: '14px', flexShrink: 0 }}></i>
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '4px', color: '#b45309' }}>Cal.com se integra con:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {['Google Calendar', 'HubSpot', 'Outlook', 'Salesforce', 'Zoom', 'Notion'].map(int => (
                                        <span key={int} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: '1px solid #d97706', color: '#92400e', background: '#fffbeb', fontWeight: 500 }}>{int}</span>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {[
                                    { step: 1, title: 'Crea una cuenta en Cal.com', desc: <>Visita <strong>cal.com</strong> y crea tu cuenta si no tienes una.</> },
                                    { step: 2, title: 'Configura un tipo de evento', desc: <>En tu panel de Cal.com: <strong>Tipos de evento</strong> → <strong>Nuevo</strong> → Configura duración, disponibilidad, nombre → <strong>Guardar</strong>.</> },
                                    { step: 3, title: 'Obtén el Event Type ID', desc: 'Abre el tipo de evento y mira la URL del navegador. El ID es el número al final:', code: 'https://app.cal.com/usuario/evento/1427703' },
                                    { step: 4, title: 'Obtén tu API Key', desc: <>En Cal.com: <strong>Configuración</strong> → <strong>Developer</strong> → <strong>API Keys</strong> → copia tu clave.</> },
                                    { step: 5, title: 'Pega los datos en la Fábrica', desc: 'Introduce la API Key, el Event Type ID y la zona horaria. El agente podrá consultar disponibilidad y reservar citas automáticamente durante las llamadas.' },
                                ].map(s => (
                                    <div key={s.step} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--azul)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                                            {s.step}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--oscuro)', marginBottom: '3px' }}>{s.title}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--gris-texto)', lineHeight: '1.5' }}>{s.desc}</div>
                                            {s.code && (
                                                <div style={{ marginTop: '8px', background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', padding: '8px 12px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--azul)' }}>
                                                    {s.code.replace('1427703', '')}<strong>1427703</strong>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="ci">
                                <i className="bi bi-info-circle-fill" style={{ flexShrink: 0 }}></i>
                                <div style={{ fontSize: '12px', lineHeight: '1.6' }}>Para más detalles consulta el <strong>Centro de ayuda</strong> de la plataforma → sección Cal.com.</div>
                            </div>
                        </div>

                        <div style={{ padding: '0 28px 28px' }}>
                            <button type="button" className="btn-p" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowCalGuide(false)}>
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
