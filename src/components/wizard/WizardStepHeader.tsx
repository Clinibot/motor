"use client";

import React from 'react';
import { useWizardStore } from '../../store/wizardStore';

interface WizardStepHeaderProps {
    title: string;
    subtitle: string;
    tooltipIcon?: string;
    tooltipContent?: React.ReactNode;
    showArrows?: boolean;
}

export const WizardStepHeader: React.FC<WizardStepHeaderProps> = ({
    title,
    subtitle,
    tooltipIcon = "bi-info-circle",
    tooltipContent,
    showArrows = true
}) => {
    const { currentStep, prevStep, nextStep, agentName, agentType, voiceId } = useWizardStore();

    const isNextDisabled = () => {
        if (currentStep === 1) return !agentName.trim() || !agentType;
        if (currentStep === 3) return !voiceId; // Corrigiendo paso de voz (era 4 en el original pero es 3 según stepsMeta)
        return false;
    };

    const isPrevDisabled = currentStep === 1;

    return (
        <div style={{ marginBottom: '40px' }}>
            <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <h1 className="form-title" style={{ margin: '0 0 12px 0', fontSize: '28px', fontWeight: 800, color: 'var(--slate-900)', letterSpacing: '-0.5px' }}>
                        {title}
                        {tooltipContent && (
                            <span className="custom-tooltip" style={{ marginLeft: '12px', verticalAlign: 'middle' }}>
                                <i className={`bi ${tooltipIcon}`} style={{ color: 'var(--azul)', cursor: 'help', fontSize: '18px' }}></i>
                                <span className="tooltip-content">
                                    {tooltipContent}
                                </span>
                            </span>
                        )}
                    </h1>
                    <p style={{ margin: 0, fontSize: '15px', color: 'var(--slate-500)', lineHeight: 1.6 }}>
                        {subtitle}
                    </p>
                </div>

                {showArrows && (
                    <div className="flex-center gap-8" style={{ marginLeft: '16px', paddingTop: '8px' }}>
                        <button
                            type="button"
                            onClick={prevStep}
                            disabled={isPrevDisabled}
                            className="btn-p"
                            title="Anterior"
                            style={{ 
                                padding: '10px 14px', 
                                background: isPrevDisabled ? 'var(--slate-50)' : 'white',
                                border: '1px solid var(--slate-100)',
                                color: isPrevDisabled ? 'var(--slate-300)' : 'var(--slate-600)',
                                borderRadius: '10px'
                            }}
                        >
                            <i className="bi bi-chevron-left"></i>
                        </button>
                        <button
                            type="button"
                            onClick={nextStep}
                            disabled={isNextDisabled()}
                            className="btn-p"
                            title="Siguiente"
                            style={{ padding: '10px 16px', borderRadius: '10px' }}
                        >
                            <span style={{ marginRight: '8px', fontSize: '14px' }}>Siguiente</span>
                            <i className="bi bi-chevron-right"></i>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
