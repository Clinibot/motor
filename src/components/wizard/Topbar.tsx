"use client";

import React from 'react';
import { useWizardStore } from '../../store/wizardStore';

const stepNames = [
    'Información básica',
    'Configuración LLM',
    'Selección de voz',
    'Conversación',
    'Tiempos',
    'Audio y STT',
    'Herramientas',
    'Resumen y Creación',
];

export const Topbar: React.FC = () => {
    const currentStep = useWizardStore((state) => state.currentStep);
    const percentage = (currentStep / 8) * 100;
    const currentName = stepNames[currentStep - 1] || '';

    return (
        <div className="topbar">
            <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
            </div>
            <div className="progress-text">Paso {currentStep} de 8 - {currentName}</div>
        </div>
    );
};
