"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';

export const Step2_LLM: React.FC = () => {
    const {
        whoFirst,
        beginMessage,
        personality,
        tone,
        model,
        updateField,
        nextStep,
        prevStep
    } = useWizardStore();

    const handlePersonalityToggle = (trait: string) => {
        const newPersonality = [...personality];
        const index = newPersonality.indexOf(trait);
        if (index > -1) {
            newPersonality.splice(index, 1);
        } else {
            newPersonality.push(trait);
        }
        updateField('personality', newPersonality);
    };

    return (
        <div className="content-area">
            <div className="form-card">
                <WizardStepHeader
                    title="Cerebro del agente"
                    subtitle="Selecciona el modelo de IA y define la personalidad de tu agente."
                />

                <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
                    {/* SECCIÓN 1: CONFIGURACIÓN DEL MODELO */}
                    <div style={{ marginBottom: '40px' }}>
                        <h3 className="lbl" style={{ fontSize: '16px', color: 'var(--oscuro)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                            <i className="bi bi-cpu" style={{ color: 'var(--azul)' }}></i>
                            Modelo de IA
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {[
                                {
                                    id: 'gemini-3.1-flash',
                                    name: 'Gemini 1.5 Flash',
                                    desc: 'Recomendado — Rápido y preciso',
                                    icon: 'bi-stars'
                                },
                                {
                                    id: 'gpt-4o-mini',
                                    name: 'GPT-4o Mini',
                                    desc: 'Alta capacidad de razonamiento',
                                    icon: 'bi-robot'
                                }
                            ].map(m => (
                                <div
                                    key={m.id}
                                    onClick={() => updateField('model', m.id)}
                                    style={{
                                        border: model === m.id ? '2px solid var(--azul)' : '1px solid var(--gris-borde)',
                                        borderRadius: 'var(--r-md)',
                                        padding: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        cursor: 'pointer',
                                        background: model === m.id ? 'var(--azul-light)' : 'var(--blanco)',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                >
                                    <div className="flex-center" style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        background: model === m.id ? 'var(--azul)' : 'var(--gris-bg)',
                                        color: model === m.id ? 'var(--blanco)' : 'var(--gris-texto)',
                                        fontSize: '20px'
                                    }}>
                                        <i className={`bi ${m.icon}`}></i>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--oscuro)', fontSize: '14px' }}>{m.name}</div>
                                        <div className="hint" style={{ fontSize: '12px', margin: 0 }}>{m.desc}</div>
                                    </div>
                                    {model === m.id && (
                                        <i className="bi bi-check-circle-fill" style={{ color: 'var(--azul)', position: 'absolute', top: '12px', right: '12px', fontSize: '16px' }}></i>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ height: '1px', background: 'var(--gris-borde)', margin: '32px 0' }}></div>

                    {/* SECCIÓN 2: COMPORTAMIENTO Y PERSONALIDAD */}
                    <div style={{ marginBottom: '40px' }}>
                        <h3 className="lbl" style={{ fontSize: '16px', color: 'var(--oscuro)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                            <i className="bi bi-chat-left-dots" style={{ color: 'var(--azul)' }}></i>
                            Comportamiento y personalidad
                        </h3>

                        <div style={{ marginBottom: '32px' }}>
                            <label className="lbl" style={{ marginBottom: '16px' }}>
                                ¿Quién habla primero? <span style={{ color: 'var(--error)' }}>*</span>
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                {[
                                    { id: 'agent', name: 'El agente habla primero', icon: 'bi-megaphone' },
                                    { id: 'user', name: 'El usuario habla primero', icon: 'bi-person' }
                                ].map(b => (
                                    <div
                                        key={b.id}
                                        onClick={() => updateField('whoFirst', b.id)}
                                        style={{
                                            border: whoFirst === b.id ? '2px solid var(--azul)' : '1px solid var(--gris-borde)',
                                            borderRadius: 'var(--r-md)',
                                            padding: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            cursor: 'pointer',
                                            background: whoFirst === b.id ? 'var(--azul-light)' : 'var(--blanco)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <i className={`bi ${b.icon}`} style={{ fontSize: '20px', color: whoFirst === b.id ? 'var(--azul)' : 'var(--gris-texto)' }}></i>
                                        <div style={{ fontWeight: 600, color: 'var(--oscuro)', fontSize: '13px' }}>{b.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <label className="lbl">
                                Mensaje de Inicio <span style={{ color: 'var(--error)' }}>*</span>
                            </label>
                            <textarea
                                className="inp"
                                rows={4}
                                style={{ resize: 'none' }}
                                placeholder="Hola, soy Elio, tu asistente de voz..."
                                value={beginMessage}
                                onChange={(e) => updateField('beginMessage', e.target.value)}
                                required
                            />

                            <div style={{
                                marginTop: '16px',
                                backgroundColor: 'var(--error-light)',
                                border: '1px solid var(--error)',
                                borderLeftWidth: '4px',
                                borderRadius: 'var(--r-md)',
                                padding: '16px',
                                display: 'flex',
                                gap: '12px'
                            }}>
                                <i className="bi bi-exclamation-triangle" style={{ color: 'var(--error)', fontSize: '18px' }}></i>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--error)', marginBottom: '4px' }}>Obligatorio por ley española (RGPD):</div>
                                    <div style={{ fontSize: '12px', color: 'var(--oscuro)', lineHeight: '1.5', opacity: 0.8 }}>
                                        El mensaje debe incluir que es un asistente de voz con IA y que la llamada está siendo grabada.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <label className="lbl">
                                Personalidad del agente
                            </label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {['Profesional', 'Empático', 'Amigable', 'Proactivo', 'Directo'].map(trait => (
                                    <button
                                        key={trait}
                                        type="button"
                                        onClick={() => handlePersonalityToggle(trait)}
                                        className={personality.includes(trait) ? 'btn-p mini' : 'btn-s mini'}
                                        style={{ 
                                            borderRadius: '20px', 
                                            padding: '8px 16px',
                                            border: personality.includes(trait) ? 'none' : '1px solid var(--gris-borde)' 
                                        }}
                                    >
                                        {trait}
                                    </button>
                                ))}
                            </div>
                            <div className="hint" style={{ marginTop: '8px' }}>
                                Selecciona uno o varios rasgos que definan cómo se expresa el agente.
                            </div>
                        </div>

                        <div style={{ marginBottom: '0' }}>
                            <label className="lbl">
                                Tono de comunicación <span style={{ color: 'var(--error)' }}>*</span>
                            </label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {['Formal', 'Semiformal', 'Casual'].map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => updateField('tone', t)}
                                        className={tone === t ? 'btn-p mini' : 'btn-s mini'}
                                        style={{ 
                                            borderRadius: '20px', 
                                            padding: '8px 16px',
                                            border: tone === t ? 'none' : '1px solid var(--gris-borde)' 
                                        }}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex-between" style={{ borderTop: '1px solid var(--gris-borde)', paddingTop: '24px' }}>
                        <button 
                            type="button" 
                            className="btn-s" 
                            onClick={prevStep}
                        >
                            <i className="bi bi-arrow-left"></i>
                            Anterior
                        </button>
                        <button 
                            type="submit" 
                            className="btn-p"
                        >
                            Siguiente paso
                            <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
