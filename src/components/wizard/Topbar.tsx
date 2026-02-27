"use client";

import React from 'react';
import { useWizardStore } from '../../store/wizardStore';

const stepNames = [
    'Información básica',
    'Configuración LLM',
    'Información de la empresa',
    'Selección de voz',
    'Conversación',
    'Tiempos',
    'Configuración avanzada',
    'Resumen y Creación',
];

export const Topbar: React.FC = () => {
    const currentStep = useWizardStore((state) => state.currentStep);
    const toggleSidebar = useWizardStore((state) => state.toggleSidebar);
    const percentage = (currentStep / 8) * 100;
    const currentName = stepNames[currentStep - 1] || '';

    return (
        <div className="topbar">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <button
                    className="btn btn-sm d-md-none p-0 border-0"
                    onClick={toggleSidebar}
                    style={{ background: 'transparent' }}
                >
                    <i className="bi bi-list" style={{ fontSize: '24px', color: 'var(--netelip-azul)' }}></i>
                </button>
                <div className="progress-text">Paso {currentStep} de 8 - {currentName}</div>
                <div className="d-md-none" style={{ width: '24px' }}></div>
            </div>
            <div className="progress-bar-container" style={{ marginBottom: 0 }}>
                <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};
