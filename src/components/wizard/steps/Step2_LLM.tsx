"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

const PERSONALITIES = ['Profesional', 'Empático', 'Amigable', 'Proactivo', 'Directo'];
const TONES = ['Formal', 'Semiformal', 'Casual'];

export const Step2_LLM: React.FC = () => {
    const { beginMessage, personality, tone, updateField, nextStep, prevStep } = useWizardStore();
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
            <div className="form-sub">Define la personalidad de tu agente.</div>

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
