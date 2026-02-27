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
    'Audio y STT',
    'Herramientas',
    'Resumen y Creación',
];

export const Topbar: React.FC = () => {
    const currentStep = useWizardStore((state) => state.currentStep);
    const percentage = (currentStep / 9) * 100;
    const currentName = stepNames[currentStep - 1] || '';

    return (
        <div className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div className="progress-text">Paso {currentStep} de 9 - {currentName}</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/netelip-logo.png"
                    alt="Netelip"
                    style={{ height: '28px', objectFit: 'contain' }}
                />
            </div>
            <div className="progress-bar-container" style={{ marginBottom: 0 }}>
                <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};
