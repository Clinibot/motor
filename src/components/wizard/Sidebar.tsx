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
        <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#fff', borderRight: '1px solid #e5e7eb' }}>
            <div className="sidebar-header" style={{ padding: '24px 20px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Crear agente IA</h2>
                </div>
                <Link href="/dashboard" style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none', marginLeft: '24px', display: 'block' }}>
                    Volver al dashboard
                </Link>
            </div>

            <div className="steps-container" style={{ padding: '20px 10px', flex: 1, overflowY: 'auto' }}>
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
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="sidebar-footer" style={{ padding: '20px', borderTop: '1px solid #e5e7eb', background: '#fff' }}>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500, marginBottom: '8px' }}>Paso {currentStep} de 6</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 4, 5, 6].map(step => (
                        <div key={step} style={{ height: '4px', flex: 1, background: step <= currentStep ? '#267ab0' : '#e5e7eb', borderRadius: '2px', transition: 'background 0.3s' }} />
                    ))}
                </div>
            </div>
        </div>
    );
};
