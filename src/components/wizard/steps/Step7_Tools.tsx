"use client";

import React, { useState, useEffect } from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { createClient } from '../../../lib/supabase/client';

interface AvailableAgent {
    id: string;
    name: string;
    retell_agent_id: string | null;
}

export const Step7_Tools: React.FC = () => {
    const {
        enableCalBooking, calUrl, calApiKey, calEventId,
        enableTransfer, transferDestinations,
        enableCustomTools, customTools,
        extractionVariables, webhookInbound,
        updateField, prevStep, nextStep, editingAgentId
    } = useWizardStore();

    const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
    const [isLoadingAgents, setIsLoadingAgents] = useState(false);

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
                    const filteredList = (agentList || []).filter(a => a.retell_agent_id !== editingAgentId);
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
    }, [enableTransfer, editingAgentId]);

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        nextStep();
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
        updateField('extractionVariables', [...extractionVariables, { name: '', type: 'string', description: '' }]);
    };

    const addCustomTool = () => {
        updateField('customTools', [...customTools, { name: '', url: '', description: '', speakDuring: false, speakAfter: false }]);
    };

    return (
        <div className="content-area">
            <div className="form-card">
                <h1 className="section-title">
                    Configuración avanzada
                    <div className="custom-tooltip">
                        <i className="bi bi-info-circle tooltip-icon"></i>
                        <div className="tooltip-content">
                            Configura las herramientas y los puntos de integración para que tu agente pueda interactuar con sistemas externos.
                        </div>
                    </div>
                </h1>
                <p className="section-subtitle">
                    Selecciona las herramientas que tu agente podrá utilizar durante las llamadas.
                </p>

                <form onSubmit={handleNext}>
                    {/* CAL.COM BOOKING */}
                    <div className="tool-card" style={{ background: enableCalBooking ? '#f0f9ff' : 'var(--gris-claro)', border: `1px solid ${enableCalBooking ? 'var(--primario)' : 'var(--gris-borde)'}`, borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
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
                                    Reservar cita en el calendario (Cal.com)
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
                                        className="form-control"
                                        value={calApiKey}
                                        onChange={(e) => updateField('calApiKey', e.target.value)}
                                        placeholder="cal_live_..."
                                    />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label">Event Type ID</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={calEventId}
                                        onChange={(e) => updateField('calEventId', e.target.value)}
                                        placeholder="123456"
                                    />
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
                            </div>
                        )}
                    </div>

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
                                        border: '1px solid #e2e8f0',
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
                                                    className="form-control"
                                                    placeholder="Ej: Sonia / Soporte"
                                                    value={dest.name}
                                                    onChange={(e) => {
                                                        const newDests = [...transferDestinations];
                                                        newDests[idx].name = e.target.value;
                                                        updateField('transferDestinations', newDests);
                                                    }}
                                                />
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
                                                        className="form-control"
                                                        style={{ border: '1px solid var(--primario)', boxShadow: '0 0 0 1px var(--primario-claro)' }}
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
                                                        className="form-control"
                                                        style={{ border: '1px solid var(--primario)', boxShadow: '0 0 0 1px var(--primario-claro)' }}
                                                        placeholder="+34..."
                                                        value={dest.number}
                                                        onChange={(e) => {
                                                            const newDests = [...transferDestinations];
                                                            newDests[idx].number = e.target.value;
                                                            updateField('transferDestinations', newDests);
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" className="btn btn-sm btn-outline-primary" onClick={addTransfer}>
                                    <i className="bi bi-plus"></i> Añadir destino
                                </button>
                            </div>
                        )}
                    </div>

                    {/* CUSTOM TOOLS */}
                    <div className="tool-card" style={{ background: enableCustomTools ? '#f0f9ff' : 'var(--gris-claro)', border: `1px solid ${enableCustomTools ? 'var(--primario)' : 'var(--gris-borde)'}`, borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: enableCustomTools ? '20px' : '0' }}>
                            <input
                                type="checkbox"
                                id="enableCustomTools"
                                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                checked={enableCustomTools}
                                onChange={(e) => updateField('enableCustomTools', e.target.checked)}
                            />
                            <div style={{ flex: 1 }}>
                                <label htmlFor="enableCustomTools" style={{ fontWeight: 700, fontSize: '16px', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Añadir herramienta personalizada
                                </label>
                                <p style={{ fontSize: '13px', color: 'var(--gris-texto)', margin: 0 }}>Define webhooks o APIs externas para que el agente consulte durante la llamada</p>
                            </div>
                        </div>

                        {enableCustomTools && (
                            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                {customTools.map((tool, idx) => (
                                    <div key={idx} style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                            <h5 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Herramienta #{idx + 1}</h5>
                                            <button
                                                type="button"
                                                className="btn btn-sm text-danger"
                                                style={{ padding: 0 }}
                                                onClick={() => updateField('customTools', customTools.filter((_, i) => i !== idx))}
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                                            <div className="form-group mb-0">
                                                <label className="form-label small">Nombre de la herramienta</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="Ej: consultar_inventario"
                                                    value={tool.name}
                                                    onChange={(e) => {
                                                        const newTools = [...customTools];
                                                        newTools[idx].name = e.target.value;
                                                        updateField('customTools', newTools);
                                                    }}
                                                />
                                            </div>
                                            <div className="form-group mb-0">
                                                <label className="form-label small">URL del Webhook</label>
                                                <input
                                                    type="url"
                                                    className="form-control form-control-sm"
                                                    placeholder="https://api.empresa.com/endpoint"
                                                    value={tool.url}
                                                    onChange={(e) => {
                                                        const newTools = [...customTools];
                                                        newTools[idx].url = e.target.value;
                                                        updateField('customTools', newTools);
                                                    }}
                                                />
                                            </div>
                                            <div className="form-group mb-0" style={{ gridColumn: '1 / -1' }}>
                                                <label className="form-label small">Descripción de uso (Prompt para el agente)</label>
                                                <textarea
                                                    className="form-control form-control-sm"
                                                    rows={2}
                                                    placeholder="Ej: Usa esta herramienta cuando el cliente pregunte por la disponibilidad de un producto."
                                                    value={tool.description}
                                                    onChange={(e) => {
                                                        const newTools = [...customTools];
                                                        newTools[idx].description = e.target.value;
                                                        updateField('customTools', newTools);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                            <div className="form-check custom-check mb-0" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                    className="form-check-input" type="checkbox" id={`speakDuring_${idx}`}
                                                    checked={tool.speakDuring}
                                                    onChange={(e) => {
                                                        const newTools = [...customTools];
                                                        newTools[idx].speakDuring = e.target.checked;
                                                        updateField('customTools', newTools);
                                                    }}
                                                    style={{ marginTop: 0 }}
                                                />
                                                <label className="form-check-label small" htmlFor={`speakDuring_${idx}`} style={{ cursor: 'pointer' }}>
                                                    Agente habla mientras consulta
                                                </label>
                                            </div>
                                            <div className="form-check custom-check mb-0" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                    className="form-check-input" type="checkbox" id={`speakAfter_${idx}`}
                                                    checked={tool.speakAfter}
                                                    onChange={(e) => {
                                                        const newTools = [...customTools];
                                                        newTools[idx].speakAfter = e.target.checked;
                                                        updateField('customTools', newTools);
                                                    }}
                                                    style={{ marginTop: 0 }}
                                                />
                                                <label className="form-check-label small" htmlFor={`speakAfter_${idx}`} style={{ cursor: 'pointer' }}>
                                                    Agente habla al terminar
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" className="btn btn-sm btn-outline-primary" onClick={addCustomTool}>
                                    <i className="bi bi-plus"></i> Añadir herramienta
                                </button>
                            </div>
                        )}
                    </div>

                    {/* DATA EXTRACTION */}
                    <div className="section-divider" style={{ borderTop: '2px solid var(--gris-borde)', paddingTop: '32px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="bi bi-database"></i> Extracción de datos
                        </h3>
                        <p>Define qué información específica debe extraer el agente de cada conversación.</p>
                    </div>

                    <div style={{ background: 'var(--gris-claro)', padding: '24px', borderRadius: '12px', border: '1px solid var(--gris-borde)' }}>
                        {extractionVariables.map((variable, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '12px', marginBottom: '12px' }}>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Nombre variable"
                                    value={variable.name}
                                    onChange={(e) => {
                                        const newVars = [...extractionVariables];
                                        newVars[idx].name = e.target.value;
                                        updateField('extractionVariables', newVars);
                                    }}
                                />
                                <select
                                    className="form-control"
                                    value={variable.type}
                                    onChange={(e) => {
                                        const newVars = [...extractionVariables];
                                        newVars[idx].type = e.target.value;
                                        updateField('extractionVariables', newVars);
                                    }}
                                >
                                    <option value="string">Texto</option>
                                    <option value="number">Número</option>
                                    <option value="boolean">Verdadero/Falso</option>
                                </select>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Descripción de qué extraer"
                                    value={variable.description}
                                    onChange={(e) => {
                                        const newVars = [...extractionVariables];
                                        newVars[idx].description = e.target.value;
                                        updateField('extractionVariables', newVars);
                                    }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() => updateField('extractionVariables', extractionVariables.filter((_, i) => i !== idx))}
                                >
                                    <i className="bi bi-trash"></i>
                                </button>
                            </div>
                        ))}
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={addVariable}>
                            <i className="bi bi-plus"></i> Añadir variable
                        </button>
                    </div>

                    {/* INBOUND WEBHOOK */}
                    <div className="form-group" style={{ marginTop: '32px' }}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            URL del webhook para llamadas entrantes
                            <div className="custom-tooltip">
                                <i className="bi bi-info-circle tooltip-icon" style={{ fontSize: '14px' }}></i>
                                <div className="tooltip-content">
                                    Opcional - Se ejecuta cuando el agente recibe una llamada entrante.
                                </div>
                            </div>
                        </label>
                        <input
                            type="url"
                            className="form-control"
                            value={webhookInbound}
                            onChange={(e) => updateField('webhookInbound', e.target.value)}
                            placeholder="https://tu-servidor.com/webhook/inbound"
                        />
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
