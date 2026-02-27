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
            'transferencia': 'Transferencia de llamadas',
            'agendamiento': 'Agendamiento de citas',
            'cualificacion': 'Cualificación y atención'
        };
        return types[type] || type || 'No definido';
    };

    const getLanguageName = (lang: string) => {
        const names: Record<string, string> = {
            'es-ES': 'Español (España)',
            'es-MX': 'Español (México)',
            'es-AR': 'Español (Argentina)',
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
            const response = await fetch('/api/retell/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(wizardData)
            });

            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || "Error al comunicarse con el servidor");
            setShowSuccess(true);
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "Error al crear el agente");
            setShowError(true);
        } finally {
            setIsCreating(false);
        }
    };

    const resetWizard = () => {
        if (confirm('¿Estás seguro de que deseas reiniciar la configuración? Se perderán todos los datos actuales.')) {
            wizardData.resetWizard();
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
                        <i className="bi bi-grid-fill me-2"></i> Ir al Dashboard
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

                <div className="alert alert-success" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '20px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <i className="bi bi-check-circle-fill" style={{ color: 'var(--exito)', fontSize: '32px' }}></i>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--oscuro)', margin: '0 0 6px 0' }}>¡Configuración completada!</h3>
                        <p style={{ fontSize: '14px', color: 'var(--gris-texto)', margin: 0 }}>Has completado todos los pasos. Revisa el resumen y crea tu agente.</p>
                    </div>
                </div>

                {showError && (
                    <div className="alert alert-danger" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {errorMessage}
                        <button type="button" className="btn-close float-end" onClick={() => setShowError(false)}></button>
                    </div>
                )}

                <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '32px' }}>

                    {/* PASO 1: INFORMACIÓN BÁSICA */}
                    <div className="summary-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '24px' }}>
                        <div className="summary-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                    <i className="bi bi-info-circle-fill" style={{ color: 'var(--netelip-azul)' }}></i>
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Paso 1: Información básica</h3>
                            </div>
                            <button className="btn btn-sm" style={{ background: 'white', border: '1px solid var(--gris-borde)', color: 'var(--gris-texto)', fontWeight: 600 }} onClick={() => setStep(1)}>
                                <i className="bi bi-pencil"></i> Editar
                            </button>
                        </div>
                        <div className="summary-content" style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--gris-borde)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Tipo de agente</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{getAgentTypeName(wizardData.agentType)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Nombre / Cía</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.agentName} ({wizardData.companyName})</span>
                            </div>
                        </div>
                    </div>

                    {/* PASO 2: INFORMACIÓN EMPRESA (NEW) */}
                    <div className="summary-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '24px' }}>
                        <div className="summary-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                    <i className="bi bi-building-fill" style={{ color: 'var(--netelip-azul)' }}></i>
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Paso 2: Información de la empresa</h3>
                            </div>
                            <button className="btn btn-sm" style={{ background: 'white', border: '1px solid var(--gris-borde)', color: 'var(--gris-texto)', fontWeight: 600 }} onClick={() => setStep(2)}>
                                <i className="bi bi-pencil"></i> Editar
                            </button>
                        </div>
                        <div className="summary-content" style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gris-borde)' }}>
                                <span style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>Web / Tel</span>
                                <span style={{ fontSize: '13px', fontWeight: 600 }}>{wizardData.companyWebsite || '—'} / {wizardData.companyPhone || '—'}</span>
                            </div>
                            <div style={{ marginTop: '8px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--gris-texto)', fontWeight: 700, textTransform: 'uppercase' }}>Horarios:</span>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '4px' }}>
                                    {wizardData.businessHours.slice(0, 6).map(h => (
                                        <div key={h.day} style={{ fontSize: '11px' }}>
                                            <strong>{h.day.substring(0, 2)}:</strong> {h.closed ? 'Cerrado' : `${h.open}-${h.close}`}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {wizardData.knowledgeBaseFiles.length > 0 && (
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--gris-borde)' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--gris-texto)', fontWeight: 700, textTransform: 'uppercase' }}>Base de conocimiento:</span>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--netelip-azul)', marginTop: '4px' }}>
                                        <i className="bi bi-file-earmark-arrow-up me-1"></i>
                                        {wizardData.knowledgeBaseFiles.length} archivos subidos
                                    </div>
                                    {wizardData.knowledgeBaseUsage && (
                                        <div style={{ fontSize: '11px', color: 'var(--gris-texto)', marginTop: '4px', fontStyle: 'italic' }}>
                                            "{wizardData.knowledgeBaseUsage.substring(0, 50)}..."
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PASO 3: SELECCIÓN DE VOZ */}
                    <div className="summary-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '24px' }}>
                        <div className="summary-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                    <i className="bi bi-mic-fill" style={{ color: 'var(--exito)' }}></i>
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Paso 3: Selección de voz</h3>
                            </div>
                            <button className="btn btn-sm" style={{ background: 'white', border: '1px solid var(--gris-borde)', color: 'var(--gris-texto)', fontWeight: 600 }} onClick={() => setStep(3)}>
                                <i className="bi bi-pencil"></i> Editar
                            </button>
                        </div>
                        <div className="summary-content" style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Voz</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.voiceName} ({wizardData.voiceSpeed}x)</span>
                            </div>
                        </div>
                    </div>

                    {/* PASO 4: CONVERSACIÓN */}
                    <div className="summary-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '24px' }}>
                        <div className="summary-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                    <i className="bi bi-chat-dots-fill" style={{ color: 'var(--netelip-azul)' }}></i>
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Paso 4: Conversación</h3>
                            </div>
                            <button className="btn btn-sm" style={{ background: 'white', border: '1px solid var(--gris-borde)', color: 'var(--gris-texto)', fontWeight: 600 }} onClick={() => setStep(4)}>
                                <i className="bi bi-pencil"></i> Editar
                            </button>
                        </div>
                        <div className="summary-content" style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Idioma / Ambiente</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{getLanguageName(wizardData.language)} / {wizardData.enableAmbientSound ? 'Activo' : 'No'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Paso 5: Tiempos */}
                    <div className="summary-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '24px' }}>
                        <div className="summary-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                    <i className="bi bi-clock-fill" style={{ color: 'var(--warning)' }}></i>
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Paso 5: Tiempos</h3>
                            </div>
                            <button className="btn btn-sm" style={{ background: 'white', border: '1px solid var(--gris-borde)', color: 'var(--gris-texto)', fontWeight: 600 }} onClick={() => setStep(5)}>
                                <i className="bi bi-pencil"></i> Editar
                            </button>
                        </div>
                        <div className="summary-content" style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                                <span style={{ fontSize: '13px', color: 'var(--gris-texto)', fontWeight: 600 }}>Delay / Silencio</span>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{wizardData.beginMessageDelayMs}ms / {wizardData.endCallAfterSilenceMs}ms</span>
                            </div>
                        </div>
                    </div>

                    {/* Paso 6: Avanzado */}
                    <div className="summary-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '24px' }}>
                        <div className="summary-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                    <i className="bi bi-gear-fill" style={{ color: 'var(--netelip-azul)' }}></i>
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Paso 6: Config. avanzada</h3>
                            </div>
                            <button className="btn btn-sm" style={{ background: 'white', border: '1px solid var(--gris-borde)', color: 'var(--gris-texto)', fontWeight: 600 }} onClick={() => setStep(6)}>
                                <i className="bi bi-pencil"></i> Editar
                            </button>
                        </div>
                        <div className="summary-content" style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {wizardData.enableCalBooking && <span className="badge bg-light text-dark border">Cal.com</span>}
                                {wizardData.enableTransfer && <span className="badge bg-light text-dark border">Transf.</span>}
                                {wizardData.extractionVariables.length > 0 && <span className="badge bg-light text-dark border">Extraer ({wizardData.extractionVariables.length})</span>}
                            </div>
                        </div>
                    </div>

                    {/* Step 7: LLM Card */}
                    <div className="summary-card" style={{ gridColumn: '1 / -1', background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '24px' }}>
                        <div className="summary-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                    <i className="bi bi-robot" style={{ color: 'var(--netelip-azul)' }}></i>
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Paso 7: Configuración LLM</h3>
                            </div>
                            <button className="btn btn-sm" style={{ background: 'white', border: '1px solid var(--gris-borde)', color: 'var(--gris-texto)', fontWeight: 600 }} onClick={() => setStep(7)}>
                                <i className="bi bi-pencil"></i> Editar
                            </button>
                        </div>
                        <div className="summary-content" style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px', maxHeight: '100px', overflowY: 'auto', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' }}>
                                {wizardData.prompt}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '32px', paddingTop: '32px', borderTop: '2px solid var(--gris-borde)' }}>
                    <button
                        type="button"
                        className="btn"
                        onClick={handleCreateAgent}
                        disabled={isCreating}
                        style={{ padding: '16px', fontSize: '15px', fontWeight: 700, background: 'var(--exito)', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', cursor: isCreating ? 'not-allowed' : 'pointer' }}>
                        {isCreating ? 'Creando...' : <><i className="bi bi-rocket-takeoff-fill"></i> Crear Agente IA</>}
                    </button>

                    <button
                        type="button"
                        className="btn"
                        onClick={resetWizard}
                        style={{ padding: '16px', fontSize: '15px', fontWeight: 700, background: 'white', color: 'var(--danger)', border: '1.5px solid var(--danger)', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                        <i className="bi bi-arrow-counterclockwise"></i> Reiniciar Agente IA
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
