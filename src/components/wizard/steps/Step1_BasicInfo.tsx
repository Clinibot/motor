"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';

export const Step1_BasicInfo: React.FC = () => {
    const { agentName, companyName, companyDescription, updateField, nextStep } = useWizardStore();
    
    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (agentName.trim() && companyName.trim()) {
            nextStep();
        }
    };

    return (
        <div className="content-area" style={{ padding: '60px' }}>
            <WizardStepHeader
                title="Información básica del agente"
                subtitle="Dinos cómo se llamará tu agente y a qué empresa representa."
                showArrows={false}
            />

            <form onSubmit={handleNext} style={{ maxWidth: '1000px', marginTop: '40px' }}>
                <div style={{ display: 'grid', gap: '32px', marginBottom: '60px' }}>
                    
                    <div style={{ display: 'grid', gap: '24px' }}>
                        <div>
                            <label className="lbl" style={{ marginBottom: '8px', display: 'block', fontWeight: 800, fontSize: '13px', color: 'var(--slate-700)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                Nombre del agente <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="text"
                                className="inp"
                                placeholder="Ej: Elio, Sofía..."
                                value={agentName}
                                onChange={(e) => updateField('agentName', e.target.value)}
                                required
                                style={{ 
                                    padding: '18px 24px', 
                                    borderRadius: '18px', 
                                    border: '1px solid var(--slate-100)',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    background: 'white',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                                }}
                            />
                            <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--slate-400)', fontWeight: 500, lineHeight: '1.4' }}>
                                Este nombre se usará para identificar a tu agente en el panel y en los informes de actividad.
                            </div>
                        </div>

                        <div>
                            <label className="lbl" style={{ marginBottom: '8px', display: 'block', fontWeight: 800, fontSize: '13px', color: 'var(--slate-700)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                Nombre de la empresa <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="text"
                                className="inp"
                                placeholder="Ej: Clínica García"
                                value={companyName}
                                onChange={(e) => updateField('companyName', e.target.value)}
                                required
                                style={{ 
                                    padding: '18px 24px', 
                                    borderRadius: '18px', 
                                    border: '1px solid var(--slate-100)',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    background: 'white',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                                }}
                            />
                            <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--slate-400)', fontWeight: 500, lineHeight: '1.4' }}>
                                Indica el nombre real de tu negocio. El agente lo usará para presentarse ante tus clientes.
                            </div>
                        </div>

                        <div>
                            <label className="lbl" style={{ marginBottom: '8px', display: 'block', fontWeight: 800, fontSize: '13px', color: 'var(--slate-700)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                Descripción breve de la empresa
                            </label>
                            <textarea
                                className="inp"
                                placeholder="Ej: Empresa de telecomunicaciones especializada en servicios avanzados de telefonía IP para empresas."
                                value={companyDescription}
                                onChange={(e) => updateField('companyDescription', e.target.value)}
                                rows={4}
                                style={{ 
                                    resize: 'none', 
                                    padding: '20px 24px', 
                                    borderRadius: '20px', 
                                    border: '1px solid var(--slate-100)',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    lineHeight: '1.6',
                                    background: 'white',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                                }}
                            />
                            <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--slate-400)', fontWeight: 500, lineHeight: '1.4' }}>
                                1–2 frases. El agente la usará para contextualizar la empresa y sus servicios durante las conversaciones.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-between" style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '40px' }}>
                    <div />
                    <button 
                        type="submit" 
                        className="btn-p" 
                        disabled={!agentName.trim() || !companyName.trim()}
                        style={{ 
                            height: '56px', 
                            padding: '0 48px', 
                            borderRadius: '18px', 
                            fontWeight: 900,
                            boxShadow: '0 15px 30px -10px rgba(37, 99, 235, 0.4)',
                            transition: 'all 0.2s'
                        }}
                    >
                        Siguiente
                        <i className="bi bi-arrow-right" style={{ marginLeft: '12px', fontSize: '18px' }}></i>
                    </button>
                </div>
            </form>
        </div>
    );
};
