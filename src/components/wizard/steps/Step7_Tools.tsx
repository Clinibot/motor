"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';

const TEMPLATE_VARIABLES = [
    { name: 'user_name', type: 'string', description: 'Nombre completo del usuario mencionado durante la llamada' },
    { name: 'email', type: 'string', description: 'Correo electrónico del usuario. Debe estar deletreado correctamente. Si no se menciona, dejar vacío.' },
    { name: 'phone_number', type: 'string', description: 'Número de teléfono del usuario mencionado durante la llamada' },
    { name: 'call_summary', type: 'string', description: 'Resumen breve de la conversación en 2-3 frases. Incluye el motivo de la llamada y resultado.' },
    { name: 'call_successful', type: 'boolean', description: 'Indica si la llamada fue exitosa (true) o no (false). Una llamada es exitosa si se resolvió la consulta del usuario o se completó el objetivo.' }
];

export const Step7_Tools: React.FC = () => {
    const {
        enableEndCall, endCallDescription,
        enableCalBooking, calUrl, calApiKey, calEventId,
        enableCalAvailability, calAvailabilityDays,
        enableTransfer, transferDestinations,
        enableCustomTools, customTools,
        useTemplate, extractionVariables,
        enableAnalysis, analysisModel,
        webhookUrl, webhookInbound,
        updateField, prevStep, nextStep
    } = useWizardStore();

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        nextStep();
    };

    // Transfer Destinations
    const addTransferDestination = () => {
        updateField('transferDestinations', [...transferDestinations, { name: '', number: '', description: '' }]);
    };
    const removeTransferDestination = (index: number) => {
        updateField('transferDestinations', transferDestinations.filter((_, i) => i !== index));
    };
    const updateTransferField = (index: number, field: string, value: string) => {
        const newItems = [...transferDestinations];
        newItems[index] = { ...newItems[index], [field]: value };
        updateField('transferDestinations', newItems);
    };

    // Custom Tools
    const addCustomTool = () => {
        updateField('customTools', [...customTools, { name: '', url: '', description: '', speakDuring: false, speakAfter: true }]);
    };
    const removeCustomTool = (index: number) => {
        updateField('customTools', customTools.filter((_, i) => i !== index));
    };
    const updateCustomToolField = (index: number, field: string, value: string | boolean) => {
        const newItems = [...customTools];
        newItems[index] = { ...newItems[index], [field]: value };
        updateField('customTools', newItems);
    };

    // Variables
    const addVariable = () => {
        updateField('extractionVariables', [...extractionVariables, { name: '', type: 'string', description: '' }]);
    };
    const removeVariable = (index: number) => {
        updateField('extractionVariables', extractionVariables.filter((_, i) => i !== index));
    };
    const updateVariableField = (index: number, field: string, value: string) => {
        const newItems = [...extractionVariables];
        newItems[index] = { ...newItems[index], [field]: value };
        updateField('extractionVariables', newItems);
    };

    const handleToggleTemplate = (checked: boolean) => {
        updateField('useTemplate', checked);
        if (checked) {
            updateField('extractionVariables', [...TEMPLATE_VARIABLES]);
        } else {
            updateField('extractionVariables', []);
        }
    };

    return (
        <div className="content-area">
            <div className="form-card">
                <h1 className="section-title">Configuración avanzada</h1>
                <p className="section-subtitle">
                    Configura herramientas, análisis automático, extracción de datos y webhooks para integrar tu agente con tus sistemas.
                </p>

                <form onSubmit={handleNext}>
                    {/* SECCIÓN 1: HERRAMIENTAS */}
                    <div className="section-divider" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="bi bi-tools"></i> Herramientas del agente
                        </h3>
                        <p>Selecciona las acciones que tu agente podrá ejecutar durante las llamadas.</p>
                    </div>

                    {/* End Call Tool */}
                    <div style={{ background: enableEndCall ? '#eff6ff' : 'white', border: enableEndCall ? '2px solid var(--netelip-azul)' : '1px solid var(--gris-borde)', borderRadius: '10px', padding: '16px', marginBottom: '16px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: '12px' }} onClick={() => updateField('enableEndCall', !enableEndCall)}>
                        <input type="checkbox" checked={enableEndCall} onChange={() => { }} style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '4px' }} />
                        <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600 }}>Finalizar llamada (recomendada)</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--gris-texto)' }}>Permite al agente terminar la llamada cuando detecta que la conversación ha concluido</p>
                        </div>
                    </div>
                    {enableEndCall && (
                        <div style={{ background: 'var(--gris-claro)', borderRadius: '10px', padding: '24px', marginTop: '-8px', marginBottom: '24px' }}>
                            <div className="form-group mb-0">
                                <label className="form-label">Descripción del comportamiento</label>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    value={endCallDescription}
                                    onChange={(e) => updateField('endCallDescription', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Cal.com Booking Tool */}
                    <div style={{ background: enableCalBooking ? '#eff6ff' : 'white', border: enableCalBooking ? '2px solid var(--netelip-azul)' : '1px solid var(--gris-borde)', borderRadius: '10px', padding: '16px', marginBottom: '16px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: '12px' }} onClick={() => updateField('enableCalBooking', !enableCalBooking)}>
                        <input type="checkbox" checked={enableCalBooking} onChange={() => { }} style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '4px' }} />
                        <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600 }}>Reservar cita en el calendario (Cal.com)</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--gris-texto)' }}>Integración nativa con Cal.com para agendar citas automáticamente</p>
                        </div>
                    </div>
                    {enableCalBooking && (
                        <div style={{ background: 'var(--gris-claro)', borderRadius: '10px', padding: '24px', marginTop: '-8px', marginBottom: '24px' }}>
                            <div className="form-group">
                                <label className="form-label">Calendar URL</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={calUrl}
                                    onChange={(e) => updateField('calUrl', e.target.value)}
                                    placeholder="cal.com/tu-usuario"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Cal.com API Key</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={calApiKey}
                                    onChange={(e) => updateField('calApiKey', e.target.value)}
                                    placeholder="cal_live_xxxxxxxxxxxxx"
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
                        </div>
                    )}

                    {/* Cal.com Availability Tool */}
                    <div style={{ background: enableCalAvailability ? '#eff6ff' : 'white', border: enableCalAvailability ? '2px solid var(--netelip-azul)' : '1px solid var(--gris-borde)', borderRadius: '10px', padding: '16px', marginBottom: '16px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: '12px' }} onClick={() => updateField('enableCalAvailability', !enableCalAvailability)}>
                        <input type="checkbox" checked={enableCalAvailability} onChange={() => { }} style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '4px' }} />
                        <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600 }}>Búsqueda de disponibilidad</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--gris-texto)' }}>Consulta disponibilidad de horarios antes de confirmar citas</p>
                        </div>
                    </div>
                    {enableCalAvailability && (
                        <div style={{ background: 'var(--gris-claro)', borderRadius: '10px', padding: '24px', marginTop: '-8px', marginBottom: '24px' }}>
                            <div className="form-group mb-0">
                                <label className="form-label">Días a consultar</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={calAvailabilityDays}
                                    onChange={(e) => updateField('calAvailabilityDays', parseInt(e.target.value) || 7)}
                                    min="1" max="30"
                                />
                            </div>
                        </div>
                    )}

                    {/* Transfer Tool */}
                    <div style={{ background: enableTransfer ? '#eff6ff' : 'white', border: enableTransfer ? '2px solid var(--netelip-azul)' : '1px solid var(--gris-borde)', borderRadius: '10px', padding: '16px', marginBottom: '16px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: '12px' }} onClick={() => updateField('enableTransfer', !enableTransfer)}>
                        <input type="checkbox" checked={enableTransfer} onChange={() => { }} style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '4px' }} />
                        <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600 }}>Transferir llamada</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--gris-texto)' }}>Transfiere la llamada a un número específico o persona determinada</p>
                        </div>
                    </div>
                    {enableTransfer && (
                        <div style={{ background: 'var(--gris-claro)', borderRadius: '10px', padding: '24px', marginTop: '-8px', marginBottom: '24px' }}>
                            {transferDestinations.map((dest, i) => (
                                <div key={i} style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: '8px', padding: '16px', marginBottom: '16px', position: 'relative' }}>
                                    <button type="button" onClick={() => removeTransferDestination(i)} style={{ position: 'absolute', top: '12px', right: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>×</button>
                                    <div className="form-group">
                                        <label className="form-label">Nombre del destino</label>
                                        <input type="text" className="form-control" value={dest.name} onChange={(e) => updateTransferField(i, 'name', e.target.value)} placeholder="Ej: Soporte técnico" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Número de teléfono</label>
                                        <input type="tel" className="form-control" value={dest.number} onChange={(e) => updateTransferField(i, 'number', e.target.value)} placeholder="+34912345678" />
                                    </div>
                                    <div className="form-group mb-0">
                                        <label className="form-label">Descripción / Criterio</label>
                                        <textarea className="form-control" rows={2} value={dest.description} onChange={(e) => updateTransferField(i, 'description', e.target.value)} />
                                    </div>
                                </div>
                            ))}
                            <button type="button" className="btn btn-secondary" onClick={addTransferDestination} style={{ marginTop: '8px' }}>
                                <i className="bi bi-plus"></i> Añadir destino
                            </button>
                        </div>
                    )}

                    {/* Custom Tools */}
                    <div style={{ background: enableCustomTools ? '#eff6ff' : 'white', border: enableCustomTools ? '2px solid var(--netelip-azul)' : '1px solid var(--gris-borde)', borderRadius: '10px', padding: '16px', marginBottom: '16px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: '12px' }} onClick={() => updateField('enableCustomTools', !enableCustomTools)}>
                        <input type="checkbox" checked={enableCustomTools} onChange={() => { }} style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '4px' }} />
                        <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600 }}>Añadir herramienta personalizada</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--gris-texto)' }}>Añade webhooks personalizados o herramientas adicionales</p>
                        </div>
                    </div>
                    {enableCustomTools && (
                        <div style={{ background: 'var(--gris-claro)', borderRadius: '10px', padding: '24px', marginTop: '-8px', marginBottom: '24px' }}>
                            {customTools.map((tool, i) => (
                                <div key={i} style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: '8px', padding: '16px', marginBottom: '16px', position: 'relative' }}>
                                    <button type="button" onClick={() => removeCustomTool(i)} style={{ position: 'absolute', top: '12px', right: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>×</button>
                                    <div className="form-group">
                                        <label className="form-label">Nombre de la herramienta</label>
                                        <input type="text" className="form-control" value={tool.name} onChange={(e) => updateCustomToolField(i, 'name', e.target.value)} placeholder="ej_consultar_codigo" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">URL del webhook</label>
                                        <input type="url" className="form-control" value={tool.url} onChange={(e) => updateCustomToolField(i, 'url', e.target.value)} placeholder="https://api..." />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Descripción para el LLM</label>
                                        <textarea className="form-control" rows={2} value={tool.description} onChange={(e) => updateCustomToolField(i, 'description', e.target.value)} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                            <input type="checkbox" checked={tool.speakDuring} onChange={(e) => updateCustomToolField(i, 'speakDuring', e.target.checked)} />
                                            Hablar durante ejecución
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                            <input type="checkbox" checked={tool.speakAfter} onChange={(e) => updateCustomToolField(i, 'speakAfter', e.target.checked)} />
                                            Hablar después
                                        </label>
                                    </div>
                                </div>
                            ))}
                            <button type="button" className="btn btn-secondary" onClick={addCustomTool} style={{ marginTop: '8px' }}>
                                <i className="bi bi-plus"></i> Añadir herramienta
                            </button>
                        </div>
                    )}

                    {/* SECCIÓN 2: EXTRACCIÓN DE DATOS */}
                    <div className="section-divider">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="bi bi-database"></i> Extracción de datos
                        </h3>
                        <p>Define qué información específica debe extraer el agente de cada conversación.</p>
                    </div>

                    <div style={{ background: useTemplate ? '#eff6ff' : 'white', border: useTemplate ? '2px solid var(--netelip-azul)' : '1px solid var(--gris-borde)', borderRadius: '10px', padding: '16px', marginBottom: '24px', cursor: 'pointer', display: 'flex', gap: '12px' }} onClick={() => handleToggleTemplate(!useTemplate)}>
                        <input type="checkbox" checked={useTemplate} onChange={() => { }} style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '4px' }} />
                        <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600 }}>Usar plantilla de variables recomendadas</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--gris-texto)' }}>Carga automáticamente las variables más comunes: nombre, email, teléfono, Call Summary y Call Successful</p>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Variables a extraer</label>
                        <div style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', overflow: 'hidden' }}>
                            {(extractionVariables || []).map((vari, i) => (
                                <div key={i} style={{ padding: '16px', borderBottom: '1px solid var(--gris-borde)', display: 'grid', gridTemplateColumns: '1fr 120px 2fr 40px', gap: '12px', alignItems: 'center', background: 'white' }}>
                                    <input type="text" className="form-control" value={vari.name} onChange={(e) => updateVariableField(i, 'name', e.target.value)} placeholder="nombre_variable" />
                                    <select className="form-control" value={vari.type} onChange={(e) => updateVariableField(i, 'type', e.target.value)}>
                                        <option value="string">string</option>
                                        <option value="boolean">boolean</option>
                                        <option value="number">number</option>
                                    </select>
                                    <input type="text" className="form-control" value={vari.description} onChange={(e) => updateVariableField(i, 'description', e.target.value)} placeholder="Descripción para el LLM" />
                                    <button type="button" onClick={() => removeVariable(i)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="bi bi-trash"></i></button>
                                </div>
                            ))}
                            <div style={{ padding: '12px 16px', background: 'white' }}>
                                <button type="button" className="btn btn-secondary" onClick={addVariable} style={{ fontSize: '13px', padding: '6px 12px' }}>
                                    <i className="bi bi-plus"></i> Añadir variable
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 3: WEBHOOKS Y ANÁLISIS */}
                    <div className="section-divider">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="bi bi-send"></i> Webhooks y análisis post-llamada
                        </h3>
                        <p>Configura el análisis automático con IA y los webhooks para enviar información a tus sistemas.</p>
                    </div>

                    <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Análisis post-llamada con IA</h4>
                    <div style={{ background: enableAnalysis ? '#eff6ff' : 'white', border: enableAnalysis ? '2px solid var(--netelip-azul)' : '1px solid var(--gris-borde)', borderRadius: '10px', padding: '16px', marginBottom: '16px', cursor: 'pointer', display: 'flex', gap: '12px' }} onClick={() => updateField('enableAnalysis', !enableAnalysis)}>
                        <input type="checkbox" checked={enableAnalysis} onChange={() => { }} style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '4px' }} />
                        <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600 }}>Activar análisis automático</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--gris-texto)' }}>Genera una evaluación rápida de la conversación</p>
                        </div>
                    </div>
                    {enableAnalysis && (
                        <div style={{ background: 'var(--gris-claro)', borderRadius: '10px', padding: '24px', marginTop: '-8px', marginBottom: '24px' }}>
                            <div className="form-group mb-0">
                                <label className="form-label">Modelo de análisis</label>
                                <select className="form-control" value={analysisModel} onChange={(e) => updateField('analysisModel', e.target.value)}>
                                    <option value="gpt-4.1">GPT-4.1 (Recomendado)</option>
                                    <option value="gpt-4o">GPT-4o (Mayor profundidad)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Webhooks</h4>
                    <div className="form-group">
                        <label className="form-label">URL del webhook post-llamada (Outbound/Inbound end)</label>
                        <input
                            type="url"
                            className="form-control"
                            value={webhookUrl}
                            onChange={(e) => updateField('webhookUrl', e.target.value)}
                            placeholder="https://tu-servidor.com/webhook/post-call"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">URL del webhook llamadas entrantes (Inbound start)</label>
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
