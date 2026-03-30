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
        <div className="content-area" style={{ padding: '40px' }}>
            <WizardStepHeader
                title="Audio y procesamiento"
                subtitle="Configura la calidad del audio, sonido ambiente y procesamiento del agente."
                showArrows={false}
            />

            <div className="wizard-info-box">
                <i className="bi bi-info-circle-fill"></i>
                <div>
                    <p><strong>Configuración de Audio:</strong> El sonido ambiente puede ayudar a que el agente suene más natural (por ejemplo, simulando una oficina real). Te recomendamos un volumen bajo (5-10%) para no interferir con la claridad de la voz.</p>
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} style={{ maxWidth: '800px' }}>
                
                <div style={{ marginBottom: '48px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
                        <i className="bi bi-volume-up" style={{ color: 'var(--azul)', fontSize: '20px' }}></i>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--slate-800)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Volumen y sonido ambiente</h3>
                    </div>

                    {/* VOLUMEN DEL AGENTE */}
                    <div style={{ marginBottom: '40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <label className="lbl" style={{ margin: 0, fontWeight: 700 }}>Volumen del agente</label>
                            <span style={{ 
                                background: 'var(--azul)', 
                                color: 'white', 
                                padding: '2px 10px', 
                                borderRadius: '20px', 
                                fontSize: '12px', 
                                fontWeight: 800 
                            }}>
                                {(volume * 100).toFixed(0)}%
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volume}
                                    onChange={(e) => updateField('volume', parseFloat(e.target.value))}
                                    className="premium-range"
                                    style={{
                                        background: `linear-gradient(to right, var(--azul) 0%, var(--azul) ${volume * 100}%, var(--slate-200) ${volume * 100}%, var(--slate-200) 100%)`
                                    }}
                                />
                            </div>
                        </div>
                        <div className="hint" style={{ marginTop: '8px' }}>
                            Ajusta la intensidad de la voz del agente durante las llamadas.
                        </div>
                    </div>

                    {/* HABILITAR SONIDO AMBIENTE */}
                    <div style={{ 
                        background: 'white', 
                        border: '1px solid var(--slate-200)', 
                        borderRadius: '16px', 
                        padding: '24px',
                        marginBottom: '32px'
                    }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', margin: 0 }}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="checkbox"
                                    checked={enableAmbientSound}
                                    onChange={(e) => updateField('enableAmbientSound', e.target.checked)}
                                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                />
                            </div>
                            <div>
                                <span style={{ fontWeight: 800, color: 'var(--slate-900)', fontSize: '15px', display: 'block' }}>Habilitar sonido ambiente</span>
                                <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>Simula ruidos de fondo reales para mayor naturalidad.</span>
                            </div>
                        </label>

                        {enableAmbientSound && (
                            <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeIn 0.4s ease' }}>
                                <div style={{ height: '1px', background: 'var(--slate-100)' }}></div>
                                
                                {/* TIPO DE AMBIENTE */}
                                <div>
                                    <label className="lbl" style={{ marginBottom: '8px', display: 'block', fontWeight: 700 }}>Tipo de ambiente</label>
                                    <select
                                        className="inp"
                                        value={ambientSound}
                                        onChange={(e) => updateField('ambientSound', e.target.value)}
                                        style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--slate-200)' }}
                                    >
                                        <option value="none">Ninguno</option>
                                        <option value="coffee-shop">☕ Cafetería (Platos, ambiente)</option>
                                        <option value="convention-hall">🏢 Centro de convenciones (Murmullos)</option>
                                        <option value="summer-outdoor">🌲 Exterior de verano (Naturaleza)</option>
                                        <option value="mountain-outdoor">⛰️ Montaña (Viento suave)</option>
                                        <option value="call-center">🎧 Call Center (Voces de fondo)</option>
                                        <option value="static-noise">📻 Ruido estático (Interferencia)</option>
                                    </select>
                                </div>

                                {/* VOLUMEN AMBIENTE */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <label className="lbl" style={{ margin: 0, fontWeight: 700 }}>Volumen ambiente</label>
                                        <span style={{ 
                                            background: 'var(--slate-800)', 
                                            color: 'white', 
                                            padding: '2px 10px', 
                                            borderRadius: '20px', 
                                            fontSize: '12px', 
                                            fontWeight: 800 
                                        }}>
                                            {(ambientSoundVolume * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ flex: 1 }}>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.01"
                                                value={ambientSoundVolume}
                                                onChange={(e) => updateField('ambientSoundVolume', parseFloat(e.target.value))}
                                                className="premium-range"
                                                style={{
                                                    background: `linear-gradient(to right, var(--azul) 0%, var(--azul) ${ambientSoundVolume * 100}%, var(--slate-200) ${ambientSoundVolume * 100}%, var(--slate-200) 100%)`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-between" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '32px' }}>
                    <button type="button" className="btn-s" onClick={prevStep} style={{ padding: '12px 24px', borderRadius: '12px' }}>
                        <i className="bi bi-arrow-left"></i> Anterior
                    </button>
                    <button type="submit" className="btn-p" style={{ padding: '12px 32px', borderRadius: '12px' }}>
                        Siguiente paso
                        <i className="bi bi-arrow-right"></i>
                    </button>
                </div>
            </form>
            
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};
