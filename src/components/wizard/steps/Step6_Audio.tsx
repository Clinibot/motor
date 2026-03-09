"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';

export const Step6_Audio: React.FC = () => {
    const {
        volume, enableAmbientSound, ambientSound, ambientSoundVolume,
        sttMode,
        updateField, nextStep, prevStep
    } = useWizardStore();

    return (
        <div className="content-area">
            <div className="form-card">
                <WizardStepHeader
                    title="Audio y procesamiento"
                    subtitle="Configura la calidad del audio, cancelación de ruido y transcripción del agente."
                    tooltipContent={
                        <>
                            <strong>Procesamiento de Voz.</strong> Ajusta cómo el sistema convierte voz a texto y viceversa para una mayor precisión.
                        </>
                    }
                />

                <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
                    {/* SECCIÓN 1: VOLUMEN Y SONIDO AMBIENTE */}
                    <div className="step-section">
                        <h3 className="step-section-title">
                            <i className="bi bi-volume-up me-2"></i>
                            Volumen y sonido ambiente
                        </h3>

                        <div className="form-group">
                            <label className="form-label">Volumen del agente</label>
                            <div className="slider-wrapper">
                                <span className="slider-value">{(volume * 100).toFixed(0)}%</span>
                                <input
                                    type="range" className="custom-range" min="0" max="1" step="0.1"
                                    value={volume}
                                    onChange={(e) => updateField('volume', parseFloat(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="form-check custom-check">
                                <input
                                    className="form-check-input" type="checkbox" id="enableAmbient"
                                    checked={enableAmbientSound}
                                    onChange={(e) => updateField('enableAmbientSound', e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="enableAmbient">
                                    Habilitar sonido ambiente (Ruido de fondo)
                                </label>
                            </div>
                        </div>

                        {enableAmbientSound && (
                            <div className="row mt-3">
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label className="form-label">Tipo de ambiente</label>
                                        <select
                                            className="form-select premium-select"
                                            value={ambientSound}
                                            onChange={(e) => updateField('ambientSound', e.target.value)}
                                        >
                                            <option value="none">Ninguno</option>
                                            <option value="coffee-shop">Cafetería (Platos, ambiente)</option>
                                            <option value="convention-hall">Centro de convenciones (Murmullos altos)</option>
                                            <option value="summer-outdoor">Exterior de verano (Naturaleza, insectos)</option>
                                            <option value="mountain-outdoor">Montaña (Viento, naturaleza)</option>
                                            <option value="call-center">Call Center (Voces de fondo, teclados)</option>
                                            <option value="static-noise">Ruido estático (TV antigua, interferencia)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label className="form-label">Volumen ambiente</label>
                                        <div className="slider-wrapper">
                                            <span className="slider-value">{(ambientSoundVolume * 100).toFixed(0)}%</span>
                                            <input
                                                type="range" className="custom-range" min="0" max="0.5" step="0.05"
                                                value={ambientSoundVolume}
                                                onChange={(e) => updateField('ambientSoundVolume', parseFloat(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="section-divider"></div>

                    {/* SECCIÓN 2: SPEECH TO TEXT (STT) */}
                    <div className="step-section">
                        <h3 className="step-section-title">
                            <i className="bi bi-mic me-2"></i>
                            Procesamiento de voz (STT)
                        </h3>

                        <div className="form-group">
                            <label className="form-label">Modo de reconocimiento</label>
                            <div className="radio-cards">
                                <label className={`radio-card-option ${sttMode === 'accurate' ? 'active' : ''}`}>
                                    <input type="radio" value="accurate" checked={sttMode === 'accurate'} onChange={() => updateField('sttMode', 'accurate')} />
                                    <span>Precisión máxima</span>
                                </label>
                                <label className={`radio-card-option ${sttMode === 'fast' ? 'active' : ''}`}>
                                    <input type="radio" value="fast" checked={sttMode === 'fast'} onChange={() => updateField('sttMode', 'fast')} />
                                    <span>Velocidad extrema</span>
                                </label>
                            </div>
                            <div className="form-text mt-2">
                                {sttMode === 'accurate' ? 'Ideal para capturar nombres y datos complejos.' : 'Ideal para conversaciones muy fluidas con baja latencia.'}
                            </div>
                        </div>
                    </div>

                    <div className="wizard-actions mt-5">
                        <button type="button" className="btn btn-secondary" onClick={prevStep}>
                            <i className="bi bi-arrow-left"></i> Anterior
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
