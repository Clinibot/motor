"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step1_Type: React.FC = () => {
    const { agentName, companyName, agentType, updateField, nextStep } = useWizardStore();

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (agentName.trim() === '' || !agentType) return;
        nextStep();
    };

    return (
        <div className="content-area">
            <div className="form-card">
                <form onSubmit={handleNext}>
                    {/* SECCIÓN: INFORMACIÓN BÁSICA DEL AGENTE */}
                    <div style={{ marginBottom: '48px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--oscuro)', marginBottom: '8px' }}>
                            Información básica del agente
                        </h2>
                        <p style={{ fontSize: '14px', color: 'var(--gris-texto)', marginBottom: '32px', lineHeight: '1.6' }}>
                            Empecemos con los datos fundamentales. Esta información personaliza todo el comportamiento de tu agente.
                        </p>

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

                    <div style={{ borderTop: '2px solid var(--gris-borde)', margin: '48px 0', paddingTop: '40px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--oscuro)', marginBottom: '8px' }}>
                            ¿Qué tipo de agente necesitas?
                        </h2>
                        <p style={{ fontSize: '14px', color: 'var(--gris-texto)', marginBottom: '32px', lineHeight: '1.6' }}>
                            Selecciona el tipo de agente según la función principal que necesites. Cada uno tiene capacidades optimizadas para su propósito.
                        </p>

                        <div className="agent-types-grid">
                            {/* TRANSFERENCIA */}
                            <div
                                className={`agent-type-card ${agentType === 'transferencia' ? 'selected' : ''}`}
                                onClick={() => updateField('agentType', 'transferencia')}
                            >
                                <div className="agent-type-icon">
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 5C3 3.89543 3.89543 3 5 3H8.27924C8.70967 3 9.09181 3.27543 9.22792 3.68377L10.7257 8.17721C10.8831 8.64932 10.6694 9.16531 10.2243 9.38787L7.96701 10.5165C9.06925 12.9612 11.0388 14.9308 13.4835 16.033L14.6121 13.7757C14.8347 13.3306 15.3507 13.1169 15.8228 13.2743L20.3162 14.7721C20.7246 14.9082 21 15.2903 21 15.7208V19C21 20.1046 20.1046 21 19 21H18C9.71573 21 3 14.2843 3 6V5Z" stroke="#267ab0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M14 3L16 5L14 7" stroke="#267ab0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M20 3L18 5L20 7" stroke="#267ab0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div className="agent-type-name">Transferencia de llamadas</div>
                                <div className="agent-type-desc">
                                    Deriva llamadas inteligentemente a personas o departamentos específicos según el contexto de la conversación.
                                </div>
                                <ul className="agent-type-features">
                                    <li>Transferencia caliente (con contexto)</li>
                                    <li>Transferencia fría (directa)</li>
                                    <li>Routing por horarios y disponibilidad</li>
                                    <li>Múltiples destinos configurables</li>
                                </ul>
                                <span className="agent-type-badge">Distribución inteligente</span>
                            </div>

                            {/* AGENDAMIENTO */}
                            <div
                                className={`agent-type-card ${agentType === 'agendamiento' ? 'selected' : ''}`}
                                onClick={() => updateField('agentType', 'agendamiento')}
                            >
                                <div className="agent-type-icon">
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="3" y="6" width="18" height="15" rx="2" stroke="#267ab0" strokeWidth="1.5" />
                                        <path d="M3 10H21" stroke="#267ab0" strokeWidth="1.5" />
                                        <path d="M7 3V6M17 3V6" stroke="#267ab0" strokeWidth="1.5" strokeLinecap="round" />
                                        <circle cx="9" cy="14" r="1" fill="#267ab0" />
                                        <circle cx="15" cy="14" r="1" fill="#267ab0" />
                                        <circle cx="12" cy="17" r="1" fill="#267ab0" />
                                    </svg>
                                </div>
                                <div className="agent-type-name">Agendamiento de citas</div>
                                <div className="agent-type-desc">
                                    Gestiona automáticamente la reserva de citas verificando disponibilidad en tiempo real con Cal.com.
                                </div>
                                <ul className="agent-type-features">
                                    <li>Integración directa con Cal.com</li>
                                    <li>Verificación de disponibilidad real</li>
                                    <li>Confirmaciones automáticas</li>
                                    <li>Recordatorios de citas</li>
                                </ul>
                                <span className="agent-type-badge">Cal.com integrado</span>
                            </div>

                            {/* CUALIFICACIÓN */}
                            <div
                                className={`agent-type-card ${agentType === 'cualificacion' ? 'selected' : ''}`}
                                onClick={() => updateField('agentType', 'cualificacion')}
                            >
                                <div className="agent-type-icon">
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22Z" stroke="#267ab0" strokeWidth="1.5" />
                                        <path d="M12 11V12M12 15H12.01" stroke="#267ab0" strokeWidth="2" strokeLinecap="round" />
                                        <circle cx="12" cy="8" r="1.5" fill="#267ab0" />
                                    </svg>
                                </div>
                                <div className="agent-type-name">Cualificación y atención</div>
                                <div className="agent-type-desc">
                                    Cualifica leads con preguntas estratégicas y proporciona atención al cliente completa para consultas generales.
                                </div>
                                <ul className="agent-type-features">
                                    <li>Cualificación de leads inteligente</li>
                                    <li>Scoring automático de prospectos</li>
                                    <li>Resolución de consultas frecuentes</li>
                                    <li>Escalado selectivo a humanos</li>
                                </ul>
                                <span className="agent-type-badge">Dual: Ventas + Soporte</span>
                            </div>

                            {/* OUTBOUND (COMING SOON) */}
                            <div className="agent-type-card disabled-card" onClick={(e) => e.preventDefault()}>
                                <div className="coming-soon-badge">Próximamente</div>
                                <div className="agent-type-icon" style={{ opacity: 0.5 }}>
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 5C3 3.89543 3.89543 3 5 3H8.27924C8.70967 3 9.09181 3.27543 9.22792 3.68377L10.7257 8.17721C10.8831 8.64932 10.6694 9.16531 10.2243 9.38787L7.96701 10.5165C9.06925 12.9612 11.0388 14.9308 13.4835 16.033L14.6121 13.7757C14.8347 13.3306 15.3507 13.1169 15.8228 13.2743L20.3162 14.7721C20.7246 14.9082 21 15.2903 21 15.7208V19C21 20.1046 20.1046 21 19 21H18C9.71573 21 3 14.2843 3 6V5Z" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M16 3L21 8M21 3L16 8" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div className="agent-type-name" style={{ color: '#6c757d' }}>Campañas Outbound</div>
                                <div className="agent-type-desc" style={{ color: '#9ca3af' }}>
                                    Realiza llamadas salientes automatizadas para campañas comerciales, seguimiento de leads y reactivación de clientes.
                                </div>
                                <ul className="agent-type-features" style={{ color: '#9ca3af' }}>
                                    <li>Llamadas masivas programadas</li>
                                    <li>Scripts personalizables por campaña</li>
                                    <li>Detección de contestadores automáticos</li>
                                    <li>Reportes de conversión en tiempo real</li>
                                </ul>
                                <span className="agent-type-badge" style={{ background: '#f3f4f6', color: '#6c757d' }}>Llamadas salientes</span>
                            </div>
                        </div>

                        {/* INFO BANNER */}
                        <div className="info-banner">
                            <i className="bi bi-lightbulb-fill"></i>
                            <div className="info-banner-content">
                                <div className="info-banner-title">¿No estás seguro cuál elegir?</div>
                                <div className="info-banner-text">
                                    <strong>Transferencia:</strong> Si tu prioridad es distribuir llamadas entre tu equipo.<br />
                                    <strong>Agendamiento:</strong> Si necesitas automatizar reservas de consultas, visitas o reuniones.<br />
                                    <strong>Cualificación:</strong> Si buscas filtrar leads y dar soporte a clientes.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="wizard-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => window.location.href = '/dashboard'}>
                            <i className="bi bi-arrow-left"></i> Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!agentName.trim() || !agentType}>
                            Siguiente paso <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form >
            </div >

            <style jsx>{`
                .agent-types-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 24px;
                    margin-bottom: 32px;
                }
                .agent-type-card {
                    background: white;
                    border: 2px solid var(--gris-borde);
                    border-radius: 12px;
                    padding: 32px 24px;
                    cursor: pointer;
                    transition: all 0.3s;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .agent-type-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 4px;
                    background: var(--netelip-azul);
                    transform: scaleX(0);
                    transition: transform 0.3s;
                }
                .agent-type-card:hover:not(.disabled-card) {
                    border-color: var(--netelip-azul);
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(38, 122, 176, 0.12);
                }
                .agent-type-card:hover::before {
                    transform: scaleX(1);
                }
                .agent-type-card.selected {
                    border-color: var(--netelip-azul);
                    background: #f0f9ff;
                    box-shadow: 0 8px 24px rgba(38, 122, 176, 0.15);
                }
                .agent-type-card.selected::before {
                    transform: scaleX(1);
                }
                .agent-type-card.selected::after {
                    content: '✓';
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    width: 32px;
                    height: 32px;
                    background: var(--netelip-azul);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 16px;
                }
                .agent-type-icon {
                    width: 64px;
                    height: 64px;
                    margin-bottom: 20px;
                    background: var(--gris-claro);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s;
                }
                .agent-type-card:hover .agent-type-icon { background: var(--netelip-azul); }
                .agent-type-card:hover .agent-type-icon svg path { stroke: white; }
                .agent-type-card:hover .agent-type-icon svg rect { stroke: white; }
                .agent-type-card:hover .agent-type-icon svg circle { stroke: white; fill: white; }
                .agent-type-card.selected .agent-type-icon { background: var(--netelip-azul); }
                .agent-type-card.selected .agent-type-icon svg path { stroke: white; }
                .agent-type-card.selected .agent-type-icon svg rect { stroke: white; }
                .agent-type-card.selected .agent-type-icon svg circle { stroke: white; fill: white; }
                
                .agent-type-icon svg { width: 36px; height: 36px; }
                .agent-type-name { font-size: 18px; font-weight: 700; color: var(--oscuro); margin-bottom: 8px; }
                .agent-type-desc { font-size: 14px; color: var(--gris-texto); margin-bottom: 16px; line-height: 1.5; }
                .agent-type-features { list-style: none; padding: 0; margin: 0; flex-grow: 1; }
                .agent-type-features li { font-size: 13px; color: var(--gris-texto); padding: 6px 0; display: flex; align-items: start; }
                .agent-type-features li::before { content: '✓'; color: var(--netelip-azul); font-weight: 700; margin-right: 8px; font-size: 14px; }
                
                .agent-type-badge {
                    display: inline-block;
                    padding: 4px 10px;
                    background: var(--netelip-azul);
                    color: white;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    margin-top: 16px;
                    letter-spacing: 0.5px;
                    align-self: flex-start;
                }
                .disabled-card { opacity: 0.6; cursor: not-allowed; background: #f8fafc; }
                .coming-soon-badge {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: #f59e0b;
                    color: white;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                /* INFO BANNER */
                .info-banner {
                    background: #eff6ff;
                    border: 1px solid #bfdbfe;
                    border-radius: 10px;
                    padding: 16px 20px;
                    margin-top: 32px;
                    display: flex;
                    align-items: start;
                    gap: 12px;
                }
                .info-banner i { color: var(--netelip-azul); font-size: 20px; margin-top: 2px; }
                .info-banner-content { flex: 1; }
                .info-banner-title { font-weight: 700; color: var(--oscuro); font-size: 14px; margin-bottom: 4px; }
                .info-banner-text { font-size: 13px; color: var(--gris-texto); line-height: 1.5; }
                
                .tooltip-icon { color: var(--netelip-azul); margin-left:1px; cursor: help; font-size: 18px; vertical-align: middle; }
                .tooltip-content { 
                    visibility: hidden; width: 320px; background: var(--oscuro); color: white; border-radius: 8px; 
                    padding: 16px 18px; position: absolute; z-index: 2000; bottom: 140%; left: 50%; margin-left: -160px; 
                    opacity: 0; transition: all 0.3s; font-size: 13px; line-height: 1.6;
                }
                .tooltip-content::after { 
                    content: ""; position: absolute; top: 100%; left: 50%; margin-left: -8px; 
                    border-width: 8px; border-style: solid; border-color: var(--oscuro) transparent transparent transparent; 
                }
                .custom-tooltip:hover .tooltip-content { visibility: visible; opacity: 1; }
            `}</style>
        </div >
    );
};
