"use client";

import React from 'react';
import Link from 'next/link';
import { useWizardStore } from '../../store/wizardStore';

const stepsMeta = [
    { id: 1, name: 'Información básica' },
    { id: 2, name: 'Cerebro (LLM)' },
    { id: 3, name: 'Voz' },
    { id: 4, name: 'Audio' },
    { id: 5, name: 'Herramientas' },
    { id: 6, name: 'Resumen' },
];

export const Sidebar: React.FC = () => {
    const currentStep = useWizardStore((state) => state.currentStep);
    const setStep = useWizardStore((state) => state.setStep);

    return (
        <aside style={{
            position: 'fixed',
            top: 0, left: 0, bottom: 0,
            width: '260px',
            background: 'white',
            borderRight: '1px solid var(--gris-borde)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
        }}>
            {/* Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid var(--gris-borde)' }}>
                <Link href="/dashboard/agents" style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '13px', fontWeight: 600, color: 'var(--gris-texto)',
                    textDecoration: 'none', marginBottom: '16px',
                    transition: 'color 0.15s',
                }}>
                    <i className="bi bi-arrow-left"></i>
                    Volver al dashboard
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '32px', height: '32px',
                        background: 'var(--azul)', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '14px', fontWeight: 800,
                    }}>
                        IA
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--oscuro)' }}>Crear agente IA</div>
                        <div style={{ fontSize: '11px', color: 'var(--gris-texto)' }}>Asistente de configuración</div>
                    </div>
                </div>
            </div>

            {/* Steps nav */}
            <nav style={{ flex: 1, paddingTop: '8px', overflowY: 'auto' }}>
                <div className="wiz-steps">
                    {stepsMeta.map((step) => {
                        const isActive = currentStep === step.id;
                        const isDone = currentStep > step.id;
                        const cls = `wiz-step${isActive ? ' active' : ''}${isDone ? ' done' : ''}`;

                        return (
                            <div
                                key={step.id}
                                className={cls}
                                onClick={() => (isDone || isActive) && setStep(step.id)}
                                style={{ cursor: isDone || isActive ? 'pointer' : 'default' }}
                            >
                                <div className="step-num">
                                    {isDone
                                        ? <i className="bi bi-check" style={{ fontSize: '10px' }}></i>
                                        : step.id}
                                </div>
                                {step.name}
                            </div>
                        );
                    })}
                </div>
            </nav>

            {/* Footer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--gris-borde)' }}>
                <div style={{ fontSize: '12px', color: 'var(--gris-texto)', lineHeight: 1.5 }}>
                    Paso {currentStep} de {stepsMeta.length}
                </div>
                <div style={{ marginTop: '8px', height: '4px', background: 'var(--gris-borde)', borderRadius: '2px' }}>
                    <div style={{
                        height: '100%',
                        width: `${((currentStep - 1) / (stepsMeta.length - 1)) * 100}%`,
                        background: 'var(--azul)',
                        borderRadius: '2px',
                        transition: 'width 0.3s ease',
                    }}></div>
                </div>
            </div>
        </aside>
    );
};
