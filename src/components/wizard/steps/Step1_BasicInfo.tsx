"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';

const AGENT_TYPE_OPTIONS = [
    { value: 'cualificacion', label: 'Cualificación de leads' },
    { value: 'agendamiento', label: 'Agendamiento de citas' },
    { value: 'atencion_cliente', label: 'Atención al cliente' },
    { value: 'ventas', label: 'Ventas y captación' },
    { value: 'informacion', label: 'Información y consultas' },
];

export const Step1_BasicInfo: React.FC = () => {
    const { agentName, companyName, companyDescription, agentType, updateField, nextStep } = useWizardStore();

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (agentName.trim() && companyName.trim()) nextStep();
    };

    return (
        <form onSubmit={handleNext}>
            <div className="form-card">
                <div className="form-title">Información básica del agente</div>
                <div className="form-sub">Dinos cómo se llamará tu agente y a qué empresa representa.</div>

                <div className="fg">
                    <label className="lbl" htmlFor="inp-nombre-agente">
                        Nombre del agente <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                        className="inp"
                        id="inp-nombre-agente"
                        placeholder="Ej: Elio, Sofía..."
                        value={agentName}
                        onChange={(e) => updateField('agentName', e.target.value)}
                        required
                    />
                    <div className="hint">Este nombre se usará en la interfaz y en los informes.</div>
                </div>

                <div className="fg">
                    <label className="lbl" htmlFor="inp-nombre-empresa">
                        Nombre de la empresa <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                        className="inp"
                        id="inp-nombre-empresa"
                        placeholder="Ej: Clínica García"
                        value={companyName}
                        onChange={(e) => updateField('companyName', e.target.value)}
                        required
                    />
                    <div className="hint">El agente lo usará para identificarse en las llamadas.</div>
                </div>

                <div className="fg">
                    <label className="lbl" htmlFor="inp-desc-empresa">
                        Descripción breve de la empresa
                    </label>
                    <textarea
                        className="inp"
                        id="inp-desc-empresa"
                        rows={3}
                        placeholder="Ej: Empresa de telecomunicaciones especializada en..."
                        value={companyDescription}
                        onChange={(e) => updateField('companyDescription', e.target.value)}
                    />
                    <div className="hint">1–2 frases. El agente la usará para contextualizar la empresa en conversaciones.</div>
                </div>

                <div className="fg">
                    <label className="lbl" htmlFor="sel-agent-type">
                        Tipo de agente <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <select
                        className="inp sel"
                        id="sel-agent-type"
                        value={agentType}
                        onChange={(e) => updateField('agentType', e.target.value)}
                    >
                        {AGENT_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <div className="hint">Define el objetivo principal del agente. Esto configura el flujo de la llamada.</div>
                </div>

                <div className="wiz-footer">
                    <div></div>
                    <button
                        type="submit"
                        className="btn-p"
                        disabled={!agentName.trim() || !companyName.trim()}
                    >
                        Siguiente <i className="bi bi-arrow-right"></i>
                    </button>
                </div>
            </div>
        </form>
    );
};
