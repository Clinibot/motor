"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step1_Type: React.FC = () => {
    const { agentName, companyName, agentType, updateField, nextStep } = useWizardStore();

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
                        <h2 className="section-title">
                            Información básica del agente
                            <div className="custom-tooltip">
                                <i className="bi bi-info-circle tooltip-icon"></i>
                                <div className="tooltip-content">
                                    Aquí defines la identidad de tu agente. El nombre y la empresa son fundamentales para que el agente sepa quién es y a quién representa.
                                </div>
                            </div>
                        </h2>
                        <p className="section-subtitle">
                            Empecemos con los datos fundamentales. Esta información personaliza todo el comportamiento de tu agente.
                        </p>

                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', fontWeight: 600, color: 'var(--oscuro)', marginBottom: '8px', fontSize: '14px' }}>
                                ¿Cómo se llamará tu agente?
                                <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                                <div className="custom-tooltip">
                                    <i className="bi bi-info-circle tooltip-icon"></i>
                                    <div className="tooltip-content">
                                        <strong>Nombre del agente</strong><br />
                                        Este será el nombre con el que tu agente se presentará al iniciar la llamada.
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
                            />
                            <div style={{ color: 'var(--gris-texto)', fontSize: '13px', marginTop: '6px' }}>
                                <i className="bi bi-lightbulb me-1"></i>
                                Este nombre aparecerá en todas las interacciones con clientes
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', fontWeight: 600, color: 'var(--oscuro)', marginBottom: '8px', fontSize: '14px' }}>
                                Nombre de tu empresa
                                <span className="custom-tooltip">
                                    <i className="bi bi-info-circle tooltip-icon"></i>
                                    <span className="tooltip-content">
                                        <strong>Nombre de la empresa</strong><br />
                                        El agente usará este nombre para presentar tu empresa y dar contexto al cliente.
                                    </span>
                                </span>
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Ej: netelip, Garabato, UX-AI."
                                value={companyName}
                                onChange={(e) => updateField('companyName', e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ borderTop: '2px solid var(--gris-borde)', margin: '48px 0', paddingTop: '40px' }}>
                        <h2 className="section-title">
                            ¿Qué tipo de agente necesitas?
                            <div className="custom-tooltip">
                                <i className="bi bi-info-circle tooltip-icon"></i>
                                <div className="tooltip-content">
                                    El tipo de agente pre-configura ciertas herramientas y comportamientos óptimos para cada caso de uso.
                                </div>
                            </div>
                        </h2>
                        <p className="section-subtitle">
                            Selecciona el tipo de agente según la función principal que necesites.
                        </p>
                    </div>

                    <div className="agent-types-grid">
                        <div
                            className={`agent-type-card ${agentType === 'transferencia' ? 'selected' : ''}`}
                            onClick={() => updateField('agentType', 'transferencia')}
                        >
                            <div className="agent-type-icon">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
                                    <path d="M3 5C3 3.89543 3.89543 3 5 3H8.27924C8.70967 3 9.09181 3.27543 9.22792 3.68377L10.7257 8.17721C10.8831 8.64932 10.6694 9.16531 10.2243 9.38787L7.96701 10.5165C9.06925 12.9612 11.0388 14.9308 13.4835 16.033L14.6121 13.7757C14.8347 13.3306 15.3507 13.1169 15.8228 13.2743L20.3162 14.7721C20.7246 14.9082 21 15.2903 21 15.7208V19C21 20.1046 20.1046 21 19 21H18C9.71573 21 3 14.2843 3 6V5Z" stroke="#267ab0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M14 3L16 5L14 7" stroke="#267ab0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M20 3L18 5L20 7" stroke="#267ab0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="agent-type-name">Transferencia de llamadas</div>
                            <div className="agent-type-desc">Deriva llamadas inteligentemente a departamentos.</div>
                            <span className="agent-type-badge">Distribución</span>
                        </div>

                        <div
                            className={`agent-type-card ${agentType === 'agendamiento' ? 'selected' : ''}`}
                            onClick={() => updateField('agentType', 'agendamiento')}
                        >
                            <div className="agent-type-icon">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
                                    <rect x="3" y="6" width="18" height="15" rx="2" stroke="#267ab0" strokeWidth="1.5" />
                                    <path d="M3 10H21" stroke="#267ab0" strokeWidth="1.5" />
                                    <path d="M7 3V6M17 3V6" stroke="#267ab0" strokeWidth="1.5" strokeLinecap="round" />
                                    <circle cx="9" cy="14" r="1" fill="#267ab0" />
                                    <circle cx="15" cy="14" r="1" fill="#267ab0" />
                                    <circle cx="12" cy="17" r="1" fill="#267ab0" />
                                </svg>
                            </div>
                            <div className="agent-type-name">Agendamiento de citas</div>
                            <div className="agent-type-desc">Gestiona automáticamente la reserva de citas.</div>
                            <span className="agent-type-badge">Cal.com invertido</span>
                        </div>

                        <div
                            className={`agent-type-card ${agentType === 'cualificacion' ? 'selected' : ''}`}
                            onClick={() => updateField('agentType', 'cualificacion')}
                        >
                            <div className="agent-type-icon">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
                                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22Z" stroke="#267ab0" strokeWidth="1.5" />
                                    <path d="M12 11V12M12 15H12.01" stroke="#267ab0" strokeWidth="2" strokeLinecap="round" />
                                    <circle cx="12" cy="8" r="1.5" fill="#267ab0" />
                                </svg>
                            </div>
                            <div className="agent-type-name">Cualificación y atención</div>
                            <div className="agent-type-desc">Cualifica leads con preguntas estratégicas.</div>
                            <span className="agent-type-badge">Soporte y Ventas</span>
                        </div>
                    </div>

                    {/* BANNER DE AYUDA */}
                    <div className="info-banner" style={{ marginTop: '32px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ background: 'var(--netelip-azul)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', flexShrink: 0, marginTop: '2px', justifyContent: 'center' }}>
                            <i className="bi bi-lightbulb" style={{ color: 'white', fontSize: '18px' }}></i>
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--oscuro)', marginBottom: '8px', marginTop: 0 }}>¿No estás seguro cuál elegir?</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ fontSize: '13px', color: 'var(--gris-texto)', lineHeight: '1.4' }}>
                                    <strong style={{ color: 'var(--oscuro)' }}>Transferencia:</strong> Si tu prioridad es distribuir llamadas entre tu equipo.
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--gris-texto)', lineHeight: '1.4' }}>
                                    <strong style={{ color: 'var(--oscuro)' }}>Agendamiento:</strong> Si necesitas automatizar reservas de consultas, visitas o reuniones.
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--gris-texto)', lineHeight: '1.4' }}>
                                    <strong style={{ color: 'var(--oscuro)' }}>Cualificación:</strong> Si buscas filtrar leads y dar soporte a clientes.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="wizard-actions">
                        <button type="button" className="btn btn-secondary" disabled>
                            Atrás
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!agentName.trim()}>
                            Siguiente paso <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
