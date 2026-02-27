"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step6_Audio: React.FC = () => {
    const {
        volume, enableAmbientSound, ambientSound, ambientSoundVolume,
        sttMode, enableTranscriptionFormatting,
        updateField, prevStep, nextStep
    } = useWizardStore();

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        nextStep();
    };

    return (
        <div className="content-area">
            <div className="form-card">
                <h1 className="section-title">Audio y reconocimiento de voz</h1>
                <p className="section-subtitle">
                    Configura el sonido ambiente, volumen y el sistema de reconocimiento de voz (STT).
                </p>

                <form onSubmit={handleNext}>
                    <div className="form-group">
                        <label className="form-label">Volumen del agente</label>
                        <div className="slider-container">
                            <div className="slider-value">{volume}</div>
                            <input
                                type="range"
                                min="0.5" max="1.5" step="0.1"
                                value={volume}
                                onChange={(e) => updateField('volume', parseFloat(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="section-divider">
                        <h3>Sonido ambiente</h3>
                        <p>Añade un sonido de fondo para hacer las llamadas más naturales.</p>
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                            type="checkbox"
                            id="enableAmbientSound"
                            style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                            checked={enableAmbientSound}
                            onChange={(e) => updateField('enableAmbientSound', e.target.checked)}
                        />
                        <label htmlFor="enableAmbientSound" style={{ fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                            Activar sonido ambiente
                        </label>
                    </div>

                    {enableAmbientSound && (
                        <div style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '20px', marginTop: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">Tipo de sonido ambiente</label>
                                <select
                                    className="form-control"
                                    value={ambientSound}
                                    onChange={(e) => updateField('ambientSound', e.target.value)}
                                >
                                    <option value="none">Sin sonido (none)</option>
                                    <option value="office">Oficina (office)</option>
                                    <option value="cafe">Cafetería (cafe)</option>
                                    <option value="call_center">Centro de llamadas (call center)</option>
                                </select>
                            </div>

                            {ambientSound !== 'none' && (
                                <div className="form-group mb-0">
                                    <label className="form-label">Volumen del ambiente</label>
                                    <div className="slider-container">
                                        <div className="slider-value">{ambientSoundVolume}</div>
                                        <input
                                            type="range"
                                            min="0" max="1" step="0.1"
                                            value={ambientSoundVolume}
                                            onChange={(e) => updateField('ambientSoundVolume', parseFloat(e.target.value))}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="section-divider">
                        <h3>Reconocimiento de voz (STT)</h3>
                        <p>Configura cómo el sistema convierte la voz del usuario en texto.</p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Modo STT (Speech-to-Text)</label>
                        <select
                            className="form-control"
                            value={sttMode}
                            onChange={(e) => updateField('sttMode', e.target.value)}
                        >
                            <option value="fast">Optimizar para velocidad (fast)</option>
                            <option value="accurate">Optimizar para precisión (accurate) - Recomendado</option>
                        </select>
                        <div className="form-text" style={{ marginTop: '8px', fontSize: '13px', color: 'var(--gris-texto)' }}>
                            El modo &quot;accurate&quot; añade ~200ms de latencia pero mejora la captura de números y fechas.
                        </div>
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
                        <input
                            type="checkbox"
                            id="enableTranscriptionFormatting"
                            style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                            checked={enableTranscriptionFormatting}
                            onChange={(e) => updateField('enableTranscriptionFormatting', e.target.checked)}
                        />
                        <label htmlFor="enableTranscriptionFormatting" style={{ fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                            Activar formato de transcripción
                        </label>
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
