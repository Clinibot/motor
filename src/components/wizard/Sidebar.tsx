"use client";

import React from 'react';
import Link from 'next/link';
import { useWizardStore } from '../../store/wizardStore';

const stepsMeta = [
    { id: 1, name: 'Información básica', desc: 'Nombre y empresa' },
    { id: 2, name: 'Configuración LLM', desc: 'Modelo y tono' },
    { id: 3, name: 'Selección de voz', desc: 'Voz del agente' },
    { id: 4, name: 'Audio y STT', desc: 'Volumen y ambiente' },
    { id: 5, name: 'Herramientas', desc: 'Integraciones y funciones' },
    { id: 6, name: 'Resumen', desc: 'Revisar y finalizar' },
];

export const Sidebar: React.FC = () => {
    const currentStep = useWizardStore((state) => state.currentStep);
    const setStep = useWizardStore((state) => state.setStep);
    const isSidebarOpen = useWizardStore((state) => state.isSidebarOpen);

    return (
        <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <Link href="/dashboard" className="back-link">
                    <i className="bi bi-arrow-left"></i> Volver al dashboard
                </Link>
                <h2 className="wizard-title">Crear agente IA</h2>
                <p className="wizard-subtitle">Sigue los 6 pasos para configurar tu agente</p>
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
