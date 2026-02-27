"use client";

import React from 'react';
import Link from 'next/link';
import { useWizardStore } from '../../store/wizardStore';

const stepsMeta = [
    { id: 1, name: 'Información básica', desc: 'Nombre y sector' },
    { id: 2, name: 'Configuración LLM', desc: 'Modelo y prompt' },
    { id: 3, name: 'Selección de voz', desc: 'Voz y personalidad' },
    { id: 4, name: 'Conversación', desc: 'Idioma y respuestas' },
    { id: 5, name: 'Tiempos', desc: 'Duraciones y delays' },
    { id: 6, name: 'Audio y STT', desc: 'Sonido ambiente' },
    { id: 7, name: 'Herramientas', desc: 'Integraciones' },
    { id: 8, name: 'Resumen', desc: 'Revisar y crear' },
];

export const Sidebar: React.FC = () => {
    const currentStep = useWizardStore((state) => state.currentStep);
    const setStep = useWizardStore((state) => state.setStep);

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <Link href="/dashboard" className="back-link">
                    <i className="bi bi-arrow-left"></i> Volver al dashboard
                </Link>
                <h2 className="wizard-title">Crear agente IA</h2>
                <p className="wizard-subtitle">Sigue los 8 pasos para configurar tu agente</p>
            </div>

            <div className="steps-container">
                {stepsMeta.map((step) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    // In a real wizard, you might not allow clicking ahead if not enabled, 
                    // but we will allow clicking completed ones to go backwards.
                    const isDisabled = currentStep < step.id;

                    let className = "step-item";
                    if (isActive) className += " active";
                    if (isCompleted) className += " completed";
                    if (isDisabled) className += " disabled";

                    return (
                        <div
                            key={step.id}
                            className={className}
                            onClick={() => {
                                if (!isDisabled) setStep(step.id);
                            }}
                        >
                            <div className="step-number">{step.id}</div>
                            <div className="step-info">
                                <span className="step-name">{step.name}</span>
                                <span className="step-desc">{step.desc}</span>
                            </div>
                            <i className="bi bi-chevron-right step-icon"></i>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
