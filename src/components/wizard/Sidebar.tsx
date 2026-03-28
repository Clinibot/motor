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
            <div style={{ padding: '40px 32px 32px' }}>
                <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fábrica de Agentes</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <Link href="/dashboard/agents" style={{ color: '#1e293b', textDecoration: 'none' }}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '20px' }}></i>
                    </Link>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>Configuración de Agente</span>
                </div>
            </div>

            {/* Steps Container */}
            <div style={{ padding: '0', flex: 1, overflowY: 'auto' }}>
                <div style={{ position: 'relative' }}>
                    {stepsMeta.map((step) => {
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;
                        const isPending = currentStep < step.id;
                        
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
                                    borderRight: isActive ? '4px solid #267ab0' : 'none',
                                }}
                            >
                                {/* Circle Indicator */}
                                <div style={{ 
                                    width: '24px', 
                                    height: '24px', 
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s',
                                    background: isActive ? '#267ab0' : (isCompleted ? '#10b981' : 'transparent'),
                                    border: isPending ? '2px solid #e2e8f0' : (isActive || isCompleted ? 'none' : 'none'),
                                    boxShadow: isActive ? '0 0 0 4px rgba(38, 122, 176, 0.15)' : 'none'
                                }}>
                                    {isCompleted ? (
                                        <i className="bi bi-check-lg" style={{ fontSize: '14px', color: 'white', fontWeight: 900 }}></i>
                                    ) : isActive ? (
                                        <div style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%' }}></div>
                                    ) : null}
                                </div>
                                
                                {/* Text Info */}
                                <div style={{ 
                                    fontSize: '15px', 
                                    fontWeight: isActive ? 700 : 500, 
                                    color: isActive ? '#267ab0' : (isCompleted ? '#475569' : '#94a3b8'),
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
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Progreso</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#267ab0' }}>{progressPercent}%</span>
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
