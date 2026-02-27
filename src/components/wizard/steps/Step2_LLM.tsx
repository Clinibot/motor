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
                        <h3 className="step-section-title">
                            <i className="bi bi-gear-fill me-2" style={{ color: '#64748b' }}></i>
                            Configuración del Modelo
                        </h3>

                        <div className="form-group mb-4">
                            <label className="form-label fw-bold">Modelo LLM</label>
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
                        </div>

                        <div className="form-group mb-4">
                            <label className="form-label fw-bold">Temperatura</label>
                            <div className="d-flex align-items-center gap-3">
                                <span className="fw-bold" style={{ minWidth: '30px' }}>{temperature}</span>
                                <input
                                    type="range"
                                    className="form-range flex-grow-1"
                                    min="0" max="1" step="0.1"
                                    value={temperature}
                                    onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="form-text text-muted mt-2">Valores bajos son más deterministas, valores altos más creativos.</div>
                        </div>

                        <div className="form-group mb-0">
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="highPriority"
                                    checked={highPriority}
                                    onChange={(e) => updateField('highPriority', e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="highPriority">
                                    Activar modelo de alta prioridad (Reduce latencia, coste superior)
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="section-divider my-5"></div>

                    {/* SECCIÓN 2: MENSAJE Y COMPORTAMIENTO */}
                    <div className="step-section">
                        <h3 className="step-section-title">
                            <i className="bi bi-chat-left-text-fill me-2" style={{ color: '#64748b' }}></i>
                            Mensaje y Comportamiento
                        </h3>

                        <div className="form-group mb-4">
                            <label className="form-label fw-bold">¿Quién inicia la conversación?</label>
                            <div className="d-flex flex-column gap-2">
                                <div className="form-check">
                                    <input className="form-check-input" type="radio" name="whoFirst" id="whoAgent" value="agent" checked={whoFirst === 'agent'} onChange={() => updateField('whoFirst', 'agent')} />
                                    <label className="form-check-label" htmlFor="whoAgent">El Agente</label>
                                </div>
                                <div className="form-check">
                                    <input className="form-check-input" type="radio" name="whoFirst" id="whoUser" value="user" checked={whoFirst === 'user'} onChange={() => updateField('whoFirst', 'user')} />
                                    <label className="form-check-label" htmlFor="whoUser">El Usuario</label>
                                </div>
                            </div>
                        </div>

                        {whoFirst === 'agent' && (
                            <div className="form-group mb-4">
                                <label className="form-label fw-bold">Mensaje de inicio</label>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    placeholder="Ej: Hola, soy Sofia de DentaDent. ¿En qué puedo ayudarte hoy?"
                                    value={beginMessage}
                                    onChange={(e) => updateField('beginMessage', e.target.value)}
                                    required
                                />
                                <div className="info-box-light mt-3">
                                    <i className="bi bi-info-circle me-3"></i>
                                    <div>Este mensaje será lo primero que diga el agente al descolgar la llamada.</div>
                                </div>
                            </div>
                        )}

                        <div className="form-group mb-4">
                            <label className="form-label fw-bold">Personalidad del Agente</label>
                            <div className="d-flex flex-column gap-2 mt-2">
                                {['Profesional', 'Amigable / Cercano', 'Empático', 'Divertido / Humor', 'Directo / Conciso', 'Persuasivo'].map(trait => (
                                    <div key={trait}
                                        className={`personality-option ${personality.includes(trait) ? 'active' : ''}`}
                                        onClick={() => handlePersonalityToggle(trait)}>
                                        <div className="checkbox-mini me-2">
                                            {personality.includes(trait) && <i className="bi bi-check-lg"></i>}
                                        </div>
                                        <span>{trait}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="form-group mb-0">
                            <label className="form-label fw-bold">Tono de comunicación</label>
                            <div className="tone-pill-selector">
                                {['Formal', 'Semiformal', 'Casual'].map(t => (
                                    <div key={t}
                                        className={`tone-pill ${tone === t ? 'active' : ''}`}
                                        onClick={() => updateField('tone', t)}>
                                        {t}
                                    </div>
                                ))}
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
                .step-section {
                    margin-bottom: 24px;
                }
                .step-section-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: var(--oscuro);
                    margin-bottom: 24px;
                    display: flex;
                    align-items: center;
                }
                .section-divider {
                    height: 1px;
                    background: #e2e8f0;
                }
                .info-box-light {
                    background: #eff6ff;
                    border: 1px solid #bfdbfe;
                    border-radius: 8px;
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    color: var(--netelip-azul);
                    font-size: 13px;
                }
                
                .personality-option {
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: white;
                    font-size: 14px;
                }
                .personality-option:hover {
                    background: #f8fafc;
                }
                .personality-option.active {
                    background: var(--netelip-azul);
                    color: white;
                    border-color: var(--netelip-azul);
                }
                .checkbox-mini {
                    width: 16px;
                    height: 16px;
                    border: 1px solid #cbd5e1;
                    border-radius: 3px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                }
                .active .checkbox-mini {
                    border-color: white;
                }

                .tone-pill-selector {
                    display: flex;
                    background: #f1f5f9;
                    border-radius: 8px;
                    padding: 4px;
                    gap: 4px;
                }
                .tone-pill {
                    flex: 1;
                    padding: 8px;
                    text-align: center;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                .tone-pill.active {
                    background: white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    font-weight: 600;
                    color: var(--netelip-azul);
                }
            `}</style>
        </div>
    );
};
