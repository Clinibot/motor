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
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => { setMounted(true); }, []);

    const currentStep = useWizardStore((state) => state.currentStep);
    const percentage = (currentStep / 9) * 100;
    const currentName = stepNames[currentStep - 1] || '';

    if (!mounted) return (
        <div className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div className="progress-text">Cargando...</div>
            </div>
            <div className="progress-bar-container" style={{ marginBottom: 0 }}>
                <div className="progress-bar-fill" style={{ width: `0%` }}></div>
            </div>
        </div>
    );

    return (
        <div className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '12px' }}>
                <div className="progress-text">Paso {currentStep} de 9 - {currentName}</div>
            </div>
            <div className="progress-bar-container" style={{ marginBottom: 0 }}>
                <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};
