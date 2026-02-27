"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step4_Conversation: React.FC = () => {
    const {
        language, responsiveness, interruptionSensitivity,
        enableBackchannel, backchannelFrequency, backchannelWords,
        enableAmbientSound, ambientSound, ambientSoundVolume,
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
                            Ajusta el comportamiento dinámico del agente: cómo maneja el ruido, las interrupciones y qué sonidos emite mientras escucha.
                        </div>
                    </div>
                </h1>
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

                    {/* SONIDO AMBIENTE - RESCATADO DEL PASO 6 */}
                    <div className="section-divider">
                        <h3>
                            Sonido ambiente
                            <div className="custom-tooltip">
                                <i className="bi bi-info-circle tooltip-icon" style={{ fontSize: '16px' }}></i>
                                <div className="tooltip-content">
                                    Simula un entorno real (oficina, calle) para que la IA no suene &quot;demasiado limpia&quot; y parezca una llamada humana real.
                                </div>
                            </div>
                        </h3>
                        <p>Añade un sonido de fondo para hacer las llamadas más naturales.</p>
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                            type="checkbox"
                            id="enableAmbientSound"
                            style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                            checked={enableAmbientSound}
                            onChange={(e) => updateField('enableAmbientSound', e.target.checked)}
                        />
                        <label htmlFor="enableAmbientSound" style={{ fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                            Activar sonido ambiente
                        </label>
                    </div>

                    {enableAmbientSound && (
                        <div style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: '10px', padding: '20px', marginTop: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">Tipo de sonido ambiente</label>
                                <select
                                    className="form-control"
                                    value={ambientSound}
                                    onChange={(e) => updateField('ambientSound', e.target.value)}
                                >
                                    <option value="none">Sin sonido (none)</option>
                                    <option value="office">Oficina (office)</option>
                                    <option value="cafe">Cafetería (cafe)</option>
                                    <option value="call_center">Centro de llamadas (call center)</option>
                                </select>
                            </div>

                            {ambientSound !== 'none' && (
                                <div className="form-group mb-0">
                                    <label className="form-label">Volumen del ambiente</label>
                                    <div className="slider-container">
                                        <div className="slider-value">{ambientSoundVolume.toFixed(1)}</div>
                                        <input
                                            type="range"
                                            min="0" max="1" step="0.1"
                                            value={ambientSoundVolume}
                                            onChange={(e) => updateField('ambientSoundVolume', parseFloat(e.target.value))}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="section-divider">
                        <h3>
                            Backchannel
                            <div className="custom-tooltip">
                                <i className="bi bi-info-circle tooltip-icon" style={{ fontSize: '16px' }}></i>
                                <div className="tooltip-content">
                                    Son sonidos de escucha activa (Ajá, Oh, Entiendo). Ayudan a que el usuario sepa que el agente le está prestando atención.
                                </div>
                            </div>
                        </h3>
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
                        <h3>
                            Sensibilidad y respuesta
                            <div className="custom-tooltip">
                                <i className="bi bi-info-circle tooltip-icon" style={{ fontSize: '16px' }}></i>
                                <div className="tooltip-content">
                                    Configura qué tan rápido responde el agente tras un silencio y qué tan fácil es para el usuario tomar la palabra.
                                </div>
                            </div>
                        </h3>
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
