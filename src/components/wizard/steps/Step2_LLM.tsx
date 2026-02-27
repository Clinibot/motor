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
                <div className="mb-4">
                    <p className="text-muted small mb-4">Define las instrucciones, el modelo de lenguaje y el conocimiento de tu agente.</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
                    {/* SECCIÓN 1: CONFIGURACIÓN DEL MODELO */}
                    <div className="step-section">
                        <h3 className="section-title-icon">
                            <i className="bi bi-cpu"></i>
                            Configuración del modelo
                        </h3>
                        <p className="section-description">
                            Selecciona el modelo de IA y ajusta sus parámetros de funcionamiento.
                        </p>

                        <div className="form-group mb-4">
                            <label className="form-label">
                                Modelo de IA
                                <span className="required">*</span>
                                <div className="custom-tooltip ms-2">
                                    <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                    <div className="tooltip-content shadow">
                                        <strong>GPT-4.1:</strong> El modelo más avanzado de OpenAI. Ofrece la mejor comprensión contextual, razonamiento y generación de respuestas naturales.
                                    </div>
                                </div>
                            </label>
                            <select
                                className="form-select"
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
                            <div className="form-text mt-2">
                                <i className="bi bi-cpu me-1"></i>
                                Modelo seleccionado para máxima calidad en las respuestas
                            </div>
                        </div>

                        <div className="form-group mb-4">
                            <label className="form-label">
                                Temperature
                                <div className="custom-tooltip ms-2">
                                    <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                    <div className="tooltip-content shadow">
                                        <strong>Controla la creatividad:</strong><br />
                                        <strong>0.0-0.3:</strong> Consistente (Soporte)<br />
                                        <strong>0.4-0.6:</strong> Balanceado (Recomendado)<br />
                                        <strong>0.7-1.0:</strong> Creativo (Ventas)
                                    </div>
                                </div>
                            </label>
                            <div className="slider-wrapper">
                                <div className="slider-value-badge">{temperature}</div>
                                <input
                                    type="range"
                                    className="form-range"
                                    min="0" max="1" step="0.1"
                                    value={temperature}
                                    onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="form-text mt-2">
                                <i className="bi bi-thermometer-half me-1"></i>
                                Mayor valor = respuestas más creativas y variadas
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
                                    <div className="custom-tooltip ms-2">
                                        <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                        <div className="tooltip-content shadow">
                                            Reduce la latencia garantizando recursos dedicados. Recomendado para tráfico alto.
                                        </div>
                                    </div>
                                </label>
                            </div>
                            <div className="form-text ms-4">
                                <i className="bi bi-lightning-charge me-1"></i>
                                Garantiza respuestas más rápidas en momentos de alto tráfico
                            </div>
                        </div>
                    </div>

                    <div className="section-divider"></div>

                    {/* SECCIÓN 2: MENSAJE Y COMPORTAMIENTO */}
                    <div className="step-section">
                        <h3 className="section-title-icon">
                            <i className="bi bi-chat-dots"></i>
                            Mensaje y comportamiento
                        </h3>
                        <p className="section-description">
                            Define cómo tu agente iniciará las conversaciones y su estilo de comunicación.
                        </p>

                        <div className="form-group mb-4">
                            <label className="form-label">
                                ¿Quién habla primero?
                                <span className="required">*</span>
                            </label>
                            <div className="radio-card-group">
                                <div className={`radio-card ${whoFirst === 'agent' ? 'active' : ''}`} onClick={() => updateField('whoFirst', 'agent')}>
                                    <input type="radio" checked={whoFirst === 'agent'} readOnly />
                                    <span>Agente habla primero</span>
                                </div>
                                <div className={`radio-card ${whoFirst === 'user' ? 'active' : ''}`} onClick={() => updateField('whoFirst', 'user')}>
                                    <input type="radio" checked={whoFirst === 'user'} readOnly />
                                    <span>Usuario habla primero</span>
                                </div>
                            </div>
                        </div>

                        {whoFirst === 'agent' && (
                            <div className="form-group mb-4">
                                <label className="form-label">
                                    Mensaje de inicio
                                    <span className="required">*</span>
                                    <div className="custom-tooltip ms-2">
                                        <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                        <div className="tooltip-content shadow">
                                            La primera frase que dirá tu agente al contestar. Sé breve y presenta al agente.
                                        </div>
                                    </div>
                                </label>
                                <textarea
                                    className="form-control start-message-area"
                                    rows={3}
                                    placeholder="Ej: Hola, soy Elio, tu asistente de voz creado con inteligencia artificial de Netelip - ¿Con quién tengo el gusto de hablar?"
                                    value={beginMessage}
                                    onChange={(e) => updateField('beginMessage', e.target.value)}
                                    required
                                />

                                <div className="legal-warning-box mt-3">
                                    <i className="bi bi-exclamation-triangle-fill"></i>
                                    <div className="legal-warning-content">
                                        <strong>Obligatorio por ley española (RGPD y LOPD):</strong>
                                        <p>Debes informar que es un asistente de voz con IA y que la llamada está siendo grabada. Incluye siempre: <strong>&quot;Asistente de voz creado con inteligencia artificial&quot;</strong> y <strong>&quot;Esta llamada está siendo grabada&quot;</strong> (si aplica).</p>
                                    </div>
                                </div>

                                <div className="form-text mt-2">
                                    <i className="bi bi-chat-dots me-1"></i>
                                    Primera frase que dirá el agente al contestar
                                </div>
                            </div>
                        )}

                        <div className="form-group mb-4">
                            <label className="form-label">
                                Personalidad del agente
                                <div className="custom-tooltip ms-2">
                                    <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                    <div className="tooltip-content shadow">
                                        Selecciona los rasgos que definen el comportamiento de tu agente.
                                    </div>
                                </div>
                            </label>
                            <div className="traits-grid">
                                {['Profesional', 'Amigable', 'Empático', 'Proactivo'].map(trait => (
                                    <div key={trait}
                                        className={`trait-card ${personality.includes(trait) ? 'active' : ''}`}
                                        onClick={() => handlePersonalityToggle(trait)}>
                                        {trait}
                                    </div>
                                ))}
                            </div>
                            <div className="form-text mt-2">
                                <i className="bi bi-emoji-smile me-1"></i>
                                Selecciona al menos un rasgo de personalidad
                            </div>
                        </div>

                        <div className="form-group mb-0">
                            <label className="form-label">
                                Tono de comunicación
                                <span className="required">*</span>
                                <div className="custom-tooltip ms-2">
                                    <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                    <div className="tooltip-content shadow">
                                        Elige el nivel de formalidad en el lenguaje.
                                    </div>
                                </div>
                            </label>
                            <div className="tone-radio-group">
                                {['Formal', 'Semiformal', 'Casual'].map(t => (
                                    <div key={t}
                                        className={`tone-card ${tone === t ? 'active' : ''}`}
                                        onClick={() => updateField('tone', t)}>
                                        {t}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="section-divider"></div>

                    {/* SECCIÓN 3: PROMPT DEL AGENTE */}
                    <div className="step-section">
                        <h3 className="section-title-icon">
                            <i className="bi bi-code-square"></i>
                            Prompt del agente
                        </h3>
                        <p className="section-description">
                            El prompt es el cerebro de tu agente. Define su personalidad, conocimientos y reglas de comportamiento.
                        </p>

                        <div className="form-group mb-0">
                            <label className="form-label">
                                Prompt general
                                <span className="required">*</span>
                            </label>

                            <button type="button" className="btn btn-magic mb-3" onClick={() => window.open('https://generador-agentes.netelip.com', '_blank')}>
                                <i className="bi bi-magic"></i> Usar generador de prompts
                            </button>

                            <div className="info-box-blue mb-3">
                                <i className="bi bi-lightbulb-fill"></i>
                                <p><strong>Recomendación:</strong> El Generador de Prompts te permite crear un prompt profesional optimizado paso a paso. Una vez generado, puedes copiarlo aquí.</p>
                            </div>

                            <textarea
                                className="form-control prompt-textarea"
                                rows={15}
                                placeholder="Usa el Generador de Prompts para crear un prompt profesional optimizado, o escribe el tuyo propio aquí..."
                                value={useWizardStore.getState().prompt}
                                onChange={(e) => updateField('prompt', e.target.value)}
                                required
                            />
                            <div className="form-text mt-2">
                                <i className="bi bi-magic me-1"></i>
                                Este prompt define todo el comportamiento de tu agente
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
                .section-title-icon {
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--oscuro);
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .section-description {
                    font-size: 14px;
                    color: var(--gris-texto);
                    margin-bottom: 24px;
                }
                .section-divider {
                    margin: 48px 0 32px 0;
                    border-top: 2px solid var(--gris-borde);
                    padding-top: 32px;
                }
                .form-label {
                    font-weight: 600;
                    color: var(--oscuro);
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    font-size: 14px;
                }
                .required {
                    color: #ef4444;
                    margin-left: 4px;
                }
                .tooltip-icon {
                    color: var(--netelip-azul);
                    cursor: help;
                    font-size: 16px;
                }
                .custom-tooltip {
                    position: relative;
                    display: inline-block;
                }
                .tooltip-content {
                    visibility: hidden;
                    width: 280px;
                    background: var(--oscuro);
                    color: white;
                    border-radius: 8px;
                    padding: 12px 16px;
                    position: absolute;
                    z-index: 2000;
                    bottom: 125%;
                    left: 50%;
                    transform: translateX(-50%);
                    opacity: 0;
                    transition: all 0.3s;
                    font-size: 12px;
                    line-height: 1.5;
                }
                .tooltip-content::after {
                    content: "";
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    margin-left: -6px;
                    border-width: 6px;
                    border-style: solid;
                    border-color: var(--oscuro) transparent transparent transparent;
                }
                .custom-tooltip:hover .tooltip-content {
                    visibility: visible;
                    opacity: 1;
                }

                .slider-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .slider-value-badge {
                    background: var(--netelip-azul);
                    color: white;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-weight: 700;
                    font-size: 14px;
                    min-width: 38px;
                    text-align: center;
                }

                .radio-card-group, .tone-radio-group {
                    display: flex;
                    gap: 12px;
                }
                .radio-card, .tone-card {
                    flex: 1;
                    border: 2px solid var(--gris-borde);
                    border-radius: 8px;
                    padding: 14px;
                    text-align: center;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.2s;
                    background: white;
                }
                .radio-card:hover, .tone-card:hover { border-color: var(--netelip-azul); background: #eff6ff; }
                .radio-card.active, .tone-card.active { border-color: var(--netelip-azul); background: #eff6ff; color: var(--netelip-azul); }
                .radio-card input { display: none; }

                .start-message-area {
                    min-height: 100px;
                    border-radius: 8px;
                    padding: 12px;
                    font-size: 14px;
                }

                .legal-warning-box {
                    background: #fffbeb;
                    border: 1px solid #fef3c7;
                    border-radius: 10px;
                    padding: 16px 20px;
                    display: flex;
                    gap: 16px;
                    align-items: flex-start;
                }
                .legal-warning-box i { color: #f59e0b; font-size: 20px; }
                .legal-warning-content strong { color: #92400e; font-size: 13px; display: block; margin-bottom: 4px; }
                .legal-warning-content p { margin: 0; font-size: 12px; color: #78350f; line-height: 1.5; }

                .traits-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 12px;
                }
                .trait-card {
                    border: 2px solid var(--gris-borde);
                    border-radius: 8px;
                    padding: 12px;
                    text-align: center;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.2s;
                    background: white;
                }
                .trait-card:hover { border-color: var(--netelip-azul); background: #eff6ff; }
                .trait-card.active { border-color: var(--netelip-azul); background: #eff6ff; color: var(--netelip-azul); }

                .btn-magic {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border: none;
                    font-weight: 700;
                    transition: all 0.3s;
                }
                .btn-magic:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); color: white; }

                .info-box-blue {
                    background: #eff6ff;
                    border: 1px solid #bfdbfe;
                    border-radius: 8px;
                    padding: 14px;
                    display: flex;
                    gap: 12px;
                    font-size: 13px;
                }
                .info-box-blue i { color: var(--netelip-azul); font-size: 18px; }
                .info-box-blue p { margin: 0; color: var(--oscuro); }

                .prompt-textarea {
                    font-family: 'Monaco', 'Courier New', monospace;
                    font-size: 13px;
                    line-height: 1.6;
                    border-radius: 12px;
                    padding: 20px;
                }
                .fw-600 { font-weight: 600; }
            `}</style>
        </div>
    );
};
