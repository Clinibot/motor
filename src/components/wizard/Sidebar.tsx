"use client";

import React from 'react';
import Link from 'next/link';
import { useWizardStore } from '../../store/wizardStore';

const stepsMeta = [
    { id: 1, name: 'Información básica', icon: 'bi-info-circle' },
    { id: 2, name: 'Cerebro (LLM)', icon: 'bi-cpu' },
    { id: 3, name: 'Voz', icon: 'bi-mic' },
    { id: 4, name: 'Audio', icon: 'bi-volume-up' },
    { id: 5, name: 'Herramientas', icon: 'bi-tools' },
    { id: 6, name: 'Resumen', icon: 'bi-check2-circle' },
];

export const Sidebar: React.FC = () => {
    const currentStep = useWizardStore((state) => state.currentStep);
    const setStep = useWizardStore((state) => state.setStep);
    
    // Calcular porcentaje
    const progressPercent = Math.round(((currentStep - 1) / (stepsMeta.length - 1)) * 100);

    return (
        <aside className="sidebar" style={{ background: 'var(--blanco)', borderRight: '1px solid var(--gris-borde)', zIndex: 100 }}>
            {/* Header */}
            <div style={{ padding: '40px 32px 32px' }}>
                <Link href="/dashboard" className="flex-center gap-8" style={{ color: 'var(--gris-texto)', textDecoration: 'none', marginBottom: '12px', fontSize: '12px', fontWeight: 600 }}>
                    <i className="bi bi-arrow-left"></i>
                    VOLVER AL DASHBOARD
                </Link>
                <div className="logo-box" style={{ padding: 0, marginBottom: '0' }}>
                    <div className="logo-text" style={{ color: 'var(--oscuro)', fontSize: '20px' }}>
                        Configuración<span>Agente</span>
                    </div>
                </div>
            </div>

            {/* Steps Container */}
            <div className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
                {stepsMeta.map((step) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    const isPending = currentStep < step.id;
                    
                    return (
                        <div 
                            key={step.id} 
                            onClick={() => isCompleted && setStep(step.id)}
                            className={`nav-link ${isActive ? 'active' : ''}`}
                            style={{ 
                                cursor: isCompleted ? 'pointer' : 'default',
                                opacity: isPending ? 0.6 : 1,
                                background: isActive ? 'var(--azul-light)' : 'transparent',
                                borderLeft: isActive ? '4px solid var(--azul)' : '4px solid transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '16px 28px'
                            }}
                        >
                            {/* Circle Indicator */}
                            <div className={`flex-center`} style={{ 
                                width: '28px', 
                                height: '28px', 
                                borderRadius: '50%',
                                background: isCompleted ? 'var(--exito)' : (isActive ? 'var(--azul)' : 'var(--gris-bg)'),
                                color: (isCompleted || isActive) ? 'var(--blanco)' : 'var(--gris-texto)',
                                fontSize: '12px',
                                fontWeight: 700,
                                transition: 'all 0.3s'
                            }}>
                                {isCompleted ? (
                                    <i className="bi bi-check-lg"></i>
                                ) : (
                                    step.id
                                )}
                            </div>
                            
                            {/* Text Info */}
                            <div style={{ 
                                fontSize: '14px', 
                                fontWeight: isActive ? 700 : 500, 
                                color: isActive ? 'var(--azul)' : (isCompleted ? 'var(--oscuro)' : 'var(--gris-texto)'),
                            }}>
                                {step.name}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer / Progress Bar */}
            <div style={{ padding: '24px 32px', borderTop: '1px solid var(--gris-borde)' }}>
                <div className="flex-between" style={{ marginBottom: '10px' }}>
                    <span className="lbl" style={{ margin: 0, fontSize: '11px' }}>PROGRESO</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--azul)' }}>{progressPercent}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--gris-bg)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ 
                        width: `${progressPercent}%`, 
                        height: '100%', 
                        background: 'var(--azul)',
                        borderRadius: '10px',
                        transition: 'width 0.5s ease-in-out'
                    }}></div>
                </div>
            </div>
        </aside>
    );
};
