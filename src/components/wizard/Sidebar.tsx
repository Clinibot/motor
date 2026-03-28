"use client";

import React from 'react';
import Link from 'next/link';
import { useWizardStore } from '../../store/wizardStore';

const stepsMeta = [
    { id: 1, name: 'Información básica', desc: 'Nombre y empresa' },
    { id: 2, name: 'Personalidad y tono', desc: 'Modelo y comportamiento' },
    { id: 3, name: 'Voz del agente', desc: 'Selección de voz' },
    { id: 4, name: 'Configuración de audio', desc: 'Volumen y ambiente' },
    { id: 5, name: 'Herramientas', desc: 'Funcionalidades' },
    { id: 6, name: 'Resumen y confirmación', desc: 'Revisar y finalizar' },
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
            <div style={{ padding: '32px 24px 24px' }}>
                <Link href="/dashboard/agents" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    textDecoration: 'none',
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '20px'
                }}>
                    <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '10px', 
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'white'
                    }}>
                        <i className="bi bi-chevron-left" style={{ fontSize: '14px' }}></i>
                    </div>
                    Volver
                </Link>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', margin: 0 }}>Crear agente IA</h1>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>Configuración paso a paso</p>
            </div>

            {/* Steps Container */}
            <div style={{ padding: '10px 24px', flex: 1, overflowY: 'auto' }}>
                <div style={{ position: 'relative' }}>
                    {/* Vertical Line Connector */}
                    <div style={{ 
                        position: 'absolute', 
                        left: '17px', 
                        top: '20px', 
                        bottom: '20px', 
                        width: '2px', 
                        background: '#f1f5f9',
                        zIndex: 1
                    }}></div>

                    {stepsMeta.map((step) => {
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;
                        
                        return (
                            <div 
                                key={step.id} 
                                onClick={() => isCompleted && setStep(step.id)}
                                style={{ 
                                    display: 'flex', 
                                    gap: '16px', 
                                    marginBottom: '32px', 
                                    position: 'relative', 
                                    zIndex: 2,
                                    cursor: isCompleted ? 'pointer' : 'default',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {/* Circle Indicator */}
                                <div style={{ 
                                    width: '36px', 
                                    height: '36px', 
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    transition: 'all 0.3s',
                                    background: isActive ? '#267ab0' : (isCompleted ? '#10b981' : 'white'),
                                    color: isActive || isCompleted ? 'white' : '#94a3b8',
                                    border: isActive || isCompleted ? 'none' : '2px solid #f1f5f9',
                                    boxShadow: isActive ? '0 0 0 4px rgba(38, 122, 176, 0.15)' : 'none'
                                }}>
                                    {isCompleted ? <i className="bi bi-check-lg"></i> : step.id}
                                </div>

                                {/* Text Info */}
                                <div style={{ paddingTop: '4px' }}>
                                    <div style={{ 
                                        fontSize: '14px', 
                                        fontWeight: 700, 
                                        color: isActive ? '#1e293b' : (isCompleted ? '#475569' : '#94a3b8'),
                                        lineHeight: 1.2
                                    }}>
                                        {step.name}
                                    </div>
                                    <div style={{ 
                                        fontSize: '11px', 
                                        color: isActive ? '#267ab0' : '#cbd5e1',
                                        fontWeight: 600,
                                        marginTop: '4px'
                                    }}>
                                        {step.desc}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer / Progress Bar */}
            <div style={{ padding: '24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Progreso</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#267ab0' }}>{progressPercent}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'white', borderRadius: '10px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                    <div style={{ 
                        width: `${progressPercent}%`, 
                        height: '100%', 
                        background: `linear-gradient(90deg, #267ab0 0%, #3b82f6 100%)`,
                        borderRadius: '10px',
                        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}></div>
                </div>
            </div>
        </div>
    );
};
