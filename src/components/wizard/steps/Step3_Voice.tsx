"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step3_Voice: React.FC = () => {
    const { voiceId, voiceSpeed, voiceTemperature, updateField, prevStep, nextStep } = useWizardStore();

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        nextStep();
    };

    const voicesMocks = [
        { id: '11labs-Adrian', name: 'Adrian (ES)', tags: ['Masculino', 'España', 'Joven'] },
        { id: '11labs-Antoni', name: 'Antoni (ES)', tags: ['Masculino', 'Latam', 'Adulto'] },
        { id: '11labs-Bella', name: 'Bella (EN)', tags: ['Femenino', 'USA', 'Joven'] }
    ];

    return (
        <div className="content-area">
            <div className="form-card">
                <h1 className="section-title">Selección de voz del agente</h1>
                <p className="section-subtitle">
                    Elige la voz que mejor represente la personalidad de tu agente.
                </p>

                <form onSubmit={handleNext}>
                    <div className="voices-grid">
                        {voicesMocks.map((v) => (
                            <div
                                key={v.id}
                                className={`voice-card ${voiceId === v.id ? 'selected' : ''}`}
                                onClick={() => updateField('voiceId', v.id)}
                            >
                                <div className="voice-icon">
                                    <i className={v.tags[0] === 'Femenino' ? 'bi bi-person-hearts' : 'bi bi-person'}></i>
                                </div>
                                <div className="voice-name">{v.name}</div>
                                <div className="voice-tags">
                                    {v.tags.map(tag => <span key={tag} className="voice-tag">{tag}</span>)}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '32px' }}>
                        <div className="form-group">
                            <label className="form-label">Velocidad de voz</label>
                            <div className="slider-container">
                                <div className="slider-value">{voiceSpeed}x</div>
                                <input
                                    type="range"
                                    min="0.5" max="2.0" step="0.1"
                                    value={voiceSpeed}
                                    onChange={(e) => updateField('voiceSpeed', parseFloat(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Temperatura de voz</label>
                            <div className="slider-container">
                                <div className="slider-value">{voiceTemperature}</div>
                                <input
                                    type="range"
                                    min="0" max="2.0" step="0.1"
                                    value={voiceTemperature}
                                    onChange={(e) => updateField('voiceTemperature', parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="wizard-actions">
                        <button type="button" className="btn btn-secondary" onClick={prevStep}>
                            <i className="bi bi-arrow-left"></i> Atrás
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!voiceId}>
                            Siguiente paso <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
