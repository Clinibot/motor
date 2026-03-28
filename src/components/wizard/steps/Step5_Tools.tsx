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
    <label htmlFor={id} style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer', flexShrink: 0 }}>
        <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
        <span style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: checked ? '#267ab0' : '#cbd5e1',
            borderRadius: '24px',
            transition: 'background-color 0.2s'
        }}>
            <span style={{
                position: 'absolute',
                content: '',
                height: '18px', width: '18px',
                left: checked ? 'calc(100% - 21px)' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
        </span>
    </label>
);

export const Step5_Tools: React.FC = () => {
    const {
        enableCalBooking, calUrl, calApiKey, calEventId, calSearchDays,
        enableTransfer, transferDestinations,
        extractionVariables, agentName,
        updateField, prevStep, nextStep, editingAgentId
    } = useWizardStore();

    // Lead qualification (custom questions) - stored separately from extractionVariables
    const [leadQuestions, setLeadQuestions] = useState<{ question: string; key: string }[]>([]);
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
            if (!calEventId) {
                newErrors.calEventId = 'El ID de evento es obligatorio.';
            } else if (isNaN(parseInt(calEventId, 10))) {
                newErrors.calEventId = 'El ID de evento debe ser un número.';
            }
        }

        if (enableTransfer) {
            if (transferDestinations.length === 0) {
                newErrors.transfer = 'Debes añadir al menos un destino de transferencia si la función está activa.';
            } else {
                transferDestinations.forEach((dest, idx) => {
                    if (!dest.name.trim()) newErrors[`transfer_${idx}_name`] = 'El nombre es obligatorio.';
                    if (dest.destination_type === 'number' && !dest.number?.trim()) {
                        newErrors[`transfer_${idx}_number`] = 'El número de teléfono es obligatorio.';
                    }
                    if (dest.destination_type === 'agent' && !dest.agentId) {
                        newErrors[`transfer_${idx}_agent`] = 'Debes seleccionar un agente.';
                    }
                });
            }
        }

        extractionVariables.forEach((v, idx) => {
            if (!v.name.trim()) newErrors[`extraction_${idx}_name`] = 'El nombre de la variable es obligatorio.';
            if (!v.description.trim()) newErrors[`extraction_${idx}_desc`] = 'La descripción es obligatoria.';
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            nextStep();
        } else {
            alert("Por favor, corrige los errores en la configuración antes de continuar.");
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

    const addVariable = () => {
        updateField('extractionVariables', [...extractionVariables, { name: '', type: 'string', description: '', required: true }]);
    };

    const addLeadQuestion = () => {
        setLeadQuestions(prev => [...prev, { question: '', key: '' }]);
    };

    const sectionStyle = {
        background: 'white',
        border: '1px solid #edf2f7',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px'
    };

    const sectionHeaderStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0'
    };

    return (
        <div className="content-area">
            <div className="form-card">
                <WizardStepHeader
                    title="Herramientas del agente"
                    subtitle="Activa las funciones que necesite tu agente para realizar su tarea."
                />

                <form onSubmit={handleNext}>

                    {/* ═══ 1. CUALIFICACIÓN DE LEAD ═══ */}
                    <div style={sectionStyle}>
                        <div style={sectionHeaderStyle}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '16px', color: '#1a2428', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <i className="bi bi-funnel-fill" style={{ color: '#267ab0' }}></i>
                                    Cualificar leads antes de actuar
                                </div>
                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                    Define qué preguntas hace el agente para cualificar al contacto antes de actuar
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '20px' }}>
                            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <i className="bi bi-exclamation-triangle-fill" style={{ color: '#d97706', marginTop: '2px' }}></i>
                                <span style={{ fontSize: '13px', color: '#92400e', lineHeight: '1.6' }}>
                                    <strong>Preguntas de cualificación:</strong> El agente preguntará esta información para cualificar al lead. Si la respuesta no es satisfactoria, finalizará la llamada.
                                </span>
                            </div>

                            {leadQuestions.length > 0 && leadQuestions.map((q, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', marginBottom: '12px', alignItems: 'end' }}>
                                    <div>
                                        <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pregunta</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Ej: ¿Cuál es su presupuesto?"
                                            value={q.question}
                                            onChange={e => {
                                                const updated = [...leadQuestions];
                                                updated[idx].question = e.target.value;
                                                setLeadQuestions(updated);
                                            }}
                                            style={{ borderRadius: '10px', padding: '10px 14px' }}
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Variable (clave)</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Ej: presupuesto"
                                            value={q.key}
                                            onChange={e => {
                                                const updated = [...leadQuestions];
                                                updated[idx].key = e.target.value;
                                                setLeadQuestions(updated);
                                            }}
                                            style={{ borderRadius: '10px', padding: '10px 14px' }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setLeadQuestions(prev => prev.filter((_, i) => i !== idx))}
                                        style={{ border: 'none', background: 'transparent', color: '#ef4444', padding: '10px', cursor: 'pointer' }}
                                    >
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addLeadQuestion}
                                style={{ border: '1px dashed #cbd5e1', background: '#f8fafc', borderRadius: '10px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <i className="bi bi-plus-lg"></i> Añadir pregunta
                            </button>
                        </div>
                    </div>

                    {/* ═══ 2. TRANSFERENCIA DE LLAMADA ═══ */}
                    <div style={{
                        ...sectionStyle,
                        borderColor: enableTransfer ? '#bfdbfe' : '#edf2f7',
                        background: enableTransfer ? '#f0f7ff' : 'white'
                    }}>
                        <div style={sectionHeaderStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '12px',
                                    background: enableTransfer ? '#267ab0' : '#f1f5f9',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: enableTransfer ? 'white' : '#64748b', fontSize: '18px'
                                }}>
                                    <i className="bi bi-telephone-forward"></i>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#1a2428' }}>Transferir llamada</div>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>Transfiere la llamada a un número específico o persona determinada</div>
                                </div>
                            </div>
                            <ToggleSwitch checked={enableTransfer} onChange={(v) => updateField('enableTransfer', v)} id="enableTransfer" />
                        </div>

                        {enableTransfer && (
                            <div style={{ marginTop: '24px' }}>
                                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '4px', marginBottom: '16px' }}>
                                    <div style={{ fontSize: '13px', color: '#64748b', padding: '12px 12px 2px' }}>¿Cuándo debe transferir el agente?</div>
                                    <textarea
                                        className="form-control"
                                        rows={2}
                                        placeholder="Ej: Si el cliente ya es paciente o tiene una cita previa, transfiere al equipo de clínica."
                                        style={{ border: 'none', background: 'transparent', resize: 'none', padding: '8px 12px', fontSize: '14px' }}
                                    ></textarea>
                                </div>

                                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', fontWeight: 600 }}>Destinos de transferencia</div>

                                {transferDestinations.map((dest, idx) => (
                                    <div key={idx} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a2428' }}>Destino #{idx + 1}</span>
                                            <button type="button" onClick={() => updateField('transferDestinations', transferDestinations.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                            <div>
                                                <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Nombre del contacto <span style={{ color: '#ef4444' }}>*</span></label>
                                                <input
                                                    type="text"
                                                    className={`form-control ${errors[`transfer_${idx}_name`] ? 'is-invalid' : ''}`}
                                                    placeholder="Ej: Sonia / Soporte"
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
                                                <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Instrucción para el agente</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Ej: Si el cliente pide hablar con administración"
                                                    value={dest.description}
                                                    onChange={e => {
                                                        const d = [...transferDestinations];
                                                        d[idx].description = e.target.value;
                                                        updateField('transferDestinations', d);
                                                    }}
                                                    style={{ borderRadius: '10px' }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Tipo de destino</label>
                                                <select
                                                    className="form-select"
                                                    value={dest.destination_type || 'number'}
                                                    onChange={e => {
                                                        const d = [...transferDestinations];
                                                        const type = e.target.value as 'number' | 'agent';
                                                        d[idx].destination_type = type;
                                                        if (type === 'number') d[idx].agentId = '';
                                                        else d[idx].number = '';
                                                        updateField('transferDestinations', d);
                                                    }}
                                                    style={{ borderRadius: '10px' }}
                                                >
                                                    <option value="number">Humano (Número)</option>
                                                    <option value="agent">Otro Agente (Retell)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>
                                                    {dest.destination_type === 'agent' ? 'Seleccionar agente' : 'Número de teléfono'} <span style={{ color: '#ef4444' }}>*</span>
                                                </label>
                                                {dest.destination_type === 'agent' ? (
                                                    <select
                                                        className={`form-select ${errors[`transfer_${idx}_agent`] ? 'is-invalid' : ''}`}
                                                        value={dest.agentId || ''}
                                                        onChange={e => {
                                                            const d = [...transferDestinations];
                                                            d[idx].agentId = e.target.value;
                                                            updateField('transferDestinations', d);
                                                        }}
                                                        style={{ borderRadius: '10px' }}
                                                    >
                                                        <option value="">Selecciona un agente...</option>
                                                        {availableAgents.map(a => (
                                                            <option key={a.id} value={a.retell_agent_id!}>{a.name}</option>
                                                        ))}
                                                        {availableAgents.length === 0 && !isLoadingAgents && (
                                                            <option disabled>No tienes más agentes</option>
                                                        )}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        className={`form-control ${errors[`transfer_${idx}_number`] ? 'is-invalid' : ''}`}
                                                        placeholder="+34..."
                                                        value={dest.number}
                                                        onChange={e => {
                                                            const d = [...transferDestinations];
                                                            d[idx].number = e.target.value;
                                                            updateField('transferDestinations', d);
                                                        }}
                                                        style={{ borderRadius: '10px' }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={addTransfer}
                                    style={{ border: '1px dashed #bfdbfe', background: '#f0f7ff', borderRadius: '10px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: '#267ab0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <i className="bi bi-plus-lg"></i> Añadir destino
                                </button>
                                {errors.transfer && <div className="text-danger small mt-2">{errors.transfer}</div>}
                            </div>
                        )}
                    </div>

                    {/* ═══ 3. CAL.COM BOOKING ═══ */}
                    <div style={{
                        ...sectionStyle,
                        borderColor: enableCalBooking ? '#bfdbfe' : '#edf2f7',
                        background: enableCalBooking ? '#f0f7ff' : 'white'
                    }}>
                        <div style={sectionHeaderStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '12px',
                                    background: enableCalBooking ? '#267ab0' : '#f1f5f9',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: enableCalBooking ? 'white' : '#64748b', fontSize: '18px'
                                }}>
                                    <i className="bi bi-calendar-event"></i>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#1a2428' }}>Reservar cita en el calendario (Cal.com)</div>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>Integra tu calendario con Cal.com para agendar citas automáticamente</div>
                                </div>
                            </div>
                            <ToggleSwitch checked={enableCalBooking} onChange={(v) => updateField('enableCalBooking', v)} id="enableCalBooking" />
                        </div>

                        {enableCalBooking && (
                            <div style={{ marginTop: '24px', background: 'white', borderRadius: '12px', border: '1px solid #dbeafe', padding: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    <div>
                                        <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Cal.com API Key <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input
                                            type="password"
                                            className={`form-control ${errors.calApiKey ? 'is-invalid' : ''}`}
                                            value={calApiKey}
                                            onChange={e => updateField('calApiKey', e.target.value)}
                                            placeholder="cal_live_..."
                                            style={{ borderRadius: '10px' }}
                                        />
                                        {errors.calApiKey && <div className="invalid-feedback">{errors.calApiKey}</div>}
                                    </div>
                                    <div>
                                        <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Event Type ID <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input
                                            type="text"
                                            className={`form-control ${errors.calEventId ? 'is-invalid' : ''}`}
                                            value={calEventId}
                                            onChange={e => updateField('calEventId', e.target.value)}
                                            placeholder="123456"
                                            style={{ borderRadius: '10px' }}
                                        />
                                        {errors.calEventId && <div className="invalid-feedback">{errors.calEventId}</div>}
                                    </div>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Zona horaria</label>
                                    <select className="form-select" style={{ borderRadius: '10px' }}>
                                        <option>Selecciona una zona horaria</option>
                                        <option value="Europe/Madrid">Europe/Madrid (UTC+1/+2)</option>
                                        <option value="America/New_York">America/New_York</option>
                                        <option value="America/Mexico_City">America/Mexico_City</option>
                                    </select>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Cal Link (preview)</label>
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>
                                        {calUrl || 'https://cal.com/usuario/event'}
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Días a consultar para disponibilidad</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="60"
                                        className="form-control"
                                        value={calSearchDays}
                                        onChange={e => updateField('calSearchDays', parseInt(e.target.value) || 6)}
                                        style={{ borderRadius: '10px', maxWidth: '120px' }}
                                    />
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Cuántos días a futuro buscará el agente para ofrecer citas.</div>
                                </div>

                                <div style={{ marginTop: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                    <i className="bi bi-exclamation-triangle-fill" style={{ color: '#d97706', marginTop: '2px' }}></i>
                                    <div>
                                        <strong style={{ fontSize: '13px', color: '#92400e' }}>Aviso importante — necesita número de teléfono:</strong>
                                        <div style={{ fontSize: '12px', color: '#92400e', marginTop: '4px', lineHeight: '1.6' }}>
                                            Para que el agente pueda buscar y ofrecer disponibilidad de horarios, debes asignarle un número de teléfono (ya que funciona vía Webhook en llamadas entrantes).
                                        </div>
                                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                                                <input type="radio" name="calMode" defaultChecked style={{ marginTop: '3px' }} />
                                                <div>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a2428' }}>Consultar disponibilidad</div>
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>El agente busca en el calendario y ofrece los horarios disponibles. <span style={{ background: '#fde68a', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>Requiere número</span></div>
                                                </div>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                                                <input type="radio" name="calMode" style={{ marginTop: '3px' }} />
                                                <div>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a2428' }}>Agendar solo</div>
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>El usuario dice la fecha y el agente la agenda. No consulta disponibilidad.</div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══ 4. DATOS A RECOGER AL FINALIZAR LA LLAMADA ═══ */}
                    <div style={{ ...sectionStyle, borderColor: '#e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <i className="bi bi-clipboard-data" style={{ color: '#267ab0', fontSize: '18px' }}></i>
                            <div style={{ fontWeight: 700, fontSize: '16px', color: '#1a2428' }}>Datos a recoger al finalizar la llamada</div>
                        </div>

                        <div style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', fontSize: '13px', color: '#1e40af', lineHeight: '1.6' }}>
                            Al finalizar la llamada, el sistema de IA extraerá automáticamente la información de la transcripción y la guardará en los datos del contacto. Puedes añadir campos personalizados, o editarlos en <strong>Ajustes de workspace → Extracción de datos de llamada</strong>.
                        </div>

                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#475569', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Análisis de la llamada
                        </div>

                        {/* Fixed extraction fields */}
                        {[
                            { label: 'Resumen de la llamada', desc: 'Resumen breve de lo que se habló durante la llamada', key: 'summary', type: 'Texto' },
                            { label: 'Nivel de interés', desc: 'Evalúa el nivel de interés del cliente (1-5). Considera factores como el tono, claridad de necesidades y disposición.', key: 'interest_level', type: 'Número' },
                            { label: 'Sentimiento del cliente', desc: 'Analiza el sentimiento general del cliente durante la llamada', key: 'sentiment', type: 'Texto' },
                        ].map(field => (
                            <div key={field.key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#1a2428' }}>{field.label}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{field.desc}</div>
                                </div>
                                <div style={{ background: '#f1f5f9', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>{field.type}</div>
                            </div>
                        ))}

                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#475569', marginBottom: '12px', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Añadir variables
                        </div>

                        {/* Dynamic extraction variables */}
                        {extractionVariables.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                {extractionVariables.map((variable, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>Texto</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Nombre de la variable"
                                                value={variable.name}
                                                onChange={e => {
                                                    const v = [...extractionVariables];
                                                    v[idx].name = e.target.value;
                                                    updateField('extractionVariables', v);
                                                }}
                                                style={{ borderRadius: '10px' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>Valor esperado</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Descripción"
                                                value={variable.description}
                                                onChange={e => {
                                                    const v = [...extractionVariables];
                                                    v[idx].description = e.target.value;
                                                    updateField('extractionVariables', v);
                                                }}
                                                style={{ borderRadius: '10px' }}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => updateField('extractionVariables', extractionVariables.filter((_, i) => i !== idx))}
                                            style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '0 4px', marginTop: '22px' }}
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        <button
                            type="button"
                            onClick={addVariable}
                            style={{ border: '1px dashed #cbd5e1', background: '#f8fafc', borderRadius: '10px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <i className="bi bi-plus-lg"></i> Añadir variable
                        </button>
                    </div>

                    {/* ACCIONES */}
                    <div className="wizard-actions pt-4" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #edf2f7' }}>
                        <button
                            type="button"
                            className="btn"
                            onClick={prevStep}
                            style={{ border: '1px solid #e2e8f0', padding: '10px 24px', borderRadius: '8px', background: '#fff', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <i className="bi bi-arrow-left"></i> Anterior
                        </button>
                        <button
                            type="submit"
                            className="btn"
                            style={{ background: '#267ab0', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            Siguiente <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
