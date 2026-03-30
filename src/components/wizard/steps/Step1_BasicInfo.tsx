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
        <div className="content-area">
            <div className="form-card p-10">
                <form onSubmit={handleNext}>
                    <WizardStepHeader
                        title="Información básica del agente"
                        subtitle="Dinos cómo se llamará tu agente y a qué empresa representa."
                    />

                    <div style={{ display: 'grid', gap: '24px', marginBottom: '32px' }}>
                        <div>
                            <label className="lbl">
                                Nombre del agente <span style={{ color: 'var(--error)' }}>*</span>
                            </label>
                            <input
                                type="text"
                                className="inp"
                                placeholder="Ej: Asistente de Ventas"
                                value={agentName}
                                onChange={(e) => updateField('agentName', e.target.value)}
                                required
                            />
                            <div className="hint" style={{ marginTop: '4px' }}>
                                Este nombre se usará en la interfaz y en los informes.
                            </div>
                        </div>

                        <div>
                            <label className="lbl">
                                Nombre de la empresa <span style={{ color: 'var(--error)' }}>*</span>
                            </label>
                            <input
                                type="text"
                                className="inp"
                                placeholder="Ej: Netelip"
                                value={companyName}
                                onChange={(e) => updateField('companyName', e.target.value)}
                                required
                            />
                            <div className="hint" style={{ marginTop: '4px' }}>
                                El agente lo usará para identificarse en las llamadas.
                            </div>
                        </div>

                        <div>
                            <label className="lbl">
                                Descripción breve de la empresa
                            </label>
                            <textarea
                                className="inp"
                                placeholder="Ej: Empresa de telecomunicaciones especializada en centralitas virtuales..."
                                value={companyDescription}
                                onChange={(e) => updateField('companyDescription', e.target.value)}
                                rows={3}
                                style={{ resize: 'vertical' }}
                            />
                            <div className="hint" style={{ marginTop: '4px' }}>
                                1–2 frases. El agente la usará para contextualizar la empresa en conversaciones.
                            </div>
                        </div>
                    </div>

                    <div className="flex-between" style={{ borderTop: '1px solid var(--gris-borde)', paddingTop: '24px' }}>
                        <div />
                        <button 
                            type="submit" 
                            className="btn-p" 
                            disabled={!agentName.trim()}
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
