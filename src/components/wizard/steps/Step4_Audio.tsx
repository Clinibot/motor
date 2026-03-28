"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';

export const Step4_Audio: React.FC = () => {
    const {
        volume, enableAmbientSound, ambientSound, ambientSoundVolume,
        updateField, nextStep, prevStep
    } = useWizardStore();

    return (
        <div className="content-area">
            <div className="form-card">
                <WizardStepHeader
                    title="Audio y procesamiento"
                    subtitle="Configura la calidad del audio, cancelación de ruido y transcripción del agente."
                />

                <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
                    <div className="step-section">
                        <h3 style={{ 
                            fontSize: '18px', 
                            fontWeight: 700, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px', 
                            marginBottom: '32px',
                            color: '#1a2428'
                        }}>
                            <i className="bi bi-volume-up" style={{ color: '#267ab0' }}></i>
                            Volumen y sonido ambiente
                        </h3>

                        {/* VOLUMEN DEL AGENTE */}
                        <div className="form-group mb-4">
                            <label className="form-label" style={{ fontWeight: 700, color: '#1a2428', marginBottom: '12px' }}>
                                Volumen del agente
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={volume}
                                        onChange={(e) => updateField('volume', parseFloat(e.target.value))}
                                        style={{
                                            width: '100%',
                                            height: '6px',
                                            borderRadius: '3px',
                                            background: `linear-gradient(to right, #267ab0 0%, #267ab0 ${volume * 100}%, #e2e8f0 ${volume * 100}%, #e2e8f0 100%)`,
                                            appearance: 'none',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                        className="premium-range"
                                    />
                                </div>
                                <div style={{
                                    minWidth: '60px',
                                    padding: '6px 12px',
                                    backgroundColor: '#267ab0',
                                    color: 'white',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    textAlign: 'center'
                                }}>
                                    {(volume * 100).toFixed(0)}%
                                </div>
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '12px' }}>
                                Ajusta la intensidad de la voz del agente durante las llamadas.
                            </div>
                        </div>

                        {/* HABILITAR SONIDO AMBIENTE */}
                        <div className="form-group mb-4">
                            <div className="form-check" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 0 }}>
                                <input
                                    type="checkbox"
                                    id="enableAmbient"
                                    checked={enableAmbientSound}
                                    onChange={(e) => updateField('enableAmbientSound', e.target.checked)}
                                    style={{ 
                                        width: '20px', 
                                        height: '20px', 
                                        borderRadius: '6px', 
                                        border: '1px solid #cbd5e1',
                                        cursor: 'pointer'
                                    }}
                                />
                                <label 
                                    htmlFor="enableAmbient" 
                                    style={{ 
                                        fontWeight: 700, 
                                        color: '#1a2428', 
                                        fontSize: '15px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Habilitar sonido ambiente (Ruido de fondo)
                                </label>
                            </div>
                        </div>

                        {/* TIPO DE AMBIENTE */}
                        <div className="form-group mb-4">
                            <label className="form-label" style={{ fontWeight: 700, color: '#1a2428', marginBottom: '8px' }}>
                                Tipo de ambiente
                            </label>
                            <select
                                className="form-select"
                                value={ambientSound}
                                onChange={(e) => updateField('ambientSound', e.target.value)}
                                style={{
                                    borderRadius: '12px',
                                    padding: '12px 16px',
                                    borderColor: '#e2e8f0',
                                    fontSize: '15px',
                                    color: '#1a2428',
                                    backgroundColor: '#f8fafc'
                                }}
                            >
                                <option value="none">Ninguno</option>
                                <option value="coffee-shop">Cafetería (Platos, ambiente)</option>
                                <option value="convention-hall">Centro de convenciones (Murmullos altos)</option>
                                <option value="summer-outdoor">Exterior de verano (Naturaleza, insectos)</option>
                                <option value="mountain-outdoor">Montaña (Viento, naturaleza)</option>
                                <option value="call-center">Call Center (Voces de fondo, teclados)</option>
                                <option value="static-noise">Ruido estático (TV antigua, interferencia)</option>
                            </select>
                        </div>

                        {/* VOLUMEN AMBIENTE */}
                        <div className="form-group mb-5">
                            <label className="form-label" style={{ fontWeight: 700, color: '#1a2428', marginBottom: '12px' }}>
                                Volumen ambiente
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={ambientSoundVolume}
                                        onChange={(e) => updateField('ambientSoundVolume', parseFloat(e.target.value))}
                                        style={{
                                            width: '100%',
                                            height: '6px',
                                            borderRadius: '3px',
                                            background: `linear-gradient(to right, #267ab0 0%, #267ab0 ${ambientSoundVolume * 100}%, #e2e8f0 ${ambientSoundVolume * 100}%, #e2e8f0 100%)`,
                                            appearance: 'none',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                        className="premium-range"
                                    />
                                </div>
                                <div style={{
                                    minWidth: '60px',
                                    padding: '6px 12px',
                                    backgroundColor: '#267ab0',
                                    color: 'white',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    textAlign: 'center'
                                }}>
                                    {(ambientSoundVolume * 100).toFixed(0)}%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ACCIONES */}
                    <div className="wizard-actions pt-4" style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        borderTop: '1px solid #edf2f7'
                    }}>
                        <button 
                            type="button" 
                            className="btn" 
                            onClick={prevStep}
                            style={{
                                border: '1px solid #e2e8f0',
                                padding: '10px 24px',
                                borderRadius: '8px',
                                background: '#fff',
                                color: '#64748b',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <i className="bi bi-arrow-left"></i> Anterior
                        </button>
                        <button 
                            type="submit" 
                            className="btn"
                            style={{
                                background: '#267ab0',
                                color: '#fff',
                                padding: '10px 24px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            Siguiente <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            </div>
            
            <style jsx>{`
                .premium-range::-webkit-slider-thumb {
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #fff;
                    border: 2px solid #267ab0;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: all 0.2s;
                }
                .premium-range::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                }
            `}</style>
        </div>
    );
};
