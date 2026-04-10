"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step4_Audio: React.FC = () => {
    const {
        volume, enableAmbientSound, ambientSound, ambientSoundVolume,
        updateField, nextStep, prevStep
    } = useWizardStore();

    const volumePct = Math.round(volume * 100);
    const ambientPct = Math.round(ambientSoundVolume * 100); // 0–1 mapped to 0–100%

    return (
        <div className="form-card">
            <div className="form-title">Audio y procesamiento</div>
            <div className="form-sub">Configura la calidad del audio, cancelación de ruido y transcripción del agente.</div>

            <div className="ci" style={{ marginBottom: '20px' }}>
                <i className="bi bi-info-circle-fill" style={{ flexShrink: 0, marginTop: '1px' }}></i>
                <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                    Estos ajustes afectan a cómo suena tu agente durante las llamadas. Los valores por defecto funcionan bien para la mayoría de casos — solo modifícalos si tienes necesidades específicas.
                </div>
            </div>

            <div className="form-section-title"><i className="bi bi-volume-up"></i> Volumen y sonido ambiente</div>

            {/* Volumen del agente */}
            <div className="fg">
                <label className="lbl">Volumen del agente</label>
                <div className="slider-row">
                    <input
                        type="range" min="0" max="1" step="0.01"
                        value={volume}
                        onChange={(e) => updateField('volume', parseFloat(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--azul)', cursor: 'pointer', height: '6px' }}
                    />
                    <span className="slider-badge">{volumePct}%</span>
                </div>
                <div className="hint">Ajusta la intensidad de la voz del agente durante las llamadas.</div>
            </div>

            {/* Sonido ambiente toggle */}
            <div className="fg" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <input
                    type="checkbox" id="chkAmbiente"
                    checked={enableAmbientSound}
                    onChange={(e) => updateField('enableAmbientSound', e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--azul)', flexShrink: 0 }}
                />
                <label htmlFor="chkAmbiente" style={{ fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                    Habilitar sonido ambiente (Ruido de fondo)
                </label>
            </div>
            <div className="hint" style={{ marginLeft: '26px', marginTop: '4px' }}>
                <i className="bi bi-info-circle" style={{ marginRight: '3px' }}></i>
                Añade un sonido de fondo sutil para que la llamada suene más natural y humana. Por ejemplo, ruido de oficina o cafetería.
            </div>

            {enableAmbientSound && (
                <div style={{ marginTop: '20px' }}>
                    <div className="fg">
                        <label className="lbl" htmlFor="inp-tipo-ambiente">Tipo de ambiente</label>
                        <select
                            className="inp sel" id="inp-tipo-ambiente"
                            value={ambientSound}
                            onChange={(e) => updateField('ambientSound', e.target.value)}
                        >
                            <option value="none">Ninguno</option>
                            <option value="coffee-shop">Cafetería (Platos, ambiente)</option>
                            <option value="convention-hall">Centro de convenciones (Murmullos altos)</option>
                            <option value="summer-outdoor">Exterior de verano (Naturaleza, insectos)</option>
                            <option value="call-center">Call Center (Voces de fondo, teclados)</option>
                            <option value="static-noise">Ruido estático (TV antigua, interferencia)</option>
                        </select>
                        <div className="hint"><i className="bi bi-info-circle" style={{ marginRight: '3px' }}></i>El tipo de ambiente más popular es &quot;Call Center&quot; — simula un entorno de oficina profesional.</div>
                    </div>

                    <div className="fg">
                        <label className="lbl">Volumen ambiente</label>
                        <div className="slider-row">
                            <input
                                type="range" min="0" max="1" step="0.01"
                                value={ambientSoundVolume}
                                onChange={(e) => updateField('ambientSoundVolume', parseFloat(e.target.value))}
                                style={{ flex: 1, accentColor: 'var(--azul)', cursor: 'pointer', height: '6px' }}
                            />
                            <span className="slider-badge">{ambientPct}%</span>
                        </div>
                        <div className="hint"><i className="bi bi-info-circle" style={{ marginRight: '3px' }}></i>Recomendamos entre 10% y 30%. Un volumen demasiado alto puede dificultar la comprensión de la voz del agente.</div>
                    </div>
                </div>
            )}

            <div className="wiz-footer">
                <button type="button" className="btn-s" onClick={prevStep}>
                    <i className="bi bi-arrow-left"></i> Anterior
                </button>
                <button type="button" className="btn-p" onClick={nextStep}>
                    Siguiente <i className="bi bi-arrow-right"></i>
                </button>
            </div>
        </div>
    );
};
