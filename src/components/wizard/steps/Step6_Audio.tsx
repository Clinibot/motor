"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step6_Audio: React.FC = () => {
    const {
        volume, enableAmbientSound, ambientSound, ambientSoundVolume,
        sttMode, enableTranscriptionFormatting,
        updateField, nextStep, prevStep
    } = useWizardStore();

    return (
        <div className="content-area">
            <div className="form-card">
                <h1 className="section-title">Audio y STT</h1>
                <p className="section-subtitle">
                    Configura la calidad del sonido, el ruido de fondo y cómo el agente debe procesar el texto.
                </p>

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
                                            className="form-select"
                                            value={ambientSound}
                                            onChange={(e) => updateField('ambientSound', e.target.value)}
                                        >
                                            <option value="none">Ninguno</option>
                                            <option value="office">Oficina (Teclado, murmullos)</option>
                                            <option value="coffee-shop">Cafetería (Platos, ambiente)</option>
                                            <option value="street">Calle (Tráfico suave)</option>
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

                        <div className="form-group mb-0">
                            <div className="form-check custom-check">
                                <input
                                    className="form-check-input" type="checkbox" id="formatTranscription"
                                    checked={enableTranscriptionFormatting}
                                    onChange={(e) => updateField('enableTranscriptionFormatting', e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="formatTranscription">
                                    Formatear transcripción (Puntuación automática)
                                </label>
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

            <style jsx>{`
                .step-section { margin-bottom: 24px; }
                .step-section-title { font-size: 18px; font-weight: 700; color: var(--oscuro); margin-bottom: 8px; display: flex; align-items: center; }
                .section-divider { height: 2px; background: var(--gris-borde); margin: 40px 0; }
                .slider-wrapper { display: flex; align-items: center; gap: 15px; }
                .slider-value { background: var(--netelip-azul); color: white; padding: 4px 12px; border-radius: 6px; font-weight: 700; min-width: 55px; text-align: center; font-size: 13px; }
                .custom-range { flex-grow: 1; }
                .radio-cards { display: flex; gap: 12px; }
                .radio-card-option { flex: 1; border: 2px solid var(--gris-borde); border-radius: 8px; padding: 12px; text-align: center; cursor: pointer; transition: all 0.2s; font-weight: 600; font-size: 14px; }
                .radio-card-option.active { border-color: var(--netelip-azul); background: #f0f9ff; color: var(--netelip-azul); }
                .radio-card-option input { display: none; }
                .custom-check { display: flex; align-items: center; gap: 8px; }
                .custom-check .form-check-input { width: 1.25em; height: 1.25em; margin-top: 0; cursor: pointer; }
                .custom-check .form-check-label { cursor: pointer; font-weight: 500; font-size: 14px; }
            `}</style>
        </div>
    );
};
