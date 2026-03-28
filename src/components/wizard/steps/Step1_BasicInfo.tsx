"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';

export const Step1_BasicInfo: React.FC = () => {
    const { agentName, companyName, companyDescription, updateField, nextStep } = useWizardStore();

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (agentName.trim() === '') return;
        nextStep();
    };

    return (
        <div className="content-area">
            <div className="form-card">
                <form onSubmit={handleNext}>
                    {/* SECCIÓN: INFORMACIÓN BÁSICA DEL AGENTE */}
                    <div style={{ marginBottom: '48px' }}>
                        <WizardStepHeader
                            title="Información básica del agente"
                            subtitle="Empecemos con los datos fundamentales. Esta información personaliza todo el comportamiento de tu agente."
                            tooltipContent={
                                <>
                                    <strong>Configuración inicial.</strong> Estos datos son la base sobre la que se construye la identidad de tu agente.
                                </>
                            }
                            showArrows={true}
                        />

                        <div className="row">
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', fontWeight: 600, color: 'var(--oscuro)', marginBottom: '8px', fontSize: '14px' }}>
                                        ¿Cómo se llamará tu agente?
                                        <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                                        <div className="custom-tooltip">
                                            <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                            <div className="tooltip-content shadow">
                                                <strong>Nombre del agente</strong><br />
                                                Este será el nombre con el que tu agente se presentará en todas las llamadas.
                                                <br /><br />
                                                <strong>Ejemplo:</strong> &quot;Hola, soy Sofia de Netelip&quot;
                                                <br /><br />
                                                <strong>Tips:</strong><br />
                                                • Nombres cortos (2-3 sílabas)<br />
                                                • Fáciles de pronunciar<br />
                                                • Evita nombres técnicos
                                            </div>
                                        </div>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Ej: Sofia, Carlos, Laura..."
                                        value={agentName}
                                        onChange={(e) => updateField('agentName', e.target.value)}
                                        required
                                        style={{ border: '1px solid var(--gris-borde)', borderRadius: '8px', padding: '11px 14px', fontSize: '14px', fontWeight: 500 }}
                                    />
                                    <div style={{ color: 'var(--gris-texto)', fontSize: '13px', marginTop: '6px' }}>
                                        <i className="bi bi-lightbulb me-1"></i>
                                        Este nombre aparecerá en todas las interacciones con clientes
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', fontWeight: 600, color: 'var(--oscuro)', marginBottom: '8px', fontSize: '14px' }}>
                                        Nombre de tu empresa
                                        <div className="custom-tooltip">
                                            <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                            <div className="tooltip-content shadow">
                                                <strong>Nombre de la empresa</strong><br />
                                                El agente usará este nombre para presentar tu empresa.
                                                <br /><br />
                                                <strong>Ejemplo:</strong> &quot;Hola, soy Sofia de Netelip&quot;
                                                <br /><br />
                                                Si lo dejas vacío, el agente no mencionará el nombre de la empresa.
                                            </div>
                                        </div>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Ej: netelip, Garabato, UX-AI."
                                        value={companyName}
                                        onChange={(e) => updateField('companyName', e.target.value)}
                                        style={{ border: '1px solid var(--gris-borde)', borderRadius: '8px', padding: '11px 14px', fontSize: '14px', fontWeight: 500 }}
                                    />
                                    <div style={{ color: 'var(--gris-texto)', fontSize: '13px', marginTop: '6px' }}>
                                        <i className="bi bi-building me-1"></i>
                                        Se usará en las interacciones con el cliente en el prompt
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ margin: '32px 0 48px 0' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', fontWeight: 600, color: 'var(--oscuro)', marginBottom: '8px', fontSize: '14px' }}>
                                Descripción corta de la empresa
                                <div className="custom-tooltip">
                                    <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                    <div className="tooltip-content shadow">
                                        <strong>Descripción de la empresa</strong><br />
                                        Un resumen claro y directo de a qué se dedica tu empresa y qué servicios u opciones ofrece. Esto ayuda al agente a entender el contexto general. No incluyas información demasiado técnica o extensa aquí. 
                                        <br /><br />
                                        <strong>Ejemplo:</strong> &quot;Somos una clínica dental especializada en implantes y ortodoncia invisible. Ofrecemos primeras visitas gratuitas.&quot;
                                    </div>
                                </div>
                            </label>
                            <textarea
                                className="form-control"
                                placeholder="Ej: Somos una clínica dental especializada en implantes y ortodoncia invisible. Ofrecemos primeras visitas gratuitas."
                                value={companyDescription}
                                onChange={(e) => updateField('companyDescription', e.target.value)}
                                rows={3}
                                style={{ border: '1px solid var(--gris-borde)', borderRadius: '8px', padding: '11px 14px', fontSize: '14px', resize: 'vertical' }}
                            />
                            <div style={{ color: 'var(--gris-texto)', fontSize: '13px', marginTop: '6px' }}>
                                <i className="bi bi-card-text me-1"></i>
                                Ayudará al agente a entender el contexto general de tu negocio.
                            </div>
                        </div>
                    </div>

                    <div className="wizard-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => window.location.href = '/dashboard'}>
                            <i className="bi bi-arrow-left"></i> Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!agentName.trim()}>
                            Siguiente paso <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form >
            </div >

        </div >
    );
};
