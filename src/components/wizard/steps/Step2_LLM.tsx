"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step2_LLM: React.FC = () => {
    const { model, prompt, updateField, prevStep, nextStep } = useWizardStore();

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim() === '') return;
        nextStep();
    };

    return (
        <div className="content-area">
            <div className="form-card">
                <h1 className="section-title">Configuración LLM</h1>
                <p className="section-subtitle">
                    Configura el modelo de lenguaje y el prompt de tu agente.
                </p>

                <form onSubmit={handleNext}>
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--oscuro)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="bi bi-cpu"></i> Configuración del modelo
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--gris-texto)', marginBottom: '24px' }}>
                            Selecciona el modelo de IA.
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Modelo de IA <span className="required">*</span>
                            <span className="custom-tooltip">
                                <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                <span className="tooltip-content">
                                    <strong>GPT-4o:</strong> El modelo más avanzado.
                                </span>
                            </span>
                        </label>
                        <select
                            className="form-control"
                            value={model}
                            onChange={(e) => updateField('model', e.target.value)}
                            required
                        >
                            <option value="gpt-5.2">GPT 5.2 (Ultra High Performance)</option>
                            <option value="gpt-5.1">GPT 5.1 (High Performance)</option>
                            <option value="gpt-4.1">GPT 4.1 (Stable / Recommended)</option>
                            <option value="gpt-4.1-mini">GPT 4.1 Mini (Fastest)</option>
                            <option value="gemini-3.0-flash">Gemini 3.0 Flash (Agentic)</option>
                            <option value="claude-4.6-sonnet">Claude 4.6 Sonnet (Logic & Reasoning)</option>
                        </select>
                    </div>

                    <div className="section-divider">
                        <h3><i className="bi bi-code-square"></i> Prompt del agente</h3>
                        <p>El prompt es el cerebro de tu agente. Define su personalidad y reglas de comportamiento.</p>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">
                            Prompt general <span className="required">*</span>
                        </label>

                        <a href="#" className="btn-generator" onClick={(e) => e.preventDefault()}>
                            <i className="bi bi-magic"></i> Usar generador de prompts (Pronto)
                        </a>

                        <textarea
                            className="form-control"
                            rows={14}
                            required
                            placeholder="Eres un asistente útil..."
                            value={prompt}
                            onChange={(e) => updateField('prompt', e.target.value)}
                            style={{ minHeight: '250px', fontFamily: 'monospace' }}
                        />
                    </div>

                    <div className="wizard-actions">
                        <button type="button" className="btn btn-secondary" onClick={prevStep}>
                            <i className="bi bi-arrow-left"></i> Atrás
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!prompt.trim()}>
                            Siguiente paso <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
