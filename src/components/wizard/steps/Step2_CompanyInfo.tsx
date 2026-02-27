"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step2_CompanyInfo: React.FC = () => {
    const {
        companyAddress, companyPhone, companyWebsite, companyDescription, businessHours,
        updateField, prevStep, nextStep
    } = useWizardStore();

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        nextStep();
    };

    const updateHour = (index: number, field: 'open' | 'close' | 'closed', value: string | boolean) => {
        const newHours = businessHours.map((h, i) =>
            i === index ? { ...h, [field]: value } : h
        );
        updateField('businessHours', newHours);
    };

    return (
        <div className="content-area">
            <div className="form-card">
                <h1 className="section-title">
                    Información de la empresa
                    <div className="custom-tooltip">
                        <i className="bi bi-info-circle tooltip-icon"></i>
                        <div className="tooltip-content">
                            Estos datos ayudarán a tu agente a responder preguntas sobre la ubicación, contacto y disponibilidad de tu negocio de forma precisa.
                        </div>
                    </div>
                </h1>
                <p className="section-subtitle">
                    Configura los detalles de contacto y horarios comerciales.
                </p>

                <form onSubmit={handleNext}>
                    {/* SECCIÓN 1: DATOS BÁSICOS */}
                    <div className="row">
                        <div className="col-md-6">
                            <div className="form-group">
                                <label className="form-label">Dirección física</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={companyAddress}
                                    onChange={(e) => updateField('companyAddress', e.target.value)}
                                    placeholder="Calle Ejemplo 123, Madrid"
                                />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="form-group">
                                <label className="form-label">Teléfono de contacto</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={companyPhone}
                                    onChange={(e) => updateField('companyPhone', e.target.value)}
                                    placeholder="+34 900 000 000"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-6">
                            <div className="form-group">
                                <label className="form-label">Sitio Web</label>
                                <input
                                    type="url"
                                    className="form-control"
                                    value={companyWebsite}
                                    onChange={(e) => updateField('companyWebsite', e.target.value)}
                                    placeholder="https://www.tuempresa.com"
                                />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="form-group">
                                <label className="form-label">Descripción corta (opcional)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={companyDescription}
                                    onChange={(e) => updateField('companyDescription', e.target.value)}
                                    placeholder="Clínica dental especializada en..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 2: HORARIOS */}
                    <div className="form-group mt-4">
                        <label className="form-label mb-3">
                            Horarios de atención
                        </label>
                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--gris-borde)' }}>
                            {businessHours.map((item, index) => (
                                <div key={item.day} className="row align-items-center mb-2">
                                    <div className="col-3">
                                        <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.day}</span>
                                    </div>
                                    <div className="col-7">
                                        <div className="d-flex align-items-center gap-2">
                                            <input
                                                type="time"
                                                className="form-control form-control-sm"
                                                value={item.open}
                                                disabled={item.closed}
                                                onChange={(e) => updateHour(index, 'open', e.target.value)}
                                            />
                                            <span className="text-muted">a</span>
                                            <input
                                                type="time"
                                                className="form-control form-control-sm"
                                                value={item.close}
                                                disabled={item.closed}
                                                onChange={(e) => updateHour(index, 'close', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-2 text-end">
                                        <div className="form-check form-switch d-inline-block">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={!item.closed}
                                                onChange={(e) => updateHour(index, 'closed', !e.target.checked)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="wizard-actions mt-5">
                        <button type="button" className="btn btn-secondary" onClick={prevStep}>
                            <i className="bi bi-arrow-left"></i> Anterior
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Siguiente paso <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
