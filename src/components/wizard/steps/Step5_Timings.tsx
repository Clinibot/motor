"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';

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
                <WizardStepHeader
                    title="Tiempos y esperas"
                    subtitle="Define los retardos y límites de tiempo para la interacción del agente."
                    tooltipContent={
                        <>
                            <strong>Gestión de tiempos.</strong> Optimiza la respuesta inicial y la duración máxima de las llamadas para mejorar la experiencia.
                        </>
                    }
                />

                <form onSubmit={handleNext}>
                    {/* PAUSA INICIAL */}
                    <div className="time-card" style={{ background: 'var(--gris-claro)', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '48px', height: '48px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                <i className="bi bi-clock-history"></i>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Delay del mensaje inicial
                                    <div className="custom-tooltip">
                                        <i className="bi bi-info-circle tooltip-icon" style={{ fontSize: '14px' }}></i>
                                        <div className="tooltip-content">Tiempo de espera desde que el usuario contesta hasta que el agente dice el primer mensaje.</div>
                                    </div>
                                </h4>
                                <p style={{ fontSize: '13px', color: 'var(--gris-texto)', margin: 0 }}>Tiempo antes de que el agente comience a hablar</p>
                            </div>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Wait time before greeting (seconds)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={beginMessageDelayMs / 1000}
                                    min="0" max="10" step="0.1"
                                    onChange={(e) => updateField('beginMessageDelayMs', Math.round(parseFloat(e.target.value) * 1000) || 0)}
                                    style={{ width: '120px' }}
                                />
                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gris-texto)' }}>segundos</span>
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
                                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Finalizar por silencio
                                    <div className="custom-tooltip">
                                        <i className="bi bi-info-circle tooltip-icon" style={{ fontSize: '14px' }}></i>
                                        <div className="tooltip-content">Si el usuario no dice nada tras este tiempo de silencio, el agente colgará la llamada de forma educada.</div>
                                    </div>
                                </h4>
                                <p style={{ fontSize: '13px', color: 'var(--gris-texto)', margin: 0 }}>Colgar automáticamente si el usuario no responde</p>
                            </div>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Silence threshold (seconds)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={endCallAfterSilenceMs / 1000}
                                    min="5" max="120" step="1"
                                    onChange={(e) => updateField('endCallAfterSilenceMs', Math.round(parseFloat(e.target.value) * 1000) || 0)}
                                    style={{ width: '120px' }}
                                />
                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gris-texto)' }}>segundos</span>
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
                            <label className="form-label">Max call duration (seconds)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={maxCallDurationMs / 1000}
                                    min="60" max="7200" step="60"
                                    onChange={(e) => updateField('maxCallDurationMs', Math.round(parseFloat(e.target.value) * 1000) || 0)}
                                    style={{ width: '120px' }}
                                />
                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gris-texto)' }}>segundos</span>
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
                                <label className="form-label">Reminder trigger (seconds)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={reminderTriggerMs / 1000}
                                        min="3" max="60" step="1"
                                        onChange={(e) => updateField('reminderTriggerMs', Math.round(parseFloat(e.target.value) * 1000) || 0)}
                                        style={{ width: '100px' }}
                                    />
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gris-texto)' }}>segundos</span>
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
                        <h3>
                            Detección de buzón de voz
                            <div className="custom-tooltip">
                                <i className="bi bi-info-circle tooltip-icon" style={{ fontSize: '18px' }}></i>
                                <div className="tooltip-content">Permite al agente saber si ha saltado un buzón de voz y dejar un mensaje grabado si lo deseas.</div>
                            </div>
                        </h3>
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
                            Activar detección de buzón de voz
                        </label>
                    </div>

                    {enableVoicemailDetection && (
                        <div style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '20px', marginTop: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">Timeout de detección (segundos)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={voicemailDetectionTimeoutMs / 1000}
                                        min="1" max="15" step="0.5"
                                        onChange={(e) => updateField('voicemailDetectionTimeoutMs', Math.round(parseFloat(e.target.value) * 1000) || 0)}
                                        style={{ width: '120px' }}
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gris-texto)' }}>segundos</span>
                                </div>
                            </div>

                            <div className="form-group mb-0">
                                <label className="form-label">Mensaje para buzón de voz</label>
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
                            <label className="form-label">Ring duration (segundos)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={ringDurationMs / 1000}
                                    min="10" max="120" step="5"
                                    onChange={(e) => updateField('ringDurationMs', Math.round(parseFloat(e.target.value) * 1000) || 0)}
                                    style={{ width: '120px' }}
                                />
                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gris-texto)' }}>segundos</span>
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
