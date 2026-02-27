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

                        <div className="row">
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label className="form-label">
                                        ¿Cómo se llamará tu agente?
                                        <span className="required">*</span>
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
                                    <div className="form-text">
                                        <i className="bi bi-lightbulb me-1"></i>
                                        Se presentará con este nombre al iniciar
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label className="form-label">
                                        Nombre de tu empresa
                                        <div className="custom-tooltip">
                                            <i className="bi bi-info-circle tooltip-icon"></i>
                                            <div className="tooltip-content">
                                                <strong>Nombre de la empresa</strong><br />
                                                El agente usará este nombre para presentar tu empresa y dar contexto al cliente.
                                            </div>
                                        </div>
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

                        <div className="agent-types-grid">
                            {/* TRANSFERENCIA */}
                            <div
                                className={`agent-type-card ${agentType === 'transferencia' ? 'selected' : ''}`}
                                onClick={() => updateField('agentType', 'transferencia')}
                            >
                                {agentType === 'transferencia' && <div className="selected-check"><i className="bi bi-check-lg"></i></div>}
                                <div className="agent-type-icon">
                                    <i className="bi bi-telephone-outbound" style={{ fontSize: '30px', color: 'var(--netelip-azul)' }}></i>
                                </div>
                                <div className="agent-type-name">Transferencia de llamadas</div>
                                <div className="agent-type-desc">Deriva llamadas inteligentemente a personas o departamentos específicos.</div>

                                <ul className="type-bullets">
                                    <li><i className="bi bi-check-lg"></i> Transferencia caliente (con contexto)</li>
                                    <li><i className="bi bi-check-lg"></i> Transferencia fría (directa)</li>
                                    <li><i className="bi bi-check-lg"></i> Routing por horarios y disponibilidad</li>
                                    <li><i className="bi bi-check-lg"></i> Múltiples destinos configurables</li>
                                </ul>

                                <span className="agent-type-badge">DISTRIBUCIÓN INTELIGENTE</span>
                            </div>

                            {/* AGENDAMIENTO */}
                            <div
                                className={`agent-type-card ${agentType === 'agendamiento' ? 'selected' : ''}`}
                                onClick={() => updateField('agentType', 'agendamiento')}
                            >
                                {agentType === 'agendamiento' && <div className="selected-check"><i className="bi bi-check-lg"></i></div>}
                                <div className="agent-type-icon">
                                    <i className="bi bi-calendar-check" style={{ fontSize: '30px', color: 'var(--netelip-azul)' }}></i>
                                </div>
                                <div className="agent-type-name">Agendamiento de citas</div>
                                <div className="agent-type-desc">Gestiona automáticamente la reserva de citas verificando disponibilidad real.</div>

                                <ul className="type-bullets">
                                    <li><i className="bi bi-check-lg"></i> Integración directa con Cal.com</li>
                                    <li><i className="bi bi-check-lg"></i> Verificación de disponibilidad real</li>
                                    <li><i className="bi bi-check-lg"></i> Confirmaciones automáticas</li>
                                    <li><i className="bi bi-check-lg"></i> Recordatorios de citas</li>
                                </ul>

                                <span className="agent-type-badge">CAL.COM INTEGRADO</span>
                            </div>

                            {/* CUALIFICACIÓN */}
                            <div
                                className={`agent-type-card ${agentType === 'cualificacion' ? 'selected' : ''}`}
                                onClick={() => updateField('agentType', 'cualificacion')}
                            >
                                {agentType === 'cualificacion' && <div className="selected-check"><i className="bi bi-check-lg"></i></div>}
                                <div className="agent-type-icon">
                                    <i className="bi bi-chat-left-dots" style={{ fontSize: '30px', color: 'var(--netelip-azul)' }}></i>
                                </div>
                                <div className="agent-type-name">Cualificación y atención</div>
                                <div className="agent-type-desc">Cualifica leads con preguntas estratégicas y proporciona atención completa.</div>

                                <ul className="type-bullets">
                                    <li><i className="bi bi-check-lg"></i> Cualificación de leads inteligente</li>
                                    <li><i className="bi bi-check-lg"></i> Scoring automático de prospectos</li>
                                    <li><i className="bi bi-check-lg"></i> Atención 24/7 sin esperas</li>
                                    <li><i className="bi bi-check-lg"></i> Escalado a humano si es necesario</li>
                                </ul>

                                <span className="agent-type-badge">SOPORTE Y VENTAS</span>
                            </div>

                            {/* OUTBOUND (COMING SOON) */}
                            <div className="agent-type-card disabled-card">
                                <span className="coming-soon-tag">PRÓXIMAMENTE</span>
                                <div className="agent-type-icon">
                                    <i className="bi bi-telephone-plus" style={{ fontSize: '30px', color: '#94a3b8' }}></i>
                                </div>
                                <div className="agent-type-name" style={{ color: '#64748b' }}>Campañas Outbound</div>
                                <div className="agent-type-desc">Realiza llamadas salientes automatizadas para campañas comerciales.</div>

                                <ul className="type-bullets" style={{ color: '#94a3b8' }}>
                                    <li><i className="bi bi-check-lg"></i> Llamadas masivas programadas</li>
                                    <li><i className="bi bi-check-lg"></i> Scripts personalizables por campaña</li>
                                    <li><i className="bi bi-check-lg"></i> Detección de buzones de voz</li>
                                    <li><i className="bi bi-check-lg"></i> Análisis de sentimientos</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="wizard-actions mt-5">
                        <button type="button" className="btn btn-secondary" disabled>
                            Atrás
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!agentName.trim()}>
                            Siguiente paso <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            </div>

            <style jsx>{`
                .agent-types-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 20px;
                    margin-top: 24px;
                }
                .agent-type-card {
                    background: white;
                    border: 2px solid var(--gris-borde);
                    border-radius: 12px;
                    padding: 24px;
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                }
                .agent-type-card:hover {
                    border-color: var(--netelip-azul);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                .agent-type-card.selected {
                    border-color: var(--netelip-azul);
                    background: #f0f9ff;
                }
                .selected-check {
                    position: absolute;
                    top: -10px;
                    right: -10px;
                    background: var(--netelip-azul);
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .agent-type-icon {
                    margin-bottom: 16px;
                }
                .agent-type-name {
                    font-size: 16px;
                    font-weight: 700;
                    color: var(--oscuro);
                    margin-bottom: 8px;
                }
                .agent-type-desc {
                    font-size: 13px;
                    color: var(--gris-texto);
                    margin-bottom: 16px;
                    line-height: 1.4;
                }
                .type-bullets {
                    list-style: none;
                    padding: 0;
                    margin: 0 0 20px 0;
                    flex-grow: 1;
                }
                .type-bullets li {
                    font-size: 12px;
                    color: #475569;
                    margin-bottom: 6px;
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                }
                .type-bullets li i {
                    color: var(--netelip-azul);
                    font-size: 14px;
                    margin-top: 1px;
                }
                .agent-type-badge {
                    display: inline-block;
                    padding: 6px 12px;
                    background: var(--netelip-azul);
                    color: white;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    align-self: flex-start;
                }
                .disabled-card {
                    opacity: 0.7;
                    cursor: not-allowed;
                    background: #f8fafc;
                }
                .disabled-card:hover {
                    transform: none;
                    border-color: var(--gris-borde);
                    box-shadow: none;
                }
                .coming-soon-tag {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: #fef3c7;
                    color: #d97706;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 700;
                }
            `}</style>
        </div>
    );
};
