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
                    Configura los detalles de contacto y horarios comerciales para que tu IA sea más útil.
                </p>

                <form onSubmit={handleNext}>
                    {/* SECCIÓN 1: DATOS BÁSICOS */}
                    <div className="step-section">
                        <div className="row g-4">
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="bi bi-geo-alt me-2 text-primary"></i>
                                        Dirección física
                                    </label>
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
                                    <label className="form-label">
                                        <i className="bi bi-telephone me-2 text-primary"></i>
                                        Teléfono de contacto
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={companyPhone}
                                        onChange={(e) => updateField('companyPhone', e.target.value)}
                                        placeholder="+34 900 000 000"
                                    />
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label className="form-label">
                                        <i className="bi bi-globe me-2 text-primary"></i>
                                        Sitio Web
                                    </label>
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
                                    <label className="form-label">
                                        <i className="bi bi-card-text me-2 text-primary"></i>
                                        Descripción corta (opcional)
                                    </label>
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
                    </div>

                    <div className="section-divider"></div>

                    {/* SECCIÓN 2: HORARIOS */}
                    <div className="step-section">
                        <h3 className="step-section-title mb-4">
                            <i className="bi bi-calendar-check me-2"></i>
                            Horarios de atención
                        </h3>

                        <div className="hours-container">
                            {businessHours.map((item, index) => (
                                <div key={item.day} className={`hour-row ${item.closed ? 'is-closed' : ''}`}>
                                    <div className="day-name">{item.day}</div>
                                    <div className="time-inputs">
                                        <input
                                            type="time"
                                            className="form-control form-control-sm"
                                            value={item.open}
                                            disabled={item.closed}
                                            onChange={(e) => updateHour(index, 'open', e.target.value)}
                                        />
                                        <span className="separator">a</span>
                                        <input
                                            type="time"
                                            className="form-control form-control-sm"
                                            value={item.close}
                                            disabled={item.closed}
                                            onChange={(e) => updateHour(index, 'close', e.target.value)}
                                        />
                                    </div>
                                    <div className="status-toggle">
                                        <span className={`status-label ${item.closed ? 'text-danger' : 'text-success'}`}>
                                            {item.closed ? 'Cerrado' : 'Abierto'}
                                        </span>
                                        <div className="form-check form-switch m-0">
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
                        <div className="form-text mt-3">
                            <i className="bi bi-info-circle me-1"></i>
                            El agente usará estos horarios para informar a los clientes sobre tu disponibilidad.
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

            <style jsx>{`
                .step-section { margin-bottom: 32px; }
                .section-divider { height: 2px; background: var(--gris-borde); margin: 40px 0; }
                .hours-container { 
                    background: #f8fafc; 
                    padding: 8px; 
                    border-radius: 12px; 
                    border: 1px solid var(--gris-borde);
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                }
                .hour-row {
                    display: flex;
                    align-items: center;
                    background: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    transition: all 0.2s;
                }
                .hour-row:hover { background: #f1f5f9; }
                .hour-row.is-closed { background: #fdf2f2; opacity: 0.8; }
                .day-name { flex: 1; font-weight: 700; font-size: 14px; color: var(--oscuro); }
                .time-inputs { flex: 2; display: flex; align-items: center; gap: 12px; justify-content: center; }
                .separator { color: var(--gris-texto); font-size: 13px; font-weight: 500; }
                .status-toggle { flex: 1; display: flex; align-items: center; gap: 12px; justify-content: flex-end; }
                .status-label { font-size: 12px; font-weight: 700; text-transform: uppercase; width: 60px; text-align: right; }
                .form-control-sm { border-radius: 6px; border: 1px solid var(--gris-borde); padding: 5px 10px; width: 110px; }
                @media (max-width: 768px) {
                    .hour-row { flex-direction: column; gap: 12px; align-items: flex-start; }
                    .time-inputs { width: 100%; justify-content: flex-start; }
                    .status-toggle { width: 100%; justify-content: space-between; }
                }
            `}</style>
        </div>
    );
};
