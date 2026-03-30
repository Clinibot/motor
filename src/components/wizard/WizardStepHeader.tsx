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
        <div style={{ marginBottom: '32px' }}>
            <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <h1 className="form-title" style={{ margin: 0, fontSize: '24px' }}>
                            {title}
                        </h1>
                        {tooltipContent && (
                            <span className="custom-tooltip">
                                <i className={`bi ${tooltipIcon}`} style={{ color: 'var(--azul)', cursor: 'help' }}></i>
                                <span className="tooltip-content">
                                    {tooltipContent}
                                </span>
                            </span>
                        )}
                    </div>
                    <p className="lbl" style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
                        {subtitle}
                    </p>
                </div>

                {showArrows && (
                    <div className="flex-center gap-8" style={{ marginLeft: '16px' }}>
                        <button
                            type="button"
                            onClick={prevStep}
                            disabled={isPrevDisabled}
                            className="btn-s mini"
                            title="Anterior"
                            style={{ padding: '8px 12px', minWidth: '40px' }}
                        >
                            <i className="bi bi-chevron-left"></i>
                        </button>
                        <button
                            type="button"
                            onClick={nextStep}
                            disabled={isNextDisabled()}
                            className="btn-p mini"
                            title="Siguiente"
                            style={{ padding: '8px 12px', minWidth: '40px' }}
                        >
                            <i className="bi bi-chevron-right"></i>
                        </button>
                    </div>
                )}
            </div>
            
            <div style={{ height: '1px', background: 'var(--gris-borde)', marginTop: '24px' }}></div>
        </div>
    );
};
