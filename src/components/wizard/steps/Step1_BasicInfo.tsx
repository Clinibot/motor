"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';

export const Step1_BasicInfo: React.FC = () => {
    const { agentName, companyName, companyDescription, updateField, nextStep } = useWizardStore();
    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (Object.keys({}).length === 0) {
            nextStep();
        }
    };

    return (
        <div className="content-area" style={{ padding: '40px' }}>
            <WizardStepHeader
                title="Información básica del agente"
                subtitle="Dinos cómo se llamará tu agente y a qué empresa representa."
                showArrows={false}
            />

            <form onSubmit={handleNext} style={{ maxWidth: '800px', marginTop: '32px' }}>
                <div style={{ display: 'grid', gap: '32px', marginBottom: '48px' }}>
                    
                    <div className="wizard-info-box">
                        <i className="bi bi-info-circle-fill"></i>
                        <div>
                            <p><strong>Primeros pasos:</strong> Define la identidad de tu agente. Estos datos ayudarán a configurar la personalidad inicial y cómo se presentará en las llamadas.</p>
                        </div>
                    </div>

                    <div className="form-group" style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid var(--slate-100)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                        <label className="lbl" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'block' }}>
                            Identidad del Agente <span style={{ color: 'var(--error)' }}>*</span>
                        </label>
                        <input
                            type="text"
                            className="inp"
                            placeholder="Ej: Asistente de Ventas"
                            value={agentName}
                            onChange={(e) => updateField('agentName', e.target.value)}
                            required
                            style={{ 
                                padding: '16px 20px', 
                                borderRadius: '14px', 
                                border: '1.5px solid var(--slate-200)',
                                fontSize: '15px',
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                        />
                        <div className="hint" style={{ marginTop: '10px', fontSize: '12px', color: 'var(--slate-400)', fontWeight: 500 }}>
                            <i className="bi bi-info-circle" style={{ marginRight: '6px' }}></i>
                            Este nombre se usará en la interfaz y en los informes para identificar a este agente.
                        </div>
                    </div>

                    <div className="form-group" style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid var(--slate-100)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                        <label className="lbl" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'block' }}>
                            Nombre de la Empresa <span style={{ color: 'var(--error)' }}>*</span>
                        </label>
                        <input
                            type="text"
                            className="inp"
                            placeholder="Ej: Netelip"
                            value={companyName}
                            onChange={(e) => updateField('companyName', e.target.value)}
                            required
                            style={{ 
                                padding: '16px 20px', 
                                borderRadius: '14px', 
                                border: '1.5px solid var(--slate-200)',
                                fontSize: '15px',
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                        />
                        <div className="hint" style={{ marginTop: '10px', fontSize: '12px', color: 'var(--slate-400)', fontWeight: 500 }}>
                            <i className="bi bi-building" style={{ marginRight: '6px' }}></i>
                            El agente lo usará para presentarse al inicio de cada conversación.
                        </div>
                    </div>

                    <div className="form-group" style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid var(--slate-100)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                        <label className="lbl" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'block' }}>
                            Actividad o Misión de la Empresa
                        </label>
                        <textarea
                            className="inp"
                            placeholder="Ej: Somos una empresa de telecomunicaciones dedicada a ofrecer las mejores soluciones VoIP para PYMES."
                            value={companyDescription}
                            onChange={(e) => updateField('companyDescription', e.target.value)}
                            rows={4}
                            style={{ 
                                resize: 'none', 
                                padding: '16px 20px', 
                                borderRadius: '14px', 
                                border: '1.5px solid var(--slate-200)',
                                fontSize: '15px',
                                fontWeight: 500,
                                height: 'auto',
                                lineHeight: '1.6'
                            }}
                        />
                        <div className="hint" style={{ marginTop: '10px', fontSize: '12px', color: 'var(--slate-400)', fontWeight: 500 }}>
                            <i className="bi bi-card-text" style={{ marginRight: '6px' }}></i>
                            Resume en 1 o 2 frases qué hace tu empresa para que el agente tenga contexto básico.
                        </div>
                    </div>
                </div>

                <div className="flex-between" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '32px' }}>
                    <div />
                    <button 
                        type="submit" 
                        className="btn-p" 
                        disabled={!agentName.trim()}
                        style={{ padding: '14px 40px', borderRadius: '14px', fontSize: '15px', boxShadow: '0 10px 20px -10px rgba(37, 99, 235, 0.3)' }}
                    >
                        Siguiente paso
                        <i className="bi bi-arrow-right"></i>
                    </button>
                </div>
            </form>
        </div>
    );
};
