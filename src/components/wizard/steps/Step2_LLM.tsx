"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step2_LLM: React.FC = () => {
    const {
        temperature,
        highPriority,
        whoFirst,
        beginMessage,
        personality,
        tone,
        kbFiles,
        kbUsageInstructions,
        kbRetrievalChars,
        kbSimilarityThreshold,
        updateField,
        nextStep,
        prevStep
    } = useWizardStore();

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (kbFiles.length + files.length > 3) {
            alert("Máximo 3 archivos permitidos en la base de conocimientos.");
            return;
        }

        const newFiles = files.map(f => ({
            name: f.name,
            size: (f.size / 1024).toFixed(1) + " KB",
            type: f.name.split('.').pop() || 'unknown'
        }));

        updateField('kbFiles', [...kbFiles, ...newFiles]);
    };

    const removeFile = (index: number) => {
        const newFiles = [...kbFiles];
        newFiles.splice(index, 1);
        updateField('kbFiles', newFiles);
    };

    const handlePersonalityToggle = (trait: string) => {
        const newPersonality = [...personality];
        const index = newPersonality.indexOf(trait);
        if (index > -1) {
            newPersonality.splice(index, 1);
        } else {
            newPersonality.push(trait);
        }
        updateField('personality', newPersonality);
    };

    return (
        <div className="content-area">
            <div className="form-card">
                <h1 className="section-title">Configuración LLM</h1>
                <p className="section-subtitle">
                    Configura el modelo de lenguaje, sus parámetros y la base de conocimientos de tu agente.
                </p>

                <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
                    {/* SECCIÓN 1: CONFIGURACIÓN DEL MODELO */}
                    <div className="step-section">
                        <h3 className="step-section-title">
                            <i className="bi bi-cpu me-2"></i>
                            Configuración del modelo
                        </h3>
                        <p className="step-section-subtitle">Selecciona el modelo de IA y ajusta sus parámetros de funcionamiento.</p>

                        <div className="form-group">
                            <label className="form-label">
                                Modelo de IA <span className="required">*</span>
                                <div className="custom-tooltip">
                                    <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                    <div className="tooltip-content">
                                        <strong>GPT-4.1:</strong> El modelo más avanzado de OpenAI. Ofrece la mejor comprensión contextual y generación de respuestas naturales.
                                    </div>
                                </div>
                            </label>
                            <select className="form-select" disabled>
                                <option>GPT-4.1 (Recomendado)</option>
                            </select>
                            <div className="form-text">
                                <i className="bi bi-cpu me-1"></i>
                                Modelo seleccionado por defecto para máxima calidad
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Temperature
                                <div className="custom-tooltip">
                                    <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                    <div className="tooltip-content">
                                        <strong>Controla la creatividad:</strong><br />
                                        0.0-0.3: Consistente/Predecible.<br />
                                        0.4-0.6: Balanceado.<br />
                                        0.7-1.0: Creativo/Variado.
                                    </div>
                                </div>
                            </label>
                            <div className="slider-wrapper">
                                <span className="slider-value">{temperature}</span>
                                <input
                                    type="range"
                                    className="custom-range"
                                    min="0" max="1" step="0.1"
                                    value={temperature}
                                    onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="form-text">Mayor valor = respuestas más creativas y variadas</div>
                        </div>

                        <div className="form-group mb-0">
                            <div className="form-check custom-check">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="highPriority"
                                    checked={highPriority}
                                    onChange={(e) => updateField('highPriority', e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="highPriority">
                                    Activar modelo de alta prioridad
                                    <div className="custom-tooltip">
                                        <i className="bi bi-question-circle-fill tooltip-icon"></i>
                                        <div className="tooltip-content">Garantiza tiempos de respuesta más rápidos mediante el uso de recursos dedicados.</div>
                                    </div>
                                </label>
                            </div>
                            <div className="form-text ms-4">Garantiza respuestas más rápidas en momentos de alto tráfico</div>
                        </div>
                    </div>

                    <div className="section-divider"></div>

                    {/* SECCIÓN 2: MENSAJE Y COMPORTAMIENTO */}
                    <div className="step-section">
                        <h3 className="step-section-title">
                            <i className="bi bi-chat-dots me-2"></i>
                            Mensaje y comportamiento
                        </h3>
                        <p className="step-section-subtitle">Define cómo tu agente iniciará las conversaciones y su estilo de comunicación.</p>

                        <div className="form-group">
                            <label className="form-label">¿Quién habla primero? <span className="required">*</span></label>
                            <div className="radio-cards">
                                <label className={`radio-card-option ${whoFirst === 'agent' ? 'active' : ''}`}>
                                    <input type="radio" name="whoFirst" value="agent" checked={whoFirst === 'agent'} onChange={() => updateField('whoFirst', 'agent')} />
                                    <span>Agente habla primero</span>
                                </label>
                                <label className={`radio-card-option ${whoFirst === 'user' ? 'active' : ''}`}>
                                    <input type="radio" name="whoFirst" value="user" checked={whoFirst === 'user'} onChange={() => updateField('whoFirst', 'user')} />
                                    <span>Usuario habla primero</span>
                                </label>
                            </div>
                        </div>

                        {whoFirst === 'agent' && (
                            <div className="form-group">
                                <label className="form-label">Mensaje de inicio <span className="required">*</span></label>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    placeholder="Ej: Hola, soy Elio, tu asistente de voz..."
                                    value={beginMessage}
                                    onChange={(e) => updateField('beginMessage', e.target.value)}
                                    required
                                />

                                <div className="legal-alert mt-3">
                                    <i className="bi bi-exclamation-triangle-fill me-3"></i>
                                    <div>
                                        <strong>Obligatorio por ley española (RGPD y LOPD):</strong>
                                        <p className="mb-0">Debes informar que es un asistente de voz con IA y que la llamada está siendo grabada. Incluye siempre: <strong>"Asistente de voz creado con inteligencia artificial"</strong> y <strong>"Esta llamada está siendo grabada"</strong> (si aplica).</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Personalidad del agente</label>
                            <div className="checkbox-cards">
                                {['Profesional', 'Amigable', 'Empático', 'Proactivo'].map(trait => (
                                    <label key={trait} className={`check-card-option ${personality.includes(trait) ? 'active' : ''}`}>
                                        <input type="checkbox" checked={personality.includes(trait)} onChange={() => handlePersonalityToggle(trait)} />
                                        <span>{trait}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-group mb-0">
                            <label className="form-label">Tono de comunicación <span className="required">*</span></label>
                            <div className="radio-cards">
                                {['Formal', 'Semiformal', 'Casual'].map(t => (
                                    <label key={t} className={`radio-card-option ${tone === t ? 'active' : ''}`}>
                                        <input type="radio" name="tone" value={t} checked={tone === t} onChange={() => updateField('tone', t)} />
                                        <span>{t}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="section-divider"></div>

                    {/* SECCIÓN 3: BASE DE CONOCIMIENTOS */}
                    <div className="step-section">
                        <h3 className="step-section-title">
                            <i className="bi bi-book me-2"></i>
                            Base de conocimientos
                        </h3>
                        <p className="step-section-subtitle">Sube documentos que tu agente podrá consultar para responder con información precisa.</p>

                        <div className="alert-info-custom mb-4">
                            <i className="bi bi-info-circle-fill me-3"></i>
                            <div>
                                <strong>Recomendación:</strong> Para una mejor interpretación, sube documentos en formato texto (.txt o .md) con estructura de Preguntas Frecuentes o Problema-Solución.
                            </div>
                        </div>

                        <div className="kb-upload-area" onClick={() => document.getElementById('kb-upload')?.click()}>
                            <i className="bi bi-cloud-upload" style={{ fontSize: '40px', color: 'var(--netelip-azul)' }}></i>
                            <h5>Arrastra archivos aquí o haz clic para seleccionar</h5>
                            <p>Límite: 3 archivos (.txt, .md, .pdf). Máximo 10 MB por archivo.</p>
                            <input
                                type="file"
                                id="kb-upload"
                                className="d-none"
                                multiple
                                accept=".txt,.md,.pdf"
                                onChange={handleFileUpload}
                            />
                        </div>

                        {kbFiles.length > 0 && (
                            <div className="kb-file-list mt-3">
                                {kbFiles.map((file, idx) => (
                                    <div key={idx} className="kb-file-item">
                                        <div className="d-flex align-items: center;">
                                            <i className="bi bi-file-earmark-text me-2" style={{ color: 'var(--netelip-azul)' }}></i>
                                            <span className="file-name">{file.name}</span>
                                            <span className="file-size ms-2">({file.size})</span>
                                        </div>
                                        <button type="button" className="btn-remove" onClick={() => removeFile(idx)}>
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="form-group mt-4">
                            <label className="form-label">Instrucciones de uso de la base</label>
                            <textarea
                                className="form-control"
                                rows={3}
                                placeholder="Indica al agente cuándo y cómo debe consultar esta información..."
                                value={kbUsageInstructions}
                                onChange={(e) => updateField('kbUsageInstructions', e.target.value)}
                            />
                            <div className="form-text">Si la información es breve, es mejor incluirla directamente en las instrucciones finales.</div>
                        </div>

                        {/* CONFIGURACIÓN AVANZADA DE RETRIEVAL */}
                        <div className="row mt-4">
                            <div className="col-md-6">
                                <label className="form-label small-label">Retrieval chunks</label>
                                <div className="slider-wrapper compact">
                                    <span className="slider-value-mini">{kbRetrievalChars}</span>
                                    <input
                                        type="range" min="1" max="10" step="1"
                                        value={kbRetrievalChars}
                                        onChange={(e) => updateField('kbRetrievalChars', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="form-text-mini">Fragmentos a recuperar por consulta</div>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small-label">Similarity threshold</label>
                                <div className="slider-wrapper compact">
                                    <span className="slider-value-mini">{kbSimilarityThreshold}</span>
                                    <input
                                        type="range" min="0.1" max="1.0" step="0.1"
                                        value={kbSimilarityThreshold}
                                        onChange={(e) => updateField('kbSimilarityThreshold', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="form-text-mini">Umbral de similitud (0.1 - 1.0)</div>
                            </div>
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
                .step-section {
                    margin-bottom: 24px;
                }
                .step-section-title {
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--oscuro);
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                }
                .step-section-subtitle {
                    font-size: 14px;
                    color: var(--gris-texto);
                    margin-bottom: 24px;
                }
                .section-divider {
                    height: 2px;
                    background: var(--gris-borde);
                    margin: 40px 0;
                }
                .slider-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .slider-value {
                    background: var(--netelip-azul);
                    color: white;
                    padding: 4px 12px;
                    border-radius: 6px;
                    font-weight: 700;
                    min-width: 45px;
                    text-align: center;
                }
                .custom-range {
                    flex-grow: 1;
                }
                .radio-cards, .checkbox-cards {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }
                .radio-card-option, .check-card-option {
                    flex: 1;
                    min-width: 140px;
                    border: 2px solid var(--gris-borde);
                    border-radius: 8px;
                    padding: 12px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: 600;
                    font-size: 14px;
                }
                .radio-card-option:hover, .check-card-option:hover {
                    border-color: var(--netelip-azul);
                    background: #f0f9ff;
                }
                .radio-card-option.active, .check-card-option.active {
                    border-color: var(--netelip-azul);
                    background: #f0f9ff;
                    color: var(--netelip-azul);
                }
                .radio-card-option input, .check-card-option input {
                    display: none;
                }
                .legal-alert {
                    background: #fffbeb;
                    border: 1px solid #fef3c7;
                    border-radius: 8px;
                    padding: 16px;
                    display: flex;
                    color: #92400e;
                    font-size: 12px;
                    line-height: 1.5;
                }
                .alert-info-custom {
                    background: #eff6ff;
                    border: 1px solid #bfdbfe;
                    border-radius: 8px;
                    padding: 16px;
                    display: flex;
                    color: "var(--netelip-azul)";
                    font-size: 13px;
                }
                .kb-upload-area {
                    border: 2px dashed var(--gris-borde);
                    border-radius: 12px;
                    padding: 40px;
                    text-align: center;
                    background: #f8fafc;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .kb-upload-area:hover {
                    border-color: var(--netelip-azul);
                    background: #f1f5f9;
                }
                .kb-file-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: white;
                    border: 1px solid var(--gris-borde);
                    border-radius: 8px;
                    padding: 10px 16px;
                    margin-bottom: 8px;
                }
                .file-name {
                    font-weight: 600;
                    font-size: 14px;
                }
                .file-size {
                    font-size: 12px;
                    color: var(--gris-texto);
                }
                .btn-remove {
                    background: none;
                    border: none;
                    color: #ef4444;
                    cursor: pointer;
                }
                .slider-value-mini {
                    background: #e2e8f0;
                    color: #475569;
                    font-size: 12px;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: 4px;
                    min-width: 32px;
                    text-align: center;
                }
                .small-label {
                    font-size: 13px;
                    margin-bottom: 4px;
                }
                .form-text-mini {
                    font-size: 11px;
                    color: var(--gris-texto);
                    margin-top: 4px;
                }
                .compact {
                    gap: 10px;
                }
            `}</style>
        </div>
    );
};
