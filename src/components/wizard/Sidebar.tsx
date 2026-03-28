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
    
    // Calcular porcentaje
    const progressPercent = Math.round(((currentStep - 1) / (stepsMeta.length - 1)) * 100);

    return (
        <div className="sidebar" style={{ 
            width: '320px', 
            height: '100vh', 
            background: 'white', 
            borderRight: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 10
        }}>
            {/* Header */}
            <div style={{ padding: '32px 32px 24px' }}>
                <Link href="/dashboard/agents" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    textDecoration: 'none',
                    color: '#64748b',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '20px',
                    transition: 'all 0.2s'
                }}>
                    <i className="bi bi-arrow-left" style={{ fontSize: '18px' }}></i>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>Crear agente IA</span>
                </Link>
                <Link href="/dashboard/agents" style={{ 
                    fontSize: '14px', 
                    color: '#94a3b8', 
                    textDecoration: 'none', 
                    fontWeight: 500,
                    display: 'block',
                    marginLeft: '30px'
                }}>
                    Volver al dashboard
                </Link>
            </div>

            {/* Steps Container */}
            <div style={{ padding: '20px 0', flex: 1, overflowY: 'auto' }}>
                <div style={{ position: 'relative' }}>
                    {stepsMeta.map((step) => {
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;
                        
                        return (
                            <div 
                                key={step.id} 
                                onClick={() => isCompleted && setStep(step.id)}
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    gap: '16px', 
                                    padding: '16px 32px',
                                    position: 'relative', 
                                    zIndex: 2,
                                    cursor: isCompleted ? 'pointer' : 'default',
                                    transition: 'all 0.2s',
                                    background: isActive ? '#f0f7ff' : 'transparent',
                                    borderLeft: isActive ? '4px solid #267ab0' : '4px solid transparent',
                                    marginLeft: isActive ? '0' : '0',
                                }}
                            >
                                {/* Circle Indicator */}
                                <div style={{ 
                                    width: '32px', 
                                    height: '32px', 
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    transition: 'all 0.3s',
                                    background: isActive ? '#267ab0' : (isCompleted ? '#10b981' : '#f1f5f9'),
                                    color: isActive || isCompleted ? 'white' : '#94a3b8',
                                    border: 'none',
                                }}>
                                    {isCompleted ? (
                                        <i className="bi bi-check-lg" style={{ fontSize: '16px' }}></i>
                                    ) : (
                                        step.id
                                    )}
                                </div>

                                {/* Text Info */}
                                <div style={{ 
                                    fontSize: '15px', 
                                    fontWeight: isActive ? 700 : 600, 
                                    color: isActive ? '#267ab0' : (isCompleted ? '#10b981' : '#94a3b8'),
                                    transition: 'all 0.2s'
                                }}>
                                    {step.name}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer / Progress Bar */}
            <div style={{ padding: '24px 32px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Progreso</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#267ab0' }}>{progressPercent}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ 
                        width: `${progressPercent}%`, 
                        height: '100%', 
                        background: '#267ab0',
                        borderRadius: '10px',
                        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}></div>
                </div>
            </div>
        </div>
    );
};
