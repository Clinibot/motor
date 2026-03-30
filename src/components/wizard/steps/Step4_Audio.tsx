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
                    subtitle="Configura la calidad del audio, sonido ambiente y procesamiento del agente."
                />

                <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
                    
                    <div className="fg" style={{ marginBottom: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <i className="bi bi-volume-up" style={{ color: 'var(--azul)', fontSize: '20px' }}></i>
                            <h3 className="lbl" style={{ margin: 0, fontSize: '15px' }}>Volumen y sonido ambiente</h3>
                        </div>

                        {/* VOLUMEN DEL AGENTE */}
                        <div className="fg" style={{ marginBottom: '32px' }}>
                            <label className="lbl">Volumen del agente</label>
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
                                            background: `linear-gradient(to right, var(--azul) 0%, var(--azul) ${volume * 100}%, var(--gris-borde) ${volume * 100}%, var(--gris-borde) 100%)`
                                        }}
                                    />
                                </div>
                                <div className="flex-center" style={{
                                    minWidth: '54px',
                                    padding: '6px',
                                    backgroundColor: 'var(--azul)',
                                    color: 'var(--blanco)',
                                    borderRadius: 'var(--r-md)',
                                    fontSize: '13px',
                                    fontWeight: 700
                                }}>
                                    {(volume * 100).toFixed(0)}%
                                </div>
                            </div>
                            <div className="hint">
                                Ajusta la intensidad de la voz del agente durante las llamadas.
                            </div>
                        </div>

                        {/* HABILITAR SONIDO AMBIENTE */}
                        <div className="fg" style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={enableAmbientSound}
                                    onChange={(e) => updateField('enableAmbientSound', e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <span className="lbl" style={{ margin: 0 }}>Habilitar sonido ambiente (Ruido de fondo)</span>
                            </label>
                        </div>

                        {enableAmbientSound && (
                            <div className="flex-center" style={{ flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
                                {/* TIPO DE AMBIENTE */}
                                <div className="fg w-full">
                                    <label className="lbl">Tipo de ambiente</label>
                                    <select
                                        className="inp sel"
                                        value={ambientSound}
                                        onChange={(e) => updateField('ambientSound', e.target.value)}
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
                                <div className="fg w-full">
                                    <label className="lbl">Volumen ambiente</label>
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
                                                    background: `linear-gradient(to right, var(--azul) 0%, var(--azul) ${ambientSoundVolume * 100}%, var(--gris-borde) ${ambientSoundVolume * 100}%, var(--gris-borde) 100%)`
                                                }}
                                            />
                                        </div>
                                        <div className="flex-center" style={{
                                            minWidth: '54px',
                                            padding: '6px',
                                            backgroundColor: 'var(--azul)',
                                            color: 'var(--blanco)',
                                            borderRadius: 'var(--r-md)',
                                            fontSize: '13px',
                                            fontWeight: 700
                                        }}>
                                            {(ambientSoundVolume * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-between" style={{ borderTop: '1px solid var(--gris-borde)', paddingTop: '24px' }}>
                        <button type="button" className="btn-s" onClick={prevStep}>
                            <i className="bi bi-arrow-left"></i> Anterior
                        </button>
                        <button type="submit" className="btn-p">
                            Siguiente paso
                            <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            </div>
            
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};
