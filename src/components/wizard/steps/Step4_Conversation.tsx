"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step4_Conversation: React.FC = () => {
    const {
        language, interruptionSensitivity,
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
                <h1 className="section-title">
                    Configuración de conversación
                    <div className="custom-tooltip">
                        <i className="bi bi-info-circle tooltip-icon"></i>
                        <div className="tooltip-content">
                            Ajusta el comportamiento dinámico del agente: cómo maneja las interrupciones y qué sonidos emite mientras escucha.
                        </div>
                    </div>
                </h1>
                <p className="section-subtitle">
                    Define las reglas de interacción y fluidez de la llamada.
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
                        <h3>
                            Backchannel
                            <div className="custom-tooltip">
                                <i className="bi bi-info-circle tooltip-icon" style={{ fontSize: '16px' }}></i>
                                <div className="tooltip-content">
                                    Son sonidos de escucha activa (Ajá, Oh, Entiendo). Ayudan a que el usuario sepa que le están prestando atención.
                                </div>
                            </div>
                        </h3>
                        <p>El agente emite pequeñas respuestas (&quot;Ajá&quot;, &quot;Entiendo&quot;) mientras el usuario habla.</p>
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="form-check form-switch">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="enableBackchannel"
                                checked={enableBackchannel}
                                onChange={(e) => updateField('enableBackchannel', e.target.checked)}
                            />
                            <label className="form-check-label ms-2" htmlFor="enableBackchannel" style={{ fontWeight: 600, cursor: 'pointer' }}>
                                Activar backchannel
                            </label>
                        </div>
                    </div>

                    {enableBackchannel && (
                        <div className="row mt-4">
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label className="form-label">Frecuencia de backchannel</label>
                                    <div className="slider-wrapper">
                                        <span className="slider-value">{backchannelFrequency}</span>
                                        <input
                                            type="range"
                                            className="custom-range"
                                            min="0" max="1" step="0.1"
                                            value={backchannelFrequency}
                                            onChange={(e) => updateField('backchannelFrequency', parseFloat(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label className="form-label">Palabras de backchannel</label>
                                    <div className="tag-container p-2 border rounded bg-light" style={{ minHeight: '44px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {backchannelWords.map(word => (
                                            <span key={word} className="badge bg-primary d-flex align-items-center gap-2">
                                                {word}
                                                <i className="bi bi-x-circle" style={{ cursor: 'pointer' }} onClick={() => removeBackchannelWord(word)}></i>
                                            </span>
                                        ))}
                                        <input
                                            type="text"
                                            className="border-0 bg-transparent"
                                            value={newBackchannelWord}
                                            onChange={(e) => setNewBackchannelWord(e.target.value)}
                                            onKeyDown={handleAddBackchannel}
                                            placeholder="Añadir..."
                                            style={{ outline: 'none', fontSize: '14px', flex: 1 }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="section-divider">
                        <h3>
                            Sensibilidad y respuesta
                            <div className="custom-tooltip">
                                <i className="bi bi-info-circle tooltip-icon" style={{ fontSize: '16px' }}></i>
                                <div className="tooltip-content">
                                    Configura qué tan rápido responde el agente tras un silencio y qué tan fácil es para el usuario tomar la palabra.
                                </div>
                            </div>
                        </h3>
                        <p>Controla la fluidez de la interacción hombre-máquina.</p>
                    </div>

                    <div className="row g-4">
                        <div className="col-md-12">
                            <div className="form-group">
                                <label className="form-label">Sensibilidad de interrupción</label>
                                <div className="slider-wrapper">
                                    <span className="slider-value">{interruptionSensitivity}</span>
                                    <input
                                        type="range"
                                        className="custom-range"
                                        min="0" max="1" step="0.1"
                                        value={interruptionSensitivity}
                                        onChange={(e) => updateField('interruptionSensitivity', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="form-text">0 = No interrumpe, 1 = Sensibilidad alta</div>
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
