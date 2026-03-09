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
        if (currentStep === 4) return !voiceId;
        if (currentStep === 9) return true;
        return false;
    };

    const isPrevDisabled = currentStep === 1;

    return (
        <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        {title}
                        {tooltipContent && (
                            <span className="custom-tooltip">
                                <i className={`bi ${tooltipIcon} tooltip-icon`}></i>
                                <span className="tooltip-content">
                                    {tooltipContent}
                                </span>
                            </span>
                        )}
                    </h1>
                </div>

                {showArrows && (
                    <div className="wizard-top-nav" style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                        <button
                            type="button"
                            onClick={prevStep}
                            disabled={isPrevDisabled}
                            className={`nav-arrow-btn ${isPrevDisabled ? 'disabled' : ''}`}
                            title="Paso anterior"
                            style={{
                                background: 'none',
                                border: '1px solid var(--gris-borde)',
                                borderRadius: '8px',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: isPrevDisabled ? 'not-allowed' : 'pointer',
                                color: isPrevDisabled ? 'var(--gris-texto)' : 'var(--netelip-azul)',
                                opacity: isPrevDisabled ? 0.4 : 1,
                                transition: 'all 0.2s',
                                padding: 0
                            }}
                        >
                            <i className="bi bi-chevron-left" style={{ fontSize: '18px' }}></i>
                        </button>
                        <button
                            type="button"
                            onClick={nextStep}
                            disabled={isNextDisabled()}
                            className={`nav-arrow-btn ${isNextDisabled() ? 'disabled' : ''}`}
                            title="Siguiente paso"
                            style={{
                                background: 'none',
                                border: '1px solid var(--gris-borde)',
                                borderRadius: '8px',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: isNextDisabled() ? 'not-allowed' : 'pointer',
                                color: isNextDisabled() ? 'var(--gris-texto)' : 'var(--netelip-azul)',
                                opacity: isNextDisabled() ? 0.4 : 1,
                                transition: 'all 0.2s',
                                padding: 0
                            }}
                        >
                            <i className="bi bi-chevron-right" style={{ fontSize: '18px' }}></i>
                        </button>
                    </div>
                )}
            </div>
            <p className="section-subtitle" style={{ marginTop: '8px', marginBottom: 0 }}>
                {subtitle}
            </p>
        </div>
    );
};
