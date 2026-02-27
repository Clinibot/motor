"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step2_LLM: React.FC = () => {
    const {
        temperature,
        highPriority,
        whoFirst,
        beginMessage,
        personality,
        tone,
        model,
        updateField,
        nextStep,
        prevStep
    } = useWizardStore();

    const handlePersonalityToggle = (trait: string) => {
        const newPersonality = [...personality];
        const index = newPersonality.indexOf(trait);
        if (index > -1) {
            newPersonality.splice(index, 1);
        } else {
            newPersonality.push(trait);
        }
        updateField('personality', newPersonality);
    };

    return (
        <div className="content-area">
            <div className="form-card shadow-sm">
                <div className="step-header-compact mb-4">
                    <span className="step-count">Paso 2 de 8 - Configuración LLM</span>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
                    {/* SECCIÓN 1: CONFIGURACIÓN DEL MODELO */}
                    <div className="step-section">
                        <h3 className="section-title-icon">
                            <i className="bi bi-cpu" style={{ color: '#267ab0' }}></i>
                            Configuración del modelo
                        </h3>
                        <p className="section-description">
                            Selecciona el modelo de IA y ajusta sus parámetros de funcionamiento.
                        </p>

                        <div className="form-group mb-4">
                            <label className="form-label">
                                Modelo de IA <span className="required">*</span>
                                <div className="custom-tooltip ms-1">
                                    <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                    <div className="tooltip-content shadow">
                                        <strong>GPT-4.1:</strong> El modelo más avanzado de OpenAI. Ofrece la mejor comprensión contextual, razonamiento y generación de respuestas naturales.
                                    </div>
                                </div>
                            </label>
                            <select
                                className="form-select premium-select"
                                value={model}
                                onChange={(e) => updateField('model', e.target.value)}
                            >
                                <option value="gpt-4.1">GPT-4.1 (Recomendado)</option>
                                <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                                <option value="gpt-5">GPT-5.0</option>
                                <option value="gpt-5.1">GPT-5.1</option>
                                <option value="gpt-5.2">GPT-5.2</option>
                                <option value="claude-4.5-sonnet">Claude 3.5 Sonnet</option>
                                <option value="gemini-3.0-flash">Gemini 1.5 Flash</option>
                            </select>
                            <div className="form-text mt-2 d-flex align-items-center">
                                <i className="bi bi-gear me-2 icon-soft"></i>
                                <span>Modelo seleccionado por defecto para máxima calidad</span>
                            </div>
                        </div>

                        <div className="form-group mb-4">
                            <label className="form-label">
                                Temperature
                                <div className="custom-tooltip ms-1">
                                    <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                    <div className="tooltip-content shadow">
                                        <strong>Controla la creatividad:</strong><br />
                                        <strong>0.0-0.3:</strong> Consistente (Soporte)<br />
                                        <strong>0.4-0.6:</strong> Balanceado (Recomendado)<br />
                                        <strong>0.7-1.0:</strong> Creativo (Ventas)
                                    </div>
                                </div>
                            </label>
                            <div className="slider-wrapper-premium">
                                <div className="slider-value-badge-v2">{temperature}</div>
                                <input
                                    type="range"
                                    className="form-range custom-range"
                                    min="0" max="1" step="0.1"
                                    value={temperature}
                                    onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="form-text mt-2 d-flex align-items-center">
                                <i className="bi bi-thermometer-half me-2 icon-soft"></i>
                                <span>Mayor valor = respuestas más creativas y variadas</span>
                            </div>
                        </div>

                        <div className="form-group mb-0">
                            <div className="form-check custom-check">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="highPriority"
                                    checked={highPriority}
                                    onChange={(e) => updateField('highPriority', e.target.checked)}
                                />
                                <label className="form-check-label fw-600" htmlFor="highPriority">
                                    Activar modelo de alta prioridad
                                    <div className="custom-tooltip ms-1">
                                        <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                        <div className="tooltip-content shadow">
                                            Reduce la latencia garantizando recursos dedicados. Recomendado para tráfico alto.
                                        </div>
                                    </div>
                                </label>
                            </div>
                            <div className="form-text ms-4 d-flex align-items-center">
                                <i className="bi bi-lightning-charge me-2 icon-soft"></i>
                                <span>Garantiza respuestas más rápidas en momentos de alto tráfico</span>
                            </div>
                        </div>
                    </div>

                    <div className="section-divider"></div>

                    {/* SECCIÓN 2: MENSAJE Y COMPORTAMIENTO */}
                    <div className="step-section">
                        <h3 className="section-title-icon">
                            <i className="bi bi-chat-dots" style={{ color: '#267ab0' }}></i>
                            Mensaje y comportamiento
                        </h3>
                        <p className="section-description">
                            Define cómo tu agente iniciará las conversaciones y su estilo de comunicación.
                        </p>

                        <div className="form-group mb-4">
                            <label className="form-label">
                                ¿Quién habla primero? <span className="required">*</span>
                                <div className="custom-tooltip ms-1">
                                    <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                    <div className="tooltip-content shadow">
                                        Indica si el agente debe iniciar el saludo o esperar a que el usuario hable.
                                    </div>
                                </div>
                            </label>
                            <div className="radio-pill-group">
                                <button type="button"
                                    className={`pill-btn ${whoFirst === 'agent' ? 'active' : ''}`}
                                    onClick={() => updateField('whoFirst', 'agent')}>
                                    Agente habla primero
                                </button>
                                <button type="button"
                                    className={`pill-btn ${whoFirst === 'user' ? 'active' : ''}`}
                                    onClick={() => updateField('whoFirst', 'user')}>
                                    Usuario habla primero
                                </button>
                            </div>
                        </div>

                        {whoFirst === 'agent' && (
                            <div className="form-group mb-4">
                                <label className="form-label">
                                    Mensaje de inicio <span className="required">*</span>
                                    <div className="custom-tooltip ms-1">
                                        <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                        <div className="tooltip-content shadow">
                                            La primera frase que dirá tu agente al contestar.
                                        </div>
                                    </div>
                                </label>
                                <textarea
                                    className="form-control start-message-area"
                                    rows={4}
                                    placeholder="Ej: Hola, soy Elio, tu asistente de voz creado con inteligencia artificial de Netelip - ¿Con quién tengo el gusto de hablar?"
                                    value={beginMessage}
                                    onChange={(e) => updateField('beginMessage', e.target.value)}
                                    required
                                />

                                <div className="legal-warning-banner mt-3">
                                    <i className="bi bi-exclamation-triangle-fill"></i>
                                    <div className="banner-content">
                                        <strong>Obligatorio por ley española (RGPD y LOPD):</strong>
                                        <p>Debes informar que es un asistente de voz con IA y que la llamada está siendo grabada. Incluye siempre: <strong>&quot;Asistente de voz creado con inteligencia artificial&quot;</strong> y <strong>&quot;Esta llamada está siendo grabada&quot;</strong> (si aplica).</p>
                                    </div>
                                </div>

                                <div className="form-text mt-2 d-flex align-items-center">
                                    <i className="bi bi-chat-left-text me-2 icon-soft"></i>
                                    <span>Primera frase que dirá el agente al contestar</span>
                                </div>
                            </div>
                        )}

                        <div className="form-group mb-4">
                            <label className="form-label">
                                Personalidad del agente
                                <div className="custom-tooltip ms-1">
                                    <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                    <div className="tooltip-content shadow">
                                        Rasgos que definen el comportamiento de tu agente.
                                    </div>
                                </div>
                            </label>
                            <div className="radio-pill-group-grid">
                                {['Profesional', 'Amigable', 'Empático', 'Proactivo'].map(trait => (
                                    <button key={trait} type="button"
                                        className={`pill-btn-small ${personality.includes(trait) ? 'active' : ''}`}
                                        onClick={() => handlePersonalityToggle(trait)}>
                                        {trait}
                                    </button>
                                ))}
                            </div>
                            <div className="form-text mt-2 d-flex align-items-center">
                                <i className="bi bi-emoji-smile me-2 icon-soft"></i>
                                <span>Selecciona al menos un rasgo de personalidad</span>
                            </div>
                        </div>

                        <div className="form-group mb-0">
                            <label className="form-label">
                                Tono de comunicación <span className="required">*</span>
                                <div className="custom-tooltip ms-1">
                                    <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                    <div className="tooltip-content shadow">
                                        Nivel de formalidad en el lenguaje.
                                    </div>
                                </div>
                            </label>
                            <div className="radio-pill-group">
                                {['Formal', 'Semiformal', 'Casual'].map(t => (
                                    <button key={t} type="button"
                                        className={`pill-btn ${tone === t ? 'active' : ''}`}
                                        onClick={() => updateField('tone', t)}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="wizard-actions mt-5 pt-4">
                        <button type="button" className="btn btn-secondary-wizard" onClick={prevStep}>
                            Anterior
                        </button>
                        <button type="submit" className="btn btn-primary-wizard">
                            Siguiente paso
                        </button>
                    </div>
                </form>
            </div>

            <style jsx>{`
                .content-area {
                    max-width: 800px;
                    margin: 0 auto;
                }
                .form-card {
                    background: white;
                    border-radius: 12px;
                    padding: 32px;
                    border: 1px solid #e2e8f0;
                }
                .step-header-compact {
                    border-bottom: 1px solid #f1f5f9;
                    padding-bottom: 16px;
                }
                .step-count {
                    font-size: 14px;
                    color: #64748b;
                    font-weight: 500;
                }
                .section-title-icon {
                    font-size: 18px;
                    font-weight: 700;
                    color: #1e293b;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .section-description {
                    font-size: 14px;
                    color: #64748b;
                    margin-bottom: 24px;
                }
                .section-divider {
                    margin: 40px 0;
                    border-top: 1px solid #f1f5f9;
                }
                .form-label {
                    font-weight: 600;
                    color: #1e293b;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    font-size: 14px;
                }
                .required {
                    color: #ef4444;
                    margin-left: 2px;
                }
                .tooltip-icon {
                    color: #267ab0;
                    cursor: help;
                    font-size: 15px;
                }
                .custom-tooltip {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .tooltip-content {
                    visibility: hidden;
                    width: 260px;
                    background: #1e293b;
                    color: white;
                    border-radius: 8px;
                    padding: 12px;
                    position: absolute;
                    z-index: 2000;
                    bottom: 125%;
                    left: 50%;
                    transform: translateX(-50%);
                    opacity: 0;
                    transition: all 0.2s;
                    font-size: 12px;
                }
                .custom-tooltip:hover .tooltip-content {
                    visibility: visible;
                    opacity: 1;
                }
                
                .form-select.premium-select {
                    background-color: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 12px 16px;
                    font-size: 14px;
                    font-weight: 500;
                    color: #1e293b;
                    appearance: none;
                }
                
                .slider-wrapper-premium {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .slider-value-badge-v2 {
                    background: #267ab0;
                    color: white;
                    padding: 4px 12px;
                    border-radius: 6px;
                    font-weight: 700;
                    font-size: 13px;
                    width: fit-content;
                }
                .custom-range {
                    height: 6px;
                    background: #f1f5f9;
                    border-radius: 5px;
                    -webkit-appearance: none;
                }
                .custom-range::-webkit-slider-thumb {
                    width: 18px;
                    height: 18px;
                    background: #267ab0;
                    border: 3px solid white;
                    border-radius: 50%;
                    -webkit-appearance: none;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .radio-pill-group {
                    display: flex;
                    gap: 12px;
                }
                .radio-pill-group-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                }
                .pill-btn, .pill-btn-small {
                    flex: 1;
                    padding: 12px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    background: white;
                    color: #64748b;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                .pill-btn.active, .pill-btn-small.active {
                    background: #eff6ff;
                    border-color: #267ab0;
                    color: #267ab0;
                }
                .pill-btn:hover, .pill-btn-small:hover {
                    border-color: #267ab0;
                }

                .start-message-area {
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 16px;
                    font-size: 14px;
                    color: #1e293b;
                }

                .legal-warning-banner {
                    background: #fffbeb;
                    border: 1px solid #fef3c7;
                    border-radius: 8px;
                    padding: 16px;
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                }
                .legal-warning-banner i { color: #f59e0b; font-size: 18px; }
                .banner-content strong { color: #92400e; font-size: 13px; display: block; margin-bottom: 4px; }
                .banner-content p { margin: 0; font-size: 12px; color: #78350f; line-height: 1.5; }

                .form-text {
                    font-size: 12px;
                    color: #94a3b8;
                }
                .icon-soft {
                    color: #cbd5e1;
                    font-size: 14px;
                }
                .fw-600 { font-weight: 600; }
                
                .btn-secondary-wizard {
                    padding: 12px 24px;
                    border-radius: 8px;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    color: #64748b;
                    font-weight: 600;
                }
                .btn-primary-wizard {
                    padding: 12px 24px;
                    border-radius: 8px;
                    background: #267ab0;
                    border: none;
                    color: white;
                    font-weight: 600;
                    margin-left: 12px;
                }
            `}</style>
        </div>
    );
};
