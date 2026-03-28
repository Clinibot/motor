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
                    <div className="step-section">
                        <h3 className="section-title-icon" style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <i className="bi bi-target" style={{ color: '#267ab0' }}></i>
                            Modelo de IA
                        </h3>

                        <div className="row">
                            <div className="col-md-12">
                                <div className="form-group mb-4">
                                    <label className="form-label mb-3">
                                        Selecciona el modelo <span className="required">*</span>
                                    </label>
                                    <div className="row g-3">
                                        {[
                                            {
                                                id: 'gemini-3.0-flash',
                                                name: 'Gemini 3.0 Flash',
                                                desc: 'Recomendado — Rápido y preciso',
                                                icon: 'bi-stars'
                                            },
                                            {
                                                id: 'gpt-4.1',
                                                name: 'GPT-4.1',
                                                desc: 'Alta capacidad de razonamiento',
                                                icon: 'bi-robot'
                                            }
                                        ].map(m => (
                                            <div key={m.id} className="col-md-6">
                                                <div
                                                    className={`selection-card ${model === m.id ? 'selected' : ''}`}
                                                    onClick={() => updateField('model', m.id)}
                                                    style={{
                                                        border: `2px solid ${model === m.id ? '#267ab0' : '#e5e7eb'}`,
                                                        borderRadius: '12px',
                                                        padding: '24px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '16px',
                                                        cursor: 'pointer',
                                                        background: model === m.id ? '#f0f7ff' : '#fff',
                                                        transition: 'all 0.2s',
                                                        height: '100%'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '48px',
                                                        height: '48px',
                                                        borderRadius: '10px',
                                                        background: model === m.id ? '#267ab0' : '#f8f9fa',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: model === m.id ? 'white' : '#64748b',
                                                        fontSize: '24px'
                                                    }}>
                                                        <i className={`bi ${m.icon}`}></i>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: '#1a2428', fontSize: '15px' }}>{m.name}</div>
                                                        <div style={{ fontSize: '13px', color: '#64748b' }}>{m.desc}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="section-divider" style={{ borderTop: '1px solid #edf2f7', margin: '32px 0' }}></div>

                    {/* SECCIÓN 2: COMPORTAMIENTO Y PERSONALIDAD */}
                    <div className="step-section">
                        <h3 className="section-title-icon" style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                            <i className="bi bi-chat-left-dots" style={{ color: '#267ab0' }}></i>
                            Comportamiento y personalidad
                        </h3>

                        <div className="row">
                            <div className="col-md-12">
                                <div className="form-group mb-4">
                                    <label className="form-label mb-3">
                                        ¿Quién habla primero? <span className="required">*</span>
                                    </label>
                                    <div className="row g-3">
                                        {[
                                            { id: 'agent', name: 'El agente habla primero', icon: 'bi-megaphone' },
                                            { id: 'user', name: 'El usuario habla primero', icon: 'bi-person' }
                                        ].map(b => (
                                            <div key={b.id} className="col-md-6">
                                                <div
                                                    className={`selection-card ${whoFirst === b.id ? 'selected' : ''}`}
                                                    onClick={() => updateField('whoFirst', b.id)}
                                                    style={{
                                                        border: `2px solid ${whoFirst === b.id ? '#267ab0' : '#e5e7eb'}`,
                                                        borderRadius: '12px',
                                                        padding: '24px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '12px',
                                                        cursor: 'pointer',
                                                        background: whoFirst === b.id ? '#f0f7ff' : '#fff',
                                                        transition: 'all 0.2s',
                                                        height: '100%'
                                                    }}
                                                >
                                                    <div style={{ fontSize: '24px', color: whoFirst === b.id ? '#267ab0' : '#64748b' }}>
                                                        <i className={`bi ${b.icon}`}></i>
                                                    </div>
                                                    <div style={{ fontWeight: 700, color: '#1a2428', fontSize: '14px' }}>{b.name}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-group mb-4">
                                    <label className="form-label mb-2">
                                        Mensaje de Inicio <span className="required">*</span>
                                    </label>
                                    <textarea
                                        className="form-control"
                                        rows={4}
                                        style={{ 
                                            borderRadius: '12px', 
                                            padding: '16px',
                                            fontSize: '15px',
                                            borderColor: '#e5e7eb',
                                            backgroundColor: '#fff',
                                            resize: 'none'
                                        }}
                                        placeholder="Hola, soy Elio, tu asistente de voz creado con inteligencia artificial de netelip y esta llamada está siendo grabada por motivos de calidad. ¿Con quién tengo el gusto de hablar?"
                                        value={beginMessage}
                                        onChange={(e) => updateField('beginMessage', e.target.value)}
                                        required
                                    />

                                    <div style={{
                                        marginTop: '16px',
                                        backgroundColor: '#fff7ed',
                                        border: '1px solid #fed7aa',
                                        borderLeft: '4px solid #ea580c',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        display: 'flex',
                                        gap: '12px',
                                        alignItems: 'start'
                                    }}>
                                        <i className="bi bi-exclamation-triangle-fill" style={{ color: '#ea580c', fontSize: '18px', marginTop: '2px' }}></i>
                                        <span style={{ fontSize: '14px', color: '#9a3412', lineHeight: '1.5' }}>
                                            <strong style={{ display: 'block', marginBottom: '2px' }}>Obligatorio por ley española (RGPD y LOPD):</strong> 
                                            El mensaje debe incluir que es un asistente de voz con IA y que la llamada está siendo grabada.
                                        </span>
                                    </div>
                                </div>

                                <div className="form-group mb-4">
                                    <label className="form-label mb-2">
                                        Personalidad del agente
                                    </label>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {['Profesional', 'Empático', 'Amigable', 'Proactivo', 'Directo'].map(trait => (
                                            <button
                                                key={trait}
                                                type="button"
                                                onClick={() => handlePersonalityToggle(trait)}
                                                style={{
                                                    padding: '8px 20px',
                                                    borderRadius: '20px',
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    border: `1px solid ${personality.includes(trait) ? '#267ab0' : '#e5e7eb'}`,
                                                    background: personality.includes(trait) ? '#267ab0' : '#fff',
                                                    color: personality.includes(trait) ? 'white' : '#64748b',
                                                    transition: 'all 0.2s',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {trait}
                                            </button>
                                        ))}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                                        Selecciona uno o varios rasgos que definan cómo se expresa el agente.
                                    </div>
                                </div>

                                <div className="form-group mb-0">
                                    <label className="form-label mb-2">
                                        Tono de comunicación <span className="required">*</span>
                                    </label>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {['Formal', 'Semiformal', 'Casual'].map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => updateField('tone', t)}
                                                style={{
                                                    padding: '8px 20px',
                                                    borderRadius: '20px',
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    border: `1px solid ${tone === t ? '#267ab0' : '#e5e7eb'}`,
                                                    background: tone === t ? '#267ab0' : '#fff',
                                                    color: tone === t ? 'white' : '#64748b',
                                                    transition: 'all 0.2s',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="wizard-actions mt-5 pt-4" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <button 
                                type="button" 
                                className="btn" 
                                onClick={prevStep}
                                style={{
                                    border: '1px solid #e5e7eb',
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
                    </div>
                </form>
            </div>
        </div>
    );
};
