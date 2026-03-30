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
    
    const progressPercent = Math.round(((currentStep - 1) / (stepsMeta.length - 1)) * 100);

    return (
        <aside className="sidebar">
            <div className="sidebar-header" style={{ paddingBottom: '24px' }}>
                <Link href="/dashboard/agents" className="flex items-center gap-2 mb-6 text-slate-400 hover:text-azul transition-colors text-[12px] font-bold no-underline uppercase tracking-wider">
                    <i className="bi bi-arrow-left"></i>
                    Volver a mis agentes
                </Link>
                
                <div className="sidebar-logo">
                    <div className="logo-box">
                        F<span>A</span>
                    </div>
                    <div className="flex flex-col">
                        <div className="logo-title">Configuración</div>
                        <div className="logo-subtitle">Asistente IA</div>
                    </div>
                </div>
            </div>

            <div className="sidebar-nav" style={{ padding: '0 16px' }}>
                <div className="nav-label" style={{ marginBottom: '16px' }}>Pasos de configuración</div>
                {stepsMeta.map((step) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    const isPending = currentStep < step.id;
                    
                    return (
                        <div 
                            key={step.id} 
                            onClick={() => isCompleted && setStep(step.id)}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                            style={{ 
                                cursor: isCompleted ? 'pointer' : 'default',
                                opacity: isPending ? 0.5 : 1,
                                padding: '12px 16px',
                                marginBottom: '4px'
                            }}
                        >
                            <div className="flex items-center gap-4 w-full">
                                <div style={{ 
                                    width: '28px', 
                                    height: '28px', 
                                    borderRadius: '8px',
                                    background: isCompleted ? 'var(--exito)' : (isActive ? 'var(--azul)' : 'var(--slate-100)'),
                                    color: (isCompleted || isActive) ? 'white' : 'var(--slate-400)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none'
                                }}>
                                    {isCompleted ? <i className="bi bi-check-lg" /> : step.id}
                                </div>
                                
                                <div style={{ 
                                    fontSize: '13px', 
                                    fontWeight: isActive ? 700 : 500,
                                    color: isActive ? 'var(--azul)' : (isPending ? 'var(--slate-400)' : 'var(--slate-700)')
                                }}>
                                    {step.name}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="sidebar-footer" style={{ padding: '24px' }}>
                <div className="flex justify-between items-center mb-3">
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '1px' }}>PROGRESO</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--azul)' }}>{progressPercent}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--slate-100)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ 
                        width: `${progressPercent}%`, 
                        height: '100%', 
                        background: 'var(--azul)',
                        borderRadius: '10px',
                        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}></div>
                </div>
            </div>
        </aside>
    );
};
