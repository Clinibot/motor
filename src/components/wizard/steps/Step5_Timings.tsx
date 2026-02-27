"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step5_Timings: React.FC = () => {
    const {
        beginMessageDelayMs, endCallAfterSilenceMs, maxCallDurationMs,
        reminderTriggerMs, reminderMaxCount, ringDurationMs,
        enableVoicemailDetection, voicemailDetectionTimeoutMs, voicemailMessage,
        updateField, prevStep, nextStep
    } = useWizardStore();

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        nextStep();
    };

    return (
        <div className="content-area">
            <div className="form-card">
                <h1 className="section-title">Configuración de tiempos</h1>
                <p className="section-subtitle">
                    Define las duraciones, delays y comportamientos temporales de tu agente.
                </p>

                <form onSubmit={handleNext}>
                    {/* PAUSA INICIAL */}
                    <div className="time-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '48px', height: '48px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                <i className="bi bi-clock-history"></i>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>Delay del mensaje inicial</h4>
                                <p style={{ fontSize: '13px', color: 'var(--gris-texto)', margin: 0 }}>Tiempo antes de que el agente comience a hablar</p>
                            </div>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Begin message delay (ms)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={beginMessageDelayMs}
                                    min="0" max="10000" step="100"
                                    onChange={(e) => updateField('beginMessageDelayMs', parseInt(e.target.value) || 0)}
                                    style={{ width: '120px' }}
                                />
                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gris-texto)' }}>ms</span>
                            </div>
                        </div>
                    </div>

                    {/* FINALIZAR POR SILENCIO */}
                    <div className="time-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '48px', height: '48px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                <i className="bi bi-volume-mute"></i>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>Finalizar por silencio</h4>
                                <p style={{ fontSize: '13px', color: 'var(--gris-texto)', margin: 0 }}>Colgar automáticamente si el usuario no responde</p>
                            </div>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">End call after silence (ms)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={endCallAfterSilenceMs}
                                    min="5000" max="120000" step="1000"
                                    onChange={(e) => updateField('endCallAfterSilenceMs', parseInt(e.target.value) || 0)}
                                    style={{ width: '120px' }}
                                />
                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gris-texto)' }}>ms</span>
                            </div>
                        </div>
                    </div>

                    {/* DURACIÓN MÁXIMA DE LLAMADA */}
                    <div className="time-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '48px', height: '48px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                <i className="bi bi-telephone"></i>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>Duración máxima de llamada</h4>
                                <p style={{ fontSize: '13px', color: 'var(--gris-texto)', margin: 0 }}>Límite de tiempo total de la llamada</p>
                            </div>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Max call duration (ms)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={maxCallDurationMs}
                                    min="60000" max="7200000" step="60000"
                                    onChange={(e) => updateField('maxCallDurationMs', parseInt(e.target.value) || 0)}
                                    style={{ width: '120px' }}
                                />
                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gris-texto)' }}>ms</span>
                            </div>
                            <div className="form-text">
                                <i className="bi bi-hourglass-split me-1"></i>
                                {Math.round(maxCallDurationMs / 60000)} minutos - Previene llamadas infinitas
                            </div>
                        </div>
                    </div>

                    <div className="section-divider">
                        <h3>Recordatorios</h3>
                    </div>

                    <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div className="time-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                    <i className="bi bi-bell"></i>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0' }}>Trigger de recordatorio</h4>
                                    <p style={{ fontSize: '12px', color: 'var(--gris-texto)', margin: 0 }}>Tiempo de silencio antes de recordar</p>
                                </div>
                            </div>
                            <div className="form-group mb-0">
                                <label className="form-label">Reminder trigger (ms)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={reminderTriggerMs}
                                        min="3000" max="60000" step="1000"
                                        onChange={(e) => updateField('reminderTriggerMs', parseInt(e.target.value) || 0)}
                                        style={{ width: '100px' }}
                                    />
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gris-texto)' }}>ms</span>
                                </div>
                            </div>
                        </div>

                        <div className="time-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                    <i className="bi bi-arrow-repeat"></i>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0' }}>Máximo de recordatorios</h4>
                                    <p style={{ fontSize: '12px', color: 'var(--gris-texto)', margin: 0 }}>Veces que puede recordar al usuario</p>
                                </div>
                            </div>
                            <div className="form-group mb-0">
                                <label className="form-label">Reminder max count</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={reminderMaxCount}
                                    min="0" max="10" step="1"
                                    onChange={(e) => updateField('reminderMaxCount', parseInt(e.target.value) || 0)}
                                    style={{ width: '100px' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="section-divider">
                        <h3>Detección de buzón de voz</h3>
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                            type="checkbox"
                            id="enableVoicemailDetection"
                            style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                            checked={enableVoicemailDetection}
                            onChange={(e) => updateField('enableVoicemailDetection', e.target.checked)}
                        />
                        <label htmlFor="enableVoicemailDetection" style={{ fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                            Activar detección de voicemail
                        </label>
                    </div>

                    {enableVoicemailDetection && (
                        <div style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '20px', marginTop: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">Timeout de detección (ms)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={voicemailDetectionTimeoutMs}
                                        min="1000" max="15000" step="500"
                                        onChange={(e) => updateField('voicemailDetectionTimeoutMs', parseInt(e.target.value) || 0)}
                                        style={{ width: '120px' }}
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gris-texto)' }}>ms</span>
                                </div>
                            </div>

                            <div className="form-group mb-0">
                                <label className="form-label">Mensaje para voicemail</label>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    value={voicemailMessage}
                                    onChange={(e) => updateField('voicemailMessage', e.target.value)}
                                    placeholder="Ej: Hola, soy Sofia de Netelip. Intentaremos contactarte más tarde. Gracias."
                                />
                            </div>
                        </div>
                    )}

                    <div className="section-divider">
                        <h3>Duración de timbre (Outbound)</h3>
                    </div>

                    <div className="time-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '48px', height: '48px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                <i className="bi bi-telephone-outbound"></i>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>Ring duration</h4>
                                <p style={{ fontSize: '13px', color: 'var(--gris-texto)', margin: 0 }}>Tiempo máximo de timbre antes de colgar</p>
                            </div>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Ring duration (ms)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={ringDurationMs}
                                    min="10000" max="120000" step="5000"
                                    onChange={(e) => updateField('ringDurationMs', parseInt(e.target.value) || 0)}
                                    style={{ width: '120px' }}
                                />
                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gris-texto)' }}>ms</span>
                            </div>
                        </div>
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
