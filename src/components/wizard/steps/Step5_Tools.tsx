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

export const Step5_Tools: React.FC = () => {
    const {
        enableCalBooking, calUrl, calApiKey, calEventId, calSearchDays,
        enableTransfer, transferDestinations,
        extractionVariables, agentName,
        updateField, prevStep, nextStep, editingAgentId
    } = useWizardStore();

    const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
    const [isLoadingAgents, setIsLoadingAgents] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (window.location.hash === '#extraction') {
            setTimeout(() => {
                const element = document.getElementById('extraction-section');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
        }
    }, []);

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

                    // Filtrar el agente actual si estamos editando para evitar transferencias a sí mismo
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

        // Variable extraction validation
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
            // Scroll to the first error
            const firstErrorKey = Object.keys(errors)[0];
            if (firstErrorKey) {
                console.warn("Validation failed in Step 5:", errors);
            }
            // Simple alert for immediate feedback
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

    return (
        <div className="content-area">
            <div className="form-card">
                <WizardStepHeader
                    title="Herramientas y funciones"
                    subtitle="Activa integraciones especiales y capas de análisis para potenciar a tu agente."
                    tooltipContent={
                        <>
                            <strong>Capacidades especiales.</strong> Las herramientas permiten al agente interactuar con sistemas externos como calendarios o transferencias de llamadas.
                        </>
                    }
                />

                <form onSubmit={handleNext}>

                    {/* 1. DATA EXTRACTION (CUALIFICACIÓN DE LEAD) */}
                    <div id="extraction-section" className="tool-card" style={{ background: '#f8fafc', border: '1px solid var(--gris-borde)', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontWeight: 700, fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="bi bi-database" style={{ color: 'var(--color-primario)' }}></i> Cualificación de lead (Extracción de datos)
                                </label>
                                <p style={{ fontSize: '13px', color: 'var(--gris-texto)', margin: 0 }}>Define qué información específica debe extraer el agente de cada conversación.</p>
                            </div>
                        </div>

                        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            {extractionVariables.map((variable, idx) => (
                                <div key={idx} className="mb-3">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '12px' }}>
                                        <input type="text" className={`form-control ${errors[`extraction_${idx}_name`] ? 'is-invalid' : ''}`} placeholder="Nombre variable" value={variable.name} onChange={(e) => { const newVars = [...extractionVariables]; newVars[idx].name = e.target.value; updateField('extractionVariables', newVars); }} />
                                        <select className="form-control" value={variable.type} onChange={(e) => { const newVars = [...extractionVariables]; newVars[idx].type = e.target.value; updateField('extractionVariables', newVars); }}>
                                            <option value="string">Texto</option><option value="number">Número</option><option value="boolean">Verdadero/Falso</option>
                                        </select>
                                        <input type="text" className={`form-control ${errors[`extraction_${idx}_desc`] ? 'is-invalid' : ''}`} placeholder="Descripción de qué extraer" value={variable.description} onChange={(e) => { const newVars = [...extractionVariables]; newVars[idx].description = e.target.value; updateField('extractionVariables', newVars); }} />
                                        <button type="button" className="btn btn-outline-danger" onClick={() => updateField('extractionVariables', extractionVariables.filter((_, i) => i !== idx))}><i className="bi bi-trash"></i></button>
                                    </div>
                                    {(errors[`extraction_${idx}_name`] || errors[`extraction_${idx}_desc`]) && (
                                        <div className="text-danger small mt-1">{errors[`extraction_${idx}_name`] || errors[`extraction_${idx}_desc`]}</div>
                                    )}
                                </div>
                            ))}
                            <button type="button" className="btn btn-sm btn-outline-primary mt-2" onClick={addVariable}><i className="bi bi-plus"></i> Añadir variable</button>
                        </div>
                    </div>

                    {/* 2. TRANSFER CALL */}

                    {/* TRANSFER CALL */}
                    <div className="tool-card" style={{ background: enableTransfer ? '#f0f9ff' : 'var(--gris-claro)', border: `1px solid ${enableTransfer ? 'var(--primario)' : 'var(--gris-borde)'}`, borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: enableTransfer ? '20px' : '0' }}>
                            <input
                                type="checkbox"
                                id="enableTransfer"
                                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                checked={enableTransfer}
                                onChange={(e) => updateField('enableTransfer', e.target.checked)}
                            />
                            <div style={{ flex: 1 }}>
                                <label htmlFor="enableTransfer" style={{ fontWeight: 700, fontSize: '16px', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Transferir llamada
                                </label>
                                <p style={{ fontSize: '13px', color: 'var(--gris-texto)', margin: 0 }}>Transfiere la llamada a un número específico o persona determinada</p>
                            </div>
                        </div>

                        {enableTransfer && (
                            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                {transferDestinations.map((dest, idx) => (
                                    <div key={idx} style={{
                                        background: '#f8fafc',
                                        padding: '20px',
                                        borderRadius: '12px',
                                        border: `1px solid ${errors[`transfer_${idx}_name`] || errors[`transfer_${idx}_number`] || errors[`transfer_${idx}_agent`] ? '#ef4444' : '#e2e8f0'}`,
                                        marginBottom: '16px',
                                        position: 'relative'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <h5 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Destino #{idx + 1}</h5>
                                            <button
                                                type="button"
                                                className="btn btn-sm text-danger"
                                                style={{ padding: 0 }}
                                                onClick={() => updateField('transferDestinations', transferDestinations.filter((_, i) => i !== idx))}
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                            <div className="form-group mb-0">
                                                <label className="form-label small">Nombre del contacto</label>
                                                <input
                                                    type="text"
                                                    className={`form-control ${errors[`transfer_${idx}_name`] ? 'is-invalid' : ''}`}
                                                    placeholder="Ej: Sonia / Soporte"
                                                    value={dest.name}
                                                    onChange={(e) => {
                                                        const newDests = [...transferDestinations];
                                                        newDests[idx].name = e.target.value;
                                                        updateField('transferDestinations', newDests);
                                                    }}
                                                />
                                                {errors[`transfer_${idx}_name`] && <div className="text-danger small mt-1">{errors[`transfer_${idx}_name`]}</div>}
                                            </div>
                                            <div className="form-group mb-0">
                                                <label className="form-label small">Instrucción para el agente (Cuándo transferir)</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Ej: Si el cliente pide hablar con administración"
                                                    value={dest.description}
                                                    onChange={(e) => {
                                                        const newDests = [...transferDestinations];
                                                        newDests[idx].description = e.target.value;
                                                        updateField('transferDestinations', newDests);
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', alignItems: 'end' }}>
                                            <div className="form-group mb-0">
                                                <label className="form-label small">Tipo de destino</label>
                                                <select
                                                    className="form-control"
                                                    value={dest.destination_type || 'number'}
                                                    onChange={(e) => {
                                                        const newDests = [...transferDestinations];
                                                        const type = e.target.value as 'number' | 'agent';
                                                        newDests[idx].destination_type = type;
                                                        if (type === 'number') newDests[idx].agentId = '';
                                                        else newDests[idx].number = '';
                                                        updateField('transferDestinations', newDests);
                                                    }}
                                                >
                                                    <option value="number">Humano (Número)</option>
                                                    <option value="agent">Otro Agente (Retell)</option>
                                                </select>
                                            </div>
                                            <div className="form-group mb-0">
                                                <label className="form-label small">{dest.destination_type === 'agent' ? "Seleccionar Agente de Retell" : "Número de teléfono"}</label>
                                                {dest.destination_type === 'agent' ? (
                                                    <select
                                                        className={`form-control ${errors[`transfer_${idx}_agent`] ? 'is-invalid' : ''}`}
                                                        style={{ border: errors[`transfer_${idx}_agent`] ? '1px solid #ef4444' : '1px solid var(--primario)', boxShadow: '0 0 0 1px var(--primario-claro)' }}
                                                        value={dest.agentId || ''}
                                                        onChange={(e) => {
                                                            const newDests = [...transferDestinations];
                                                            newDests[idx].agentId = e.target.value;
                                                            updateField('transferDestinations', newDests);
                                                        }}
                                                    >
                                                        <option value="">Selecciona un agente...</option>
                                                        {availableAgents.map(a => (
                                                            <option key={a.id} value={a.retell_agent_id!}>
                                                                {a.name}
                                                            </option>
                                                        ))}
                                                        {availableAgents.length === 0 && !isLoadingAgents && (
                                                            <option disabled>No tienes más agentes</option>
                                                        )}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        className={`form-control ${errors[`transfer_${idx}_number`] ? 'is-invalid' : ''}`}
                                                        style={{ border: errors[`transfer_${idx}_number`] ? '1px solid #ef4444' : '1px solid var(--primario)', boxShadow: '0 0 0 1px var(--primario-claro)' }}
                                                        placeholder="+34..."
                                                        value={dest.number}
                                                        onChange={(e) => {
                                                            const newDests = [...transferDestinations];
                                                            newDests[idx].number = e.target.value;
                                                            updateField('transferDestinations', newDests);
                                                        }}
                                                    />
                                                )}
                                                {errors[`transfer_${idx}_agent`] && <div className="text-danger small mt-1">{errors[`transfer_${idx}_agent`]}</div>}
                                                {errors[`transfer_${idx}_number`] && <div className="text-danger small mt-1">{errors[`transfer_${idx}_number`]}</div>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" className="btn btn-sm btn-outline-primary" onClick={addTransfer}>
                                    <i className="bi bi-plus"></i> Añadir destino
                                </button>
                                {errors.transfer && <div className="text-danger small mt-2">{errors.transfer}</div>}
                            </div>
                        )}
                    </div>

                    {/* 3. CAL.COM BOOKING */}
                    <div className="tool-card" style={{ background: enableCalBooking ? '#f0f9ff' : 'var(--gris-claro)', border: `1px solid ${enableCalBooking ? 'var(--primario)' : 'var(--gris-borde)'}`, borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: enableCalBooking ? '20px' : '0' }}>
                            <input
                                type="checkbox"
                                id="enableCalBooking"
                                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                checked={enableCalBooking}
                                onChange={(e) => updateField('enableCalBooking', e.target.checked)}
                            />
                            <div style={{ flex: 1 }}>
                                <label htmlFor="enableCalBooking" style={{ fontWeight: 700, fontSize: '16px', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="bi bi-calendar-event" style={{ color: enableCalBooking ? 'var(--color-primario)' : 'inherit' }}></i> Reservar cita en el calendario (Cal.com)
                                </label>
                                <p style={{ fontSize: '13px', color: 'var(--gris-texto)', margin: 0 }}>Integración nativa con Cal.com para agendar citas automáticamente</p>
                            </div>
                        </div>

                        {enableCalBooking && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                <div className="form-group mb-0">
                                    <label className="form-label">Cal.com API Key</label>
                                    <input
                                        type="password"
                                        className={`form-control ${errors.calApiKey ? 'is-invalid' : ''}`}
                                        value={calApiKey}
                                        onChange={(e) => updateField('calApiKey', e.target.value)}
                                        placeholder="cal_live_..."
                                    />
                                    {errors.calApiKey && <div className="invalid-feedback">{errors.calApiKey}</div>}
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">Event Type ID</label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.calEventId ? 'is-invalid' : ''}`}
                                        value={calEventId}
                                        onChange={(e) => updateField('calEventId', e.target.value)}
                                        placeholder="123456"
                                    />
                                    {errors.calEventId && <div className="invalid-feedback">{errors.calEventId}</div>}
                                </div>
                                <div className="form-group mb-0" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Cal.com Link (opcional)</label>
                                    <input
                                        type="url"
                                        className="form-control"
                                        value={calUrl}
                                        onChange={(e) => updateField('calUrl', e.target.value)}
                                        placeholder="https://cal.com/usuario/evento"
                                    />
                                </div>
                                <div className="form-group mb-0" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Días a consultar disponibilidad</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="60"
                                        className="form-control"
                                        value={calSearchDays}
                                        onChange={(e) => updateField('calSearchDays', parseInt(e.target.value) || 6)}
                                    />
                                    <small className="text-muted d-block mt-1">Cuántos días a futuro buscará el agente para ofrecer citas.</small>
                                </div>
                                <div style={{ gridColumn: '1 / -1', background: '#fffbeb', border: '1px solid #fde68a', padding: '12px', borderRadius: '8px', color: '#92400e', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                    <i className="bi bi-exclamation-triangle-fill" style={{ marginTop: '2px' }}></i>
                                    <div>
                                        <strong>Aviso importante:</strong> Para que el agente pueda buscar y ofrecer disponibilidad de horarios, debes asignarle un número de teléfono (ya que funciona vía Webhook en llamadas entrantes). Si no le asignas un número, el agente solo podrá agendar o cancelar citas solicitadas directamente por el usuario.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>


                    <div className="wizard-actions">
                        <button type="button" className="btn btn-secondary" onClick={prevStep}>
                            <i className="bi bi-arrow-left"></i> Atrás
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Siguiente paso <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
