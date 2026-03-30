"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';

export const Step2_LLM: React.FC = () => {
    const {
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
        <div className="content-area" style={{ padding: '60px' }}>
            <WizardStepHeader
                title="Cerebro del agente"
                subtitle="Elige el modelo y define cómo debe comportarse tu agente."
                showArrows={false}
            />

            <div style={{ maxWidth: '1000px', marginTop: '40px' }}>
                
                {/* INFO BOX */}
                <div style={{ 
                    background: '#eff6ff', 
                    borderLeft: '4px solid var(--azul)', 
                    borderRadius: '12px', 
                    padding: '24px', 
                    display: 'flex', 
                    gap: '16px', 
                    alignItems: 'center',
                    marginBottom: '40px',
                    boxShadow: '0 4px 15px rgba(37, 99, 235, 0.05)'
                }}>
                    <i className="bi bi-cpu-fill" style={{ color: 'var(--azul)', fontSize: '24px' }}></i>
                    <p style={{ margin: 0, color: '#1e40af', fontSize: '15px', fontWeight: 600, lineHeight: '1.5' }}>
                        <strong>Consejo:</strong> Gemini 3.0 Flash es nuestra opción recomendada por su latencia ultra-baja y alta precisión en conversaciones de voz.
                    </p>
                </div>

                <div className="card-premium" style={{ padding: '40px', marginBottom: '40px' }}>
                    <div style={{ display: 'grid', gap: '48px' }}>
                        
                        {/* MODEL SELECTOR */}
                        <div>
                            <label className="lbl" style={{ marginBottom: '20px', display: 'block', fontWeight: 800, fontSize: '13px', color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Selecciona el motor de IA
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {[
                                    {
                                        id: 'gemini-3.1-flash',
                                        name: 'Gemini 3.1 Flash',
                                        desc: 'Velocidad instantánea',
                                        isRecommended: true,
                                        icon: 'bi-lightning-charge-fill'
                                    },
                                    {
                                        id: 'gpt-4o',
                                        name: 'GPT-4o',
                                        desc: 'Razonamiento complejo',
                                        isRecommended: false,
                                        icon: 'bi-robot'
                                    }
                                ].map(m => (
                                    <div
                                        key={m.id}
                                        onClick={() => updateField('model', m.id)}
                                        style={{
                                            border: model === m.id ? '2px solid var(--azul)' : '1px solid var(--slate-100)',
                                            borderRadius: '20px',
                                            padding: '24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '20px',
                                            cursor: 'pointer',
                                            background: model === m.id ? 'rgba(37, 99, 235, 0.02)' : 'white',
                                            transition: 'all 0.2s',
                                            position: 'relative',
                                            boxShadow: model === m.id ? '0 10px 25px -5px rgba(37, 99, 235, 0.1)' : 'none'
                                        }}
                                    >
                                        <div style={{ 
                                            width: '48px', height: '48px', borderRadius: '14px', 
                                            background: model === m.id ? 'var(--azul)' : 'var(--slate-50)',
                                            color: model === m.id ? 'white' : 'var(--slate-400)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                                        }}>
                                            <i className={`bi ${m.icon}`}></i>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 800, color: 'var(--slate-900)', fontSize: '16px' }}>{m.name}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: 500 }}>{m.desc}</div>
                                        </div>
                                        {m.isRecommended && (
                                            <div style={{ position: 'absolute', top: '-10px', right: '20px', background: 'var(--azul)', color: 'white', fontSize: '10px', fontWeight: 900, padding: '4px 12px', borderRadius: '30px', textTransform: 'uppercase', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)' }}>
                                                Recomendado
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ height: '1px', background: 'var(--slate-50)' }}></div>

                        {/* BEGIN MESSAGE */}
                        <div>
                            <label className="lbl" style={{ marginBottom: '20px', display: 'block', fontWeight: 800, fontSize: '13px', color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                                Mensaje de bienvenida
                            </label>
                            <textarea 
                                className="inp" 
                                placeholder="Ej: Hola, soy el asistente de Netelip, ¿en qué puedo ayudarte?"
                                value={beginMessage}
                                onChange={e => updateField('beginMessage', e.target.value)}
                                style={{ minHeight: '120px', padding: '24px', borderRadius: '24px', fontSize: '15px', lineHeight: '1.6' }}
                            />
                            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', background: '#f8fafc', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--slate-100)' }}>
                                <i className="bi bi-info-circle-fill" style={{ color: 'var(--slate-400)', fontSize: '18px' }}></i>
                                <p style={{ fontSize: '13px', color: 'var(--slate-500)', margin: 0, lineHeight: '1.5' }}>
                                    <strong>Aviso Legal (España):</strong> Recuerda avisar que es una IA y que la llamada será grabada.
                                </p>
                            </div>
                        </div>

                        <div style={{ height: '1px', background: 'var(--slate-50)' }}></div>

                        {/* PERSONALITY & TONE */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                            <div>
                                <label className="lbl" style={{ marginBottom: '20px', display: 'block', fontWeight: 800, fontSize: '13px', color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                                    Personalidad
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {['Profesional', 'Empático', 'Cercano', 'Directo'].map(p => (
                                        <button 
                                            key={p} type="button" 
                                            onClick={() => handlePersonalityToggle(p)}
                                            style={{ 
                                                padding: '10px 24px', borderRadius: '30px', fontSize: '13px', fontWeight: 800,
                                                background: personality.includes(p) ? 'var(--azul)' : 'white',
                                                color: personality.includes(p) ? 'white' : 'var(--slate-500)',
                                                border: '1px solid ' + (personality.includes(p) ? 'var(--azul)' : 'var(--slate-100)'),
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="lbl" style={{ marginBottom: '20px', display: 'block', fontWeight: 800, fontSize: '13px', color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                                    Tono de voz
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {['Formal', 'Casual'].map(t => (
                                        <button 
                                            key={t} type="button" 
                                            onClick={() => updateField('tone', t)}
                                            style={{ 
                                                padding: '10px 24px', borderRadius: '30px', fontSize: '13px', fontWeight: 800,
                                                background: tone === t ? 'var(--azul)' : 'white',
                                                color: tone === t ? 'white' : 'var(--slate-500)',
                                                border: '1px solid ' + (tone === t ? 'var(--azul)' : 'var(--slate-100)'),
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* BOTTOM ACTIONS */}
                <div className="flex-between" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '48px', marginTop: '40px' }}>
                    <button type="button" className="btn-s" onClick={prevStep} style={{ height: '56px', padding: '0 36px', borderRadius: '18px', fontWeight: 700 }}>
                        Anterior
                    </button>
                    <button type="button" className="btn-p" onClick={nextStep} style={{ height: '56px', padding: '0 48px', borderRadius: '18px', fontWeight: 900, boxShadow: '0 15px 30px -10px rgba(37, 99, 235, 0.4)' }}>
                        Siguiente
                        <i className="bi bi-arrow-right" style={{ marginLeft: '12px' }}></i>
                    </button>
                </div>
            </div>
        </div>
    );
};
