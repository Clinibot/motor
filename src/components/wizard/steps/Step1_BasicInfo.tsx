"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';

export const Step1_BasicInfo: React.FC = () => {
    const { agentName, companyName, companyDescription, updateField, nextStep } = useWizardStore();

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (agentName.trim() === '') return;
        nextStep();
    };

    return (
        <div className="content-area">
            <div className="form-card">
                <form onSubmit={handleNext}>
                    {/* SECCIÓN: INFORMACIÓN BÁSICA DEL AGENTE */}
                    <div style={{ marginBottom: '40px' }}>
                        <WizardStepHeader
                            title="Información básica del agente"
                            subtitle="Dinos cómo se llamará tu agente y a qué empresa representa."
                        />

                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', marginBottom: '8px', fontSize: '14px', display: 'block' }}>
                                Nombre del agente <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Mi agente"
                                value={agentName}
                                onChange={(e) => updateField('agentName', e.target.value)}
                                required
                                style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', fontWeight: 500, width: '100%' }}
                            />
                            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '8px' }}>
                                Este nombre se usará en la interfaz y en los informes.
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', marginBottom: '8px', fontSize: '14px', display: 'block' }}>
                                Nombre de la empresa <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="netelip"
                                value={companyName}
                                onChange={(e) => updateField('companyName', e.target.value)}
                                required
                                style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', fontWeight: 500, width: '100%' }}
                            />
                            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '8px' }}>
                                El agente lo usará para identificarse en las llamadas.
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', marginBottom: '8px', fontSize: '14px', display: 'block' }}>
                                Descripción breve de la empresa
                            </label>
                            <textarea
                                className="form-control"
                                placeholder="Empresa de telecomunicaciones especializada en centralitas virtuales y soluciones de voz para empresas."
                                value={companyDescription}
                                onChange={(e) => updateField('companyDescription', e.target.value)}
                                rows={3}
                                style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', resize: 'vertical', width: '100%' }}
                            />
                            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '8px' }}>
                                1–2 frases. El agente la usará para contextualizar la empresa en conversaciones.
                            </div>
                        </div>
                    </div>

                    <div className="wizard-actions" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary" disabled={!agentName.trim()} style={{
                            background: '#2e86c1', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            Siguiente <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
