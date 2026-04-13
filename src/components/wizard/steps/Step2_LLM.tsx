"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

const PERSONALITIES = ['Profesional', 'Empático', 'Amigable', 'Proactivo', 'Directo'];
const TONES = ['Formal', 'Semiformal', 'Casual'];

export const Step2_LLM: React.FC = () => {
    const { beginMessage, personality, tone, model, updateField, nextStep, prevStep } = useWizardStore();
    const [validationError, setValidationError] = useState('');

    const togglePersonality = (trait: string) => {
        const next = [...personality];
        const idx = next.indexOf(trait);
        if (idx > -1) next.splice(idx, 1);
        else next.push(trait);
        updateField('personality', next);
    };

    const handleNext = () => {
        if (!beginMessage.trim()) {
            setValidationError('El mensaje de inicio es obligatorio (RGPD).');
            return;
        }
        setValidationError('');
        nextStep();
    };

    return (
        <div className="form-card">
            <div className="form-title">Cerebro del agente</div>
            <div className="form-sub">Selecciona el modelo de IA y define la personalidad de tu agente.</div>

            {/* Modelo */}
            <div className="form-section-title"><i className="bi bi-cpu"></i> Modelo de IA</div>
            <div className="fg">
                <label className="lbl">Selecciona el modelo <span style={{ color: 'var(--error)' }}>*</span></label>
                <div className="rcards-2" style={{ marginTop: '8px' }}>
                    <div
                        className={`rcard${model === 'gemini-3.0-flash' ? ' on' : ''}`}
                        style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}
                        onClick={() => updateField('model', 'gemini-3.0-flash')}
                    >
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--azul-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className="bi bi-stars" style={{ color: 'var(--azul)', fontSize: '18px' }}></i>
                        </div>
                        <div>
                            <div className="rcard-label" style={{ textAlign: 'left' }}>Gemini 3.0 Flash</div>
                            <div className="rcard-desc" style={{ textAlign: 'left' }}>Recomendado — Rápido y preciso</div>
                        </div>
                    </div>
                    <div
                        className={`rcard${model === 'gpt-4.1' ? ' on' : ''}`}
                        style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}
                        onClick={() => updateField('model', 'gpt-4.1')}
                    >
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className="bi bi-robot" style={{ color: 'var(--exito)', fontSize: '18px' }}></i>
                        </div>
                        <div>
                            <div className="rcard-label" style={{ textAlign: 'left' }}>GPT-4.1</div>
                            <div className="rcard-desc" style={{ textAlign: 'left' }}>Alta capacidad de razonamiento</div>
                        </div>
                    </div>
                </div>
                <div className="hint"><i className="bi bi-info-circle" style={{ marginRight: '3px' }}></i>Gemini 3.0 Flash ofrece el mejor equilibrio entre velocidad y precisión. GPT-4.1 es más potente en razonamiento complejo pero algo más lento.</div>
            </div>

            <hr className="divider" />

            {/* Comportamiento */}
            <div className="form-section-title"><i className="bi bi-chat-dots"></i> Comportamiento y personalidad</div>

            <div className="fg">
                <label className="lbl" htmlFor="inp-mensaje-inicio">
                    Mensaje de inicio <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <textarea
                    className="inp"
                    id="inp-mensaje-inicio"
                    rows={3}
                    placeholder="Ej: Hola, soy [nombre], tu asistente de voz con IA de [empresa]. Esta llamada está siendo grabada por motivos de calidad. ¿En qué puedo ayudarte?"
                    value={beginMessage}
                    onChange={(e) => updateField('beginMessage', e.target.value)}
                />
                <div className="cw">
                    <i className="bi bi-exclamation-triangle-fill" style={{ flexShrink: 0, marginTop: '1px' }}></i>
                    <div><strong>Obligatorio por ley española (RGPD y LOPD):</strong> El mensaje debe incluir que es un asistente de voz con IA y que la llamada está siendo grabada.</div>
                </div>
            </div>

            <div className="fg" style={{ marginTop: '14px' }}>
                <label className="lbl">Personalidad del agente</label>
                <div className="pill-row">
                    {PERSONALITIES.map(p => (
                        <button
                            key={p} type="button"
                            className={`pill${personality.includes(p) ? ' on' : ''}`}
                            onClick={() => togglePersonality(p)}
                        >
                            {p}
                        </button>
                    ))}
                </div>
                <div className="hint">Selecciona uno o varios rasgos que definan cómo se expresa el agente.</div>
            </div>

            <div className="fg">
                <label className="lbl">Tono de comunicación <span style={{ color: 'var(--error)' }}>*</span></label>
                <div className="pill-row">
                    {TONES.map(t => (
                        <button
                            key={t} type="button"
                            className={`pill${tone === t ? ' on' : ''}`}
                            onClick={() => updateField('tone', t)}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <div className="hint"><i className="bi bi-info-circle" style={{ marginRight: '3px' }}></i>Formal: usted, sin contracciones. Semiformal: equilibrio entre cercanía y respeto. Casual: tú, lenguaje coloquial.</div>
            </div>

            {validationError && (
                <div className="cw" style={{ marginBottom: '8px' }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ flexShrink: 0 }}></i>
                    {validationError}
                </div>
            )}
            <div className="wiz-footer">
                <button type="button" className="btn-s" onClick={prevStep}>
                    <i className="bi bi-arrow-left"></i> Anterior
                </button>
                <button type="button" className="btn-p" onClick={handleNext}>
                    Siguiente <i className="bi bi-arrow-right"></i>
                </button>
            </div>
        </div>
    );
};
