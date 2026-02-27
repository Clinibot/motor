"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step2_CompanyInfo: React.FC = () => {
    const {
        companyAddress, companyPhone, companyWebsite, companyDescription, businessHours,
        kbFiles, kbUsageInstructions, kbRetrievalChunks, kbSimilarityThreshold,
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

    return (
        <div className="content-area">
            <div className="form-card shadow-sm">
                <h1 className="section-title">Información de la empresa</h1>
                <p className="section-subtitle">Configura los detalles comerciales y proporciona la base de conocimientos de tu negocio.</p>

                <form onSubmit={handleNext}>
                    {/* SECCIÓN 1: DATOS BÁSICOS */}
                    <div className="step-section">
                        <div className="row g-4">
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label className="form-label fw-bold">
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
                                    <label className="form-label fw-bold">
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
                                    <label className="form-label fw-bold">
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
                                    <label className="form-label fw-bold">
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

                    <div className="section-divider my-5"></div>

                    {/* SECCIÓN 2: HORARIOS */}
                    <div className="step-section">
                        <h3 className="step-section-title mb-4">
                            <i className="bi bi-calendar-check me-2" style={{ color: '#64748b' }}></i>
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
                    </div>

                    <div className="section-divider my-5"></div>

                    {/* SECCIÓN 3: BASE DE CONOCIMIENTOS */}
                    <div className="step-section">
                        <h3 className="step-section-title mb-4">
                            <i className="bi bi-book-fill me-2" style={{ color: '#64748b' }}></i>
                            Base de conocimientos
                        </h3>
                        <p className="text-muted small mb-4">Sube documentos que tu agente podrá consultar para responder con información precisa.</p>

                        <div className="warning-box mb-4">
                            <i className="bi bi-exclamation-triangle-fill me-3"></i>
                            <div>
                                <strong className="d-block mb-1">Importante: Datos Tratados</strong>
                                <p className="mb-0">Recomendamos documentos estructurados en formato <strong>Preguntas Frecuentes (FAQ)</strong> o <strong>Problema/Solución</strong>. Límite máximo de 3 archivos (máx 10 MB/cada uno).</p>
                            </div>
                        </div>

                        <div className="kb-upload-area" onClick={() => document.getElementById('kb-upload')?.click()}>
                            <i className="bi bi-cloud-arrow-up-fill mb-2" style={{ fontSize: '30px', color: '#cbd5e1' }}></i>
                            <div className="fw-bold">Arrastra archivos aquí o haz clic para subir</div>
                            <div className="text-muted small">Formatos: .md, .txt, .pdf, .docx</div>
                            <input
                                type="file"
                                id="kb-upload"
                                className="d-none"
                                multiple
                                accept=".md,.txt,.pdf,.docx"
                                onChange={handleFileUpload}
                            />
                        </div>

                        {kbFiles.length > 0 && (
                            <div className="kb-file-list mt-3">
                                {kbFiles.map((file, idx) => (
                                    <div key={idx} className="kb-file-item">
                                        <div className="d-flex align-items-center">
                                            <i className="bi bi-file-earmark-text me-2 text-primary"></i>
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
                            <label className="form-label fw-bold">Instrucciones de uso de la base</label>
                            <textarea
                                className="form-control"
                                rows={3}
                                placeholder="Eje: Consulta esta información solo para dudas técnicas sobre implantes..."
                                value={kbUsageInstructions}
                                onChange={(e) => updateField('kbUsageInstructions', e.target.value)}
                            />
                        </div>

                        {/* CONFIGURACIÓN AVANZADA DE RETRIEVAL */}
                        <div className="row mt-4">
                            <div className="col-md-6 mb-3">
                                <label className="form-label small fw-bold">Retrieval chunks</label>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="slider-value-mini">{kbRetrievalChunks}</span>
                                    <input
                                        type="range" className="form-range" min="1" max="10" step="1"
                                        value={kbRetrievalChunks}
                                        onChange={(e) => updateField('kbRetrievalChunks', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold">Similarity threshold</label>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="slider-value-mini">{kbSimilarityThreshold}</span>
                                    <input
                                        type="range" className="form-range" min="0.1" max="1.0" step="0.1"
                                        value={kbSimilarityThreshold}
                                        onChange={(e) => updateField('kbSimilarityThreshold', parseFloat(e.target.value))}
                                    />
                                </div>
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
                .step-section { margin-bottom: 32px; }
                .section-divider { height: 1px; background: #e2e8f0; }
                .hours-container { 
                    background: #f8fafc; 
                    padding: 8px; 
                    border-radius: 12px; 
                    border: 1px solid #e2e8f0;
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
                }
                .hour-row.is-closed { background: #fee2e2; }
                .day-name { flex: 1; font-weight: 700; font-size: 14px; color: var(--oscuro); }
                .time-inputs { flex: 2; display: flex; align-items: center; gap: 12px; justify-content: center; }
                .separator { color: var(--gris-texto); font-size: 13px; }
                .status-toggle { flex: 1; display: flex; align-items: center; gap: 12px; justify-content: flex-end; }
                .status-label { font-size: 11px; font-weight: 700; text-transform: uppercase; width: 60px; text-align: right; }
                
                .warning-box {
                    background: #fffbeb;
                    border: 1px solid #fde68a;
                    border-radius: 8px;
                    padding: 16px;
                    display: flex;
                    color: #92400e;
                    font-size: 13px;
                }
                .kb-upload-area {
                    border: 2px dashed #cbd5e1;
                    border-radius: 12px;
                    padding: 30px;
                    text-align: center;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 14px;
                }
                .kb-upload-area:hover { border-color: var(--netelip-azul); background: #f8fafc; }
                .kb-file-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 10px 16px;
                    margin-bottom: 8px;
                }
                .file-name { font-weight: 600; font-size: 14px; }
                .file-size { font-size: 12px; color: #64748b; }
                .btn-remove { background: none; border: none; color: #ef4444; }
                .slider-value-mini {
                    background: #f1f5f9;
                    color: #475569;
                    font-size: 12px;
                    font-weight: 700;
                    padding: 4px 8px;
                    border-radius: 4px;
                    min-width: 35px;
                    text-align: center;
                }
            `}</style>
        </div>
    );
};
