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
        <aside className="wizard-sidebar-v2" style={{ background: '#fff', borderRight: '1px solid var(--slate-100)', width: '320px', display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative', zIndex: 100 }}>
            <div style={{ padding: '32px 24px', marginBottom: '8px' }}>
                <Link href="/dashboard/agents" className="flex items-center gap-2 mb-6 text-slate-400 hover:text-azul transition-all text-[13px] font-bold no-underline group">
                    <i className="bi bi-arrow-left group-hover:-translate-x-1 transition-transform"></i>
                    Volver al panel
                </Link>
                <div style={{ background: 'var(--azul-light)', display: 'inline-flex', padding: '6px 12px', borderRadius: '8px', color: 'var(--azul)', fontSize: '10px', fontWeight: 800, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Asistente Inteligente
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--slate-900)', margin: 0, letterSpacing: '-0.02em', lineHeight: '1.1' }}>
                    {useWizardStore.getState().editingAgentId ? 'Configurar Agente' : 'Nuevo Agente IA'}
                </h2>
            </div>

            <nav style={{ flex: 1, padding: '0 8px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '16px 20px 8px 20px' }}>
                    Pasos de configuración
                </div>
                {stepsMeta.map((step) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    
                    return (
                        <div 
                            key={step.id} 
                            onClick={() => (isCompleted || isActive) && setStep(step.id)}
                            className={`nav-item-v2 ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                            style={{ 
                                padding: '14px 20px',
                                margin: '2px 12px',
                                borderRadius: '14px',
                                opacity: isCompleted || isActive ? 1 : 0.6
                            }}
                        >
                            <div className="step-number-v2" style={{
                                width: '28px',
                                height: '28px',
                                fontSize: '12px',
                                flexShrink: 0
                            }}>
                                {isCompleted ? <i className="bi bi-check-lg" style={{ fontSize: '16px' }} /> : step.id}
                            </div>
                            <span style={{ fontSize: '14px', letterSpacing: '-0.01em' }}>{step.name}</span>
                        </div>
                    );
                })}
            </nav>

            <div style={{ padding: '24px', background: '#f8fafc', borderTop: '1px solid var(--slate-100)' }}>
                <div className="flex justify-between items-center mb-3">
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tu progreso</span>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--azul)' }}>{progressPercent}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--slate-200)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ 
                        width: `${progressPercent}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, var(--azul), #6366f1)',
                        borderRadius: '10px',
                        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}></div>
                </div>
                <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--slate-400)', fontWeight: 500, fontStyle: 'italic', textAlign: 'center' }}>
                    {progressPercent === 100 ? '¡Listo para activar!' : 'Casi a la mitad...'}
                </div>
            </div>
        </aside>
    );
};
