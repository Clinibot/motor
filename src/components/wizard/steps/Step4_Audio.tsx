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
        <div className="content-area" style={{ padding: '60px' }}>
            <WizardStepHeader
                title="Audio y procesamiento"
                subtitle="Configura la calidad del audio y el entorno sonoro de tu agente."
                showArrows={false}
            />

            <div style={{ maxWidth: '1000px', marginTop: '40px' }}>
                
                <div style={{ 
                    background: '#eff6ff', 
                    borderLeft: '4px solid var(--azul)', 
                    borderRadius: '12px', 
                    padding: '20px 24px', 
                    display: 'flex', 
                    gap: '16px', 
                    alignItems: 'center',
                    marginBottom: '40px',
                    boxShadow: '0 4px 15px rgba(37, 99, 235, 0.05)'
                }}>
                    <i className="bi bi-info-circle-fill" style={{ color: 'var(--azul)', fontSize: '24px' }}></i>
                    <p style={{ margin: 0, color: '#1e40af', fontSize: '15px', fontWeight: 600, lineHeight: '1.5' }}>
                        <strong>Recomendación:</strong> Un volumen bajo (5-10%) para el sonido ambiente ayuda a que el agente suene más natural sin interferir con la voz.
                    </p>
                </div>

                <div className="card-premium" style={{ padding: '40px', marginBottom: '40px' }}>
                    <div style={{ display: 'grid', gap: '48px' }}>
                        
                        {/* VOLUMEN DEL AGENTE */}
                        <div style={{ maxWidth: '600px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <label className="lbl" style={{ margin: 0, fontWeight: 800, color: 'var(--slate-700)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Volumen de voz del agente
                                </label>
                                <div style={{ 
                                    background: 'var(--azul)', 
                                    color: 'white', 
                                    padding: '6px 14px', 
                                    borderRadius: '30px', 
                                    fontSize: '13px', 
                                    fontWeight: 900,
                                    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
                                }}>
                                    {(volume * 100).toFixed(0)}%
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <i className="bi bi-mic-fill" style={{ color: 'var(--slate-300)', fontSize: '20px' }}></i>
                                <div style={{ flex: 1, position: 'relative', height: '8px', background: 'var(--slate-100)', borderRadius: '10px' }}>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={volume}
                                        onChange={(e) => updateField('volume', parseFloat(e.target.value))}
                                        className="premium-range"
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            background: `linear-gradient(to right, var(--azul) 0%, var(--azul) ${volume * 100}%, transparent ${volume * 100}%, transparent 100%)`,
                                            borderRadius: '10px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                </div>
                                <i className="bi bi-volume-up-fill" style={{ color: 'var(--azul)', fontSize: '20px' }}></i>
                            </div>
                        </div>

                        <div style={{ height: '1px', background: 'var(--slate-50)' }}></div>

                        {/* SONIDO AMBIENTE */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)' }}>Efectos de Entorno</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--slate-500)', fontWeight: 500 }}>Añade una capa de realismo a la interacción.</p>
                                </div>
                                <label className="premium-toggle">
                                    <input
                                        type="checkbox"
                                        checked={enableAmbientSound}
                                        onChange={(e) => updateField('enableAmbientSound', e.target.checked)}
                                    />
                                    <span className="premium-toggle-slider"></span>
                                </label>
                            </div>

                            {enableAmbientSound && (
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '1fr 1fr', 
                                    gap: '32px',
                                    animation: 'slideDown 0.3s ease-out'
                                }}>
                                    <div>
                                        <label className="lbl" style={{ marginBottom: '12px', display: 'block', fontWeight: 800, fontSize: '13px', color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                                            Tipo de ambiente
                                        </label>
                                        <select
                                            className="inp"
                                            value={ambientSound}
                                            onChange={(e) => updateField('ambientSound', e.target.value)}
                                            style={{ 
                                                padding: '16px 20px', 
                                                borderRadius: '16px', 
                                                border: '1px solid var(--slate-100)',
                                                fontWeight: 600,
                                                fontSize: '15px'
                                            }}
                                        >
                                            <option value="none">Sin sonido ambiente</option>
                                            <option value="call-center">🎧 Call Center (Recomendado)</option>
                                            <option value="coffee-shop">☕ Cafetería</option>
                                            <option value="convention-hall">🏢 Oficina / Pasillo de convenciones</option>
                                            <option value="summer-outdoor">🌲 Exterior suave</option>
                                            <option value="static-noise">📻 Ruido blanco ligero</option>
                                        </select>
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <label className="lbl" style={{ margin: 0, fontWeight: 800, fontSize: '13px', color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                                                Volumen ambiente
                                            </label>
                                            <span style={{ 
                                                background: 'var(--slate-100)', 
                                                color: 'var(--slate-900)', 
                                                padding: '4px 10px', 
                                                borderRadius: '20px', 
                                                fontSize: '12px', 
                                                fontWeight: 900 
                                            }}>
                                                {(ambientSoundVolume * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="0.5"
                                            step="0.01"
                                            value={ambientSoundVolume}
                                            onChange={(e) => updateField('ambientSoundVolume', parseFloat(e.target.value))}
                                            className="premium-range"
                                            style={{
                                                background: `linear-gradient(to right, var(--azul) 0%, var(--azul) ${ambientSoundVolume * 100 * 2}%, var(--slate-100) ${ambientSoundVolume * 100 * 2}%, var(--slate-100) 100%)`,
                                                width: '100%'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-between" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '40px' }}>
                    <button 
                        type="button" 
                        className="btn-s" 
                        onClick={prevStep}
                        style={{ height: '56px', padding: '0 36px', borderRadius: '18px', fontWeight: 700 }}
                    >
                        Anterior
                    </button>
                    <button 
                        type="button" 
                        className="btn-p" 
                        onClick={nextStep}
                        style={{ 
                            height: '56px', 
                            padding: '0 44px', 
                            borderRadius: '18px', 
                            fontWeight: 900, 
                            boxShadow: '0 15px 30px -10px rgba(37, 99, 235, 0.4)' 
                        }}
                    >
                        Siguiente
                        <i className="bi bi-arrow-right" style={{ marginLeft: '12px' }}></i>
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .premium-range {
                    -webkit-appearance: none;
                    width: 100%;
                    height: 8px;
                    border-radius: 10px;
                    outline: none;
                }
                .premium-range::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: white;
                    border: 2px solid var(--azul);
                    cursor: pointer;
                    box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);
                    transition: all 0.2s;
                }
                .premium-range::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 15px rgba(37, 99, 235, 0.4);
                }
            `}</style>
        </div>
    );
};
