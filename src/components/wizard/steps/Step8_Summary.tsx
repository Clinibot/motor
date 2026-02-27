"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step8_Summary: React.FC = () => {
    const wizardData = useWizardStore();
    const { setStep, prevStep } = wizardData;

    const [isCreating, setIsCreating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const getAgentTypeName = (type: string) => {
        const types: Record<string, string> = {
            'inbound-spain': 'Llamada entrante España',
            'inbound-latam': 'Llamada entrante Latam',
            'outbound-cold': 'Llamada saliente en frío',
            'outbound-warm': 'Llamada saliente templada',
            'support': 'Soporte al cliente',
            'sales': 'Ventas'
        };
        return types[type] || type || 'No definido';
    };

    const getLanguageName = (lang: string) => {
        const names: Record<string, string> = {
            'es-ES': 'Español (España)',
            'es-419': 'Español (Latam)',
            'en-US': 'Inglés (USA)',
            'en-GB': 'Inglés (UK)',
            'pt-BR': 'Portugués (Brasil)',
            'fr-FR': 'Francés'
        };
        return names[lang] || lang || 'No definido';
    };

    const handleCreateAgent = async () => {
        // Validate required fields
        const missing = [];
        if (!wizardData.agentName) missing.push('Nombre del agente');
        if (!wizardData.agentType) missing.push('Tipo de agente');
        if (!wizardData.model) missing.push('Modelo LLM');
        if (!wizardData.voiceId) missing.push('Voz seleccionada');
        if (!wizardData.language) missing.push('Idioma');

        if (missing.length > 0) {
            setErrorMessage(`Faltan campos obligatorios: ${missing.join(', ')}`);
            setShowError(true);
            return;
        }

        setIsCreating(true);

        try {
            // Call the Next.js internal API route
            const response = await fetch('/api/retell/agent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(wizardData)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Error al comunicarse con el servidor");
            }

            console.log("Respuesta del servidor:", data);
            setShowSuccess(true);
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "Error al crear el agente");
            setShowError(true);
        } finally {
            setIsCreating(false);
        }
    };

    if (showSuccess) {
        return (
            <div className="content-area">
                <div className="form-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ width: '80px', height: '80px', background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                        <i className="bi bi-check-circle-fill" style={{ fontSize: '48px', color: 'var(--exito)' }}></i>
                    </div>
                    <h3 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--oscuro)', marginBottom: '12px' }}>
                        ¡Agente IA creado con éxito!
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--gris-texto)', marginBottom: '24px' }}>
                        Tu agente <strong>{wizardData.agentName}</strong> ha sido creado y está listo para usar.
                    </p>
                    <button className="btn btn-primary" onClick={() => window.location.href = '/'}>
                        Ir al Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="content-area">
            <div className="form-card">
                <h1 className="section-title">Resumen de configuración</h1>
                <p className="section-subtitle">
                    Revisa todos los detalles de tu agente antes de crearlo. Puedes editar cualquier paso si necesitas hacer cambios.
                </p>

                {showError && (
                    <div className="alert alert-danger" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {errorMessage}
                        <button type="button" className="btn-close float-end" onClick={() => setShowError(false)}></button>
                    </div>
                )}

                <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>

                    {/* STEP 1 */}
                    <div className="summary-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '24px' }}>
                        <div className="summary-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="bi bi-info-circle-fill text-primary"></i> Paso 1: Información básica
                            </h3>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setStep(1)}><i className="bi bi-pencil"></i> Editar</button>
                        </div>
                        <div className="summary-content" style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-borde)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Tipo de agente</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{getAgentTypeName(wizardData.agentType)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-borde)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Nombre del agente</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.agentName || 'No definido'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Cía</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.companyName || 'No definido'}</span>
                            </div>
                        </div>
                    </div>

                    {/* STEP 2 */}
                    <div className="summary-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '24px' }}>
                        <div className="summary-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="bi bi-robot text-primary"></i> Paso 2: LLM
                            </h3>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setStep(2)}><i className="bi bi-pencil"></i> Editar</button>
                        </div>
                        <div className="summary-content" style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-borde)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Modelo</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.model || 'No definido'}</span>
                            </div>
                            <div style={{ padding: '8px 0' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Prompt General</span>
                                <div style={{ fontSize: '12px', background: 'var(--gris-claro)', padding: '8px', borderRadius: '4px', maxHeight: '100px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                                    {wizardData.prompt || 'Sin prompt'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STEP 3 */}
                    <div className="summary-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '24px' }}>
                        <div className="summary-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="bi bi-mic-fill text-success"></i> Paso 3: Voz
                            </h3>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setStep(3)}><i className="bi bi-pencil"></i> Editar</button>
                        </div>
                        <div className="summary-content" style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-borde)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Voice ID</span>
                                <span style={{ fontSize: '14px', fontWeight: 600, wordBreak: 'break-all' }}>{wizardData.voiceId || 'No definido'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-borde)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Velocidad</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.voiceSpeed}x</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Temperatura</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.voiceTemperature}</span>
                            </div>
                        </div>
                    </div>

                    {/* STEP 4 */}
                    <div className="summary-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '24px' }}>
                        <div className="summary-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="bi bi-chat-dots-fill text-primary"></i> Paso 4: Conversación
                            </h3>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setStep(4)}><i className="bi bi-pencil"></i> Editar</button>
                        </div>
                        <div className="summary-content" style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-borde)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Idioma</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{getLanguageName(wizardData.language)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-borde)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Responsiveness</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.responsiveness}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-borde)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Interrupción</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.interruptionSensitivity}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Backchannel</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.enableBackchannel ? 'Sí' : 'No'}</span>
                            </div>
                        </div>
                    </div>

                    {/* STEP 5 */}
                    <div className="summary-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '24px' }}>
                        <div className="summary-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="bi bi-clock-fill text-warning"></i> Paso 5: Tiempos
                            </h3>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setStep(5)}><i className="bi bi-pencil"></i> Editar</button>
                        </div>
                        <div className="summary-content" style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-borde)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Mensaje Inicial (ms)</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.beginMessageDelayMs}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-borde)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Silencio a Colgar (ms)</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.endCallAfterSilenceMs}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Buzón de Voz</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.enableVoicemailDetection ? 'Activado' : 'Desactivado'}</span>
                            </div>
                        </div>
                    </div>

                    {/* STEP 6 */}
                    <div className="summary-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '24px' }}>
                        <div className="summary-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="bi bi-music-note-beamed text-success"></i> Paso 6: Audio
                            </h3>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setStep(6)}><i className="bi bi-pencil"></i> Editar</button>
                        </div>
                        <div className="summary-content" style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-borde)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Volumen Agente</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.volume}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-borde)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Sonido Ambiente</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.enableAmbientSound ? wizardData.ambientSound : 'Desactivado'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>STT Mode</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.sttMode === 'accurate' ? 'Preciso' : 'Rápido'}</span>
                            </div>
                        </div>
                    </div>

                    {/* STEP 7 */}
                    <div className="summary-card" style={{ gridColumn: '1 / -1', background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '24px' }}>
                        <div className="summary-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="bi bi-gear-fill text-primary"></i> Paso 7: Avanzado
                            </h3>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setStep(7)}><i className="bi bi-pencil"></i> Editar</button>
                        </div>
                        <div className="summary-content" style={{ background: 'white', padding: '16px', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ padding: '6px 12px', background: '#eff6ff', borderRadius: '6px', fontSize: '12px', border: '1px solid #bfdbfe' }}>Finalizar Llamada: {wizardData.enableEndCall ? 'Sí' : 'No'}</div>
                            <div style={{ padding: '6px 12px', background: '#eff6ff', borderRadius: '6px', fontSize: '12px', border: '1px solid #bfdbfe' }}>Reserva Cal.com: {wizardData.enableCalBooking ? 'Sí' : 'No'}</div>
                            <div style={{ padding: '6px 12px', background: '#eff6ff', borderRadius: '6px', fontSize: '12px', border: '1px solid #bfdbfe' }}>Transferencias: {wizardData.transferDestinations.length}</div>
                            <div style={{ padding: '6px 12px', background: '#eff6ff', borderRadius: '6px', fontSize: '12px', border: '1px solid #bfdbfe' }}>Custom Tools: {wizardData.customTools.length}</div>
                            <div style={{ padding: '6px 12px', background: '#ecfdf5', borderRadius: '6px', fontSize: '12px', border: '1px solid #a7f3d0' }}>Análisis IA: {wizardData.enableAnalysis ? 'Sí' : 'No'}</div>
                            <div style={{ padding: '6px 12px', background: '#ecfdf5', borderRadius: '6px', fontSize: '12px', border: '1px solid #a7f3d0' }}>Variables a Extraer: {wizardData.extractionVariables.length}</div>
                            <div style={{ padding: '6px 12px', background: '#fffbeb', borderRadius: '6px', fontSize: '12px', border: '1px solid #fde68a' }}>Webhook Post-Call: {wizardData.webhookUrl ? 'Sí' : 'No'}</div>
                        </div>
                    </div>
                </div>

                {/* ACTIONS */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '32px', paddingTop: '32px', borderTop: '2px solid var(--gris-borde)' }}>
                    <button
                        type="button"
                        className="btn"
                        onClick={handleCreateAgent}
                        disabled={isCreating}
                        style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 600, background: 'var(--exito)', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        {isCreating ? (
                            <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creando Agente...</>
                        ) : (
                            <><i className="bi bi-rocket-takeoff-fill"></i> Crear Agente IA</>
                        )}
                    </button>
                </div>

                <div className="wizard-actions">
                    <button type="button" className="btn btn-secondary" onClick={prevStep}>
                        <i className="bi bi-arrow-left"></i> Anterior
                    </button>
                </div>
            </div>
        </div>
    );
};
