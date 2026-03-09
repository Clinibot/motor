"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';

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
            <div className="form-card">
                <WizardStepHeader
                    title="Cerebro del agente"
                    subtitle="Selecciona el modelo de lenguaje y ajusta la personalidad de tu agente."
                    tooltipContent={
                        <>
                            <strong>Modelos de Lenguaje.</strong> Diferentes motores de IA ofrecen distintos niveles de razonamiento y velocidad.
                        </>
                    }
                />

                <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
                    {/* SECCIÓN 1: CONFIGURACIÓN DEL MODELO */}
                    <div className="step-section">
                        <h3 className="section-title-icon">
                            <i className="bi bi-cpu" style={{ color: '#267ab0' }}></i>
                            Configuración del modelo
                        </h3>

                        <div className="row">
                            <div className="col-md-12">

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
                                        <option value="gemini-3.0-flash">Gemini 3.0 Flash</option>
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
                                                <strong>0.0-0.2:</strong> Consistente (Recomendado)<br />
                                                <strong>0.3-0.6:</strong> Balanceado<br />
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
                        </div>
                    </div>

                    <div className="section-divider"></div>

                    {/* SECCIÓN 2: MENSAJE Y COMPORTAMIENTO */}
                    <div className="step-section">
                        <h3 className="section-title-icon">
                            <i className="bi bi-chat-dots" style={{ color: '#267ab0' }}></i>
                            Mensaje y comportamiento
                        </h3>

                        <div className="row">
                            <div className="col-md-12">
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
                                            placeholder="Ej: Hola, soy Elio, tu asistente de voz creado con inteligencia artificial de Netelip y esta llamada está siendo grabada por motivos de calidad - ¿Con quién tengo el gusto de hablar?"
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
                        </div>

                        <div className="wizard-actions mt-5 pt-4">
                            <button type="button" className="btn btn-secondary-wizard" onClick={prevStep}>
                                Anterior
                            </button>
                            <button type="submit" className="btn btn-primary-wizard">
                                Siguiente paso
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
