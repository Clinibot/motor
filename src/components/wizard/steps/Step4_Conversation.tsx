"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step4_Conversation: React.FC = () => {
    const {
        language, responsiveness, interruptionSensitivity,
        enableBackchannel, backchannelFrequency, backchannelWords,
        updateField, prevStep, nextStep
    } = useWizardStore();

    const [newBackchannelWord, setNewBackchannelWord] = useState('');

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        nextStep();
    };

    const handleAddBackchannel = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = newBackchannelWord.trim();
            if (val && !backchannelWords.includes(val)) {
                updateField('backchannelWords', [...backchannelWords, val]);
                setNewBackchannelWord('');
            }
        }
    };

    const removeBackchannelWord = (wordToRemove: string) => {
        updateField('backchannelWords', backchannelWords.filter(w => w !== wordToRemove));
    };



    return (
        <div className="content-area">
            <div className="form-card">
                <h1 className="section-title">Configuración de conversación</h1>
                <p className="section-subtitle">
                    Define cómo tu agente interactuará en las llamadas.
                </p>

                <form onSubmit={handleNext}>
                    <div className="form-group">
                        <label className="form-label">
                            Idioma del agente <span className="required">*</span>
                        </label>
                        <select
                            className="form-control"
                            value={language}
                            onChange={(e) => updateField('language', e.target.value)}
                            required
                        >
                            <option value="es-ES">Español (España)</option>
                            <option value="es-MX">Español (México)</option>
                            <option value="es-AR">Español (Argentina)</option>
                            <option value="en-US">English (USA)</option>
                        </select>
                    </div>

                    <div className="section-divider">
                        <h3>Backchannel</h3>
                        <p>El agente emite pequeñas respuestas (&quot;Ajá&quot;, &quot;Entiendo&quot;) mientras el usuario habla.</p>
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                            type="checkbox"
                            id="enableBackchannel"
                            style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                            checked={enableBackchannel}
                            onChange={(e) => updateField('enableBackchannel', e.target.checked)}
                        />
                        <label htmlFor="enableBackchannel" style={{ fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                            Activar backchannel
                        </label>
                    </div>

                    {enableBackchannel && (
                        <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
                            <div className="form-group">
                                <label className="form-label">Frecuencia de backchannel</label>
                                <div className="slider-container">
                                    <div className="slider-value">{backchannelFrequency}</div>
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.1"
                                        value={backchannelFrequency}
                                        onChange={(e) => updateField('backchannelFrequency', parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Palabras de backchannel</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '8px', border: '1px solid var(--gris-borde)', borderRadius: '8px', minHeight: '44px' }}>
                                    {backchannelWords.map(word => (
                                        <span key={word} style={{ padding: '4px 8px', background: 'var(--netelip-azul)', color: 'white', borderRadius: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {word}
                                            <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => removeBackchannelWord(word)}>×</span>
                                        </span>
                                    ))}
                                    <input
                                        type="text"
                                        value={newBackchannelWord}
                                        onChange={(e) => setNewBackchannelWord(e.target.value)}
                                        onKeyDown={handleAddBackchannel}
                                        placeholder="Añadir (Enter)..."
                                        style={{ border: 'none', outline: 'none', flex: 1, minWidth: '120px' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="section-divider">
                        <h3>Sensibilidad y respuesta</h3>
                        <p>Controla qué tan fácil puede el usuario interrumpir al agente y qué tan rápido responde.</p>
                    </div>

                    <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div className="form-group">
                            <label className="form-label">Sensibilidad de interrupción</label>
                            <div className="slider-container">
                                <div className="slider-value">{interruptionSensitivity}</div>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.1"
                                    value={interruptionSensitivity}
                                    onChange={(e) => updateField('interruptionSensitivity', parseFloat(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Capacidad de respuesta</label>
                            <div className="slider-container">
                                <div className="slider-value">{responsiveness}</div>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.01"
                                    value={responsiveness}
                                    onChange={(e) => updateField('responsiveness', parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="wizard-actions">
                        <button type="button" className="btn btn-secondary" onClick={prevStep}>
                            <i className="bi bi-arrow-left"></i> Atrás
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!language}>
                            Siguiente paso <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
