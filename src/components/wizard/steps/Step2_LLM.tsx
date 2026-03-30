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
        <div className="content-area" style={{ padding: '40px' }}>
            <WizardStepHeader
                title="Cerebro del agente"
                subtitle="Selecciona el modelo de IA y define la personalidad de tu agente."
                showArrows={false}
            />

            <div className="wizard-info-box">
                <i className="bi bi-info-circle-fill"></i>
                <div>
                    <p><strong>Configuración de IA:</strong> El modelo seleccionado determinará la velocidad de respuesta y la capacidad de razonamiento. Para la mayoría de casos, <strong>Gemini 1.5 Flash</strong> ofrece el mejor equilibrio entre rendimiento y latencia.</p>
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} style={{ maxWidth: '900px' }}>
                {/* SECCIÓN 1: CONFIGURACIÓN DEL MODELO */}
                <div style={{ marginBottom: '48px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                        <i className="bi bi-cpu" style={{ color: 'var(--azul)', fontSize: '20px' }}></i>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--slate-800)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Modelo de Inteligencia Artificial</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        {[
                            {
                                id: 'gemini-3.1-flash',
                                name: 'Gemini 1.5 Flash',
                                desc: 'Recomendado — Respuesta instantánea y alta precisión para diálogos naturales.',
                                icon: 'bi-stars',
                                badge: 'MÁS RÁPIDO'
                            },
                            {
                                id: 'gpt-4o-mini',
                                name: 'GPT-4o Mini',
                                desc: 'Ideal para tareas complejas que requieren un razonamiento profundo y estructurado.',
                                icon: 'bi-robot',
                                badge: 'AVANZADO'
                            }
                        ].map(m => (
                            <div
                                key={m.id}
                                onClick={() => updateField('model', m.id)}
                                style={{
                                    border: model === m.id ? '2px solid var(--azul)' : '1px solid var(--slate-200)',
                                    borderRadius: '16px',
                                    padding: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px',
                                    cursor: 'pointer',
                                    background: model === m.id ? 'rgba(0, 102, 255, 0.04)' : 'white',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    boxShadow: model === m.id ? '0 10px 20px rgba(0, 102, 255, 0.05)' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div className="flex-center" style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '12px',
                                        background: model === m.id ? 'var(--azul)' : 'var(--slate-100)',
                                        color: model === m.id ? 'white' : 'var(--slate-500)',
                                        fontSize: '22px'
                                    }}>
                                        <i className={`bi ${m.icon}`}></i>
                                    </div>
                                    <span style={{ 
                                        fontSize: '10px', 
                                        fontWeight: 800, 
                                        padding: '4px 10px', 
                                        borderRadius: '20px', 
                                        background: model === m.id ? 'var(--azul)' : 'var(--slate-100)',
                                        color: model === m.id ? 'white' : 'var(--slate-500)'
                                    }}>
                                        {m.badge}
                                    </span>
                                </div>
                                
                                <div>
                                    <div style={{ fontWeight: 800, color: 'var(--slate-900)', fontSize: '15px', marginBottom: '6px' }}>{m.name}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--slate-500)', lineHeight: '1.5' }}>{m.desc}</div>
                                </div>
                                
                                {model === m.id && (
                                    <i className="bi bi-check-circle-fill" style={{ color: 'var(--azul)', position: 'absolute', top: '12px', right: '12px', fontSize: '18px' }}></i>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ height: '1px', background: 'var(--slate-100)', margin: '48px 0' }}></div>

                {/* SECCIÓN 2: COMPORTAMIENTO Y PERSONALIDAD */}
                <div style={{ marginBottom: '48px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                        <i className="bi bi-chat-left-dots" style={{ color: 'var(--azul)', fontSize: '20px' }}></i>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--slate-800)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comportamiento y personalidad</h3>
                    </div>

                    <div style={{ marginBottom: '40px' }}>
                        <label className="lbl" style={{ marginBottom: '16px', display: 'block', fontWeight: 700 }}>
                            ¿Quién inicia la conversación? <span style={{ color: 'var(--error)' }}>*</span>
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                            {[
                                { id: 'agent', name: 'El agente habla primero', icon: 'bi-megaphone', sub: 'Ideal para llamadas salientes' },
                                { id: 'user', name: 'El usuario habla primero', icon: 'bi-person', sub: 'Ideal para soporte entrante' }
                            ].map(b => (
                                <div
                                    key={b.id}
                                    onClick={() => updateField('whoFirst', b.id)}
                                    style={{
                                        border: whoFirst === b.id ? '2px solid var(--azul)' : '1px solid var(--slate-200)',
                                        borderRadius: '12px',
                                        padding: '16px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '14px',
                                        cursor: 'pointer',
                                        background: whoFirst === b.id ? 'rgba(0, 102, 255, 0.04)' : 'white',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <i className={`bi ${b.icon}`} style={{ fontSize: '20px', color: whoFirst === b.id ? 'var(--azul)' : 'var(--slate-400)' }}></i>
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: '14px' }}>{b.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--slate-400)' }}>{b.sub}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '40px' }}>
                        <label className="lbl" style={{ marginBottom: '8px', display: 'block', fontWeight: 700 }}>
                            Mensaje de Inicio <span style={{ color: 'var(--error)' }}>*</span>
                        </label>
                        <textarea
                            className="inp"
                            rows={4}
                            style={{ resize: 'none', padding: '16px 20px', borderRadius: '12px' }}
                            placeholder="Hola, soy Elio, tu asistente de voz de Netelip..."
                            value={beginMessage}
                            onChange={(e) => updateField('beginMessage', e.target.value)}
                            required
                        />

                        <div className="wizard-info-box" style={{ 
                            marginTop: '16px', 
                            background: '#fff7ed', 
                            borderColor: '#fed7aa',
                            color: '#9a3412'
                        }}>
                            <i className="bi bi-exclamation-triangle-fill" style={{ color: '#ea580c' }}></i>
                            <div>
                                <p style={{ fontWeight: 800, marginBottom: '4px' }}>Aviso legal obligatorio:</p>
                                <p style={{ fontSize: '12px', opacity: 0.9 }}>
                                    De acuerdo con la normativa vigente, el mensaje inicial <strong>debe informar</strong> al usuario que está hablando con una Inteligencia Artificial y que la llamada será grabada.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '40px' }}>
                        <label className="lbl" style={{ marginBottom: '12px', display: 'block', fontWeight: 700 }}>
                            Rasgos de personalidad
                        </label>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {['Profesional', 'Empático', 'Amigable', 'Proactivo', 'Directo'].map(trait => (
                                <button
                                    key={trait}
                                    type="button"
                                    onClick={() => handlePersonalityToggle(trait)}
                                    className={personality.includes(trait) ? 'btn-p' : 'btn-s'}
                                    style={{ 
                                        borderRadius: '20px', 
                                        padding: '8px 20px',
                                        fontSize: '13px',
                                        fontWeight: personality.includes(trait) ? 700 : 500,
                                        border: personality.includes(trait) ? 'none' : '1px solid var(--slate-200)',
                                        background: personality.includes(trait) ? 'var(--azul)' : 'white',
                                        color: personality.includes(trait) ? 'white' : 'var(--slate-600)'
                                    }}
                                >
                                    {personality.includes(trait) && <i className="bi bi-check-lg" style={{ marginRight: '6px' }}></i>}
                                    {trait}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '0' }}>
                        <label className="lbl" style={{ marginBottom: '12px', display: 'block', fontWeight: 700 }}>
                            Tono de la conversación <span style={{ color: 'var(--error)' }}>*</span>
                        </label>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {['Formal', 'Semiformal', 'Casual'].map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => updateField('tone', t)}
                                    className={tone === t ? 'btn-p' : 'btn-s'}
                                    style={{ 
                                        borderRadius: '20px', 
                                        padding: '8px 20px',
                                        fontSize: '13px',
                                        fontWeight: tone === t ? 700 : 500,
                                        border: tone === t ? 'none' : '1px solid var(--slate-200)',
                                        background: tone === t ? 'var(--azul)' : 'white',
                                        color: tone === t ? 'white' : 'var(--slate-600)'
                                    }}
                                >
                                    {tone === t && <i className="bi bi-check-lg" style={{ marginRight: '6px' }}></i>}
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-between" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '32px' }}>
                    <button 
                        type="button" 
                        className="btn-s" 
                        onClick={prevStep}
                        style={{ padding: '12px 24px', borderRadius: '12px' }}
                    >
                        <i className="bi bi-arrow-left"></i>
                        Anterior
                    </button>
                    <button 
                        type="submit" 
                        className="btn-p"
                        style={{ padding: '12px 32px', borderRadius: '12px' }}
                    >
                        Siguiente paso
                        <i className="bi bi-arrow-right"></i>
                    </button>
                </div>
            </form>
        </div>
    );
};
