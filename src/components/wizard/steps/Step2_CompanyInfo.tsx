"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step2_CompanyInfo: React.FC = () => {
    const {
        companyAddress, companyPhone, companyWebsite, companyDescription, businessHours,
        knowledgeBaseFiles, knowledgeBaseUsage, retrievalChunks, similarityThreshold,
        updateField, prevStep, nextStep
    } = useWizardStore();

    const [isDragging, setIsDragging] = useState(false);

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        nextStep();
    };

    const updateHour = (index: number, field: 'open' | 'close' | 'closed', value: string | boolean) => {
        const newHours = [...businessHours];
        newHours[index] = { ...newHours[index], [field]: value };
        updateField('businessHours', newHours);
    };

    const simulateUpload = () => {
        if (knowledgeBaseFiles.length >= 3) {
            alert("Límite máximo de 3 archivos alcanzado.");
            return;
        }
        const fileName = `documento_conocimiento_${knowledgeBaseFiles.length + 1}.pdf`;
        updateField('knowledgeBaseFiles', [...knowledgeBaseFiles, fileName]);
    };

    const removeFile = (index: number) => {
        const newFiles = [...knowledgeBaseFiles];
        newFiles.splice(index, 1);
        updateField('knowledgeBaseFiles', newFiles);
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
                    Configura los detalles de contacto, horarios y base de conocimientos.
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

                    <hr className="my-5" />

                    {/* SECCIÓN 3: BASE DE CONOCIMIENTOS */}
                    <div className="knowledge-base-section">
                        <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <i className="bi bi-book" style={{ color: 'var(--netelip-azul)' }}></i>
                            Base de conocimientos
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--gris-texto)', marginBottom: '24px' }}>
                            Sube documentos que tu agente podrá consultar para responder con información precisa. Recomendado: formato Markdown (.md) o texto plano (.txt).
                        </p>

                        <div className="alert alert-warning mb-4" style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '10px' }}>
                            <div className="d-flex gap-3">
                                <i className="bi bi-exclamation-triangle-fill" style={{ color: '#d97706', fontSize: '20px' }}></i>
                                <div style={{ fontSize: '13px', color: '#92400e' }}>
                                    <strong style={{ display: 'block', marginBottom: '4px' }}>Importante: Datos Tratados</strong>
                                    Recomendamos que los datos estén estructurados, preferiblemente en formato de <strong>Preguntas Frecuentes (FAQ)</strong> o <strong>Problema/Solución</strong>.
                                    Esto permitirá que la IA interprete mejor la información.
                                    <br /><br />
                                    <em>Tip: Si la información es muy breve, es mejor añadirla directamente en el paso de Configuración LLM (Prompt).</em>
                                </div>
                            </div>
                        </div>

                        {/* DROPZONE DESIGN */}
                        <div
                            onClick={simulateUpload}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            style={{
                                border: `2px dashed ${isDragging ? 'var(--netelip-azul)' : '#cbd5e1'}`,
                                borderRadius: '12px',
                                padding: '40px 20px',
                                textAlign: 'center',
                                background: isDragging ? '#f0f9ff' : 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: '20px'
                            }}
                        >
                            <i className="bi bi-cloud-arrow-up" style={{ fontSize: '48px', color: 'var(--netelip-azul)', display: 'block', marginBottom: '16px' }}></i>
                            <strong style={{ fontSize: '16px', display: 'block', marginBottom: '4px' }}>Arrastra archivos aquí o haz clic para seleccionar</strong>
                            <p style={{ fontSize: '13px', color: 'var(--gris-texto)', margin: 0 }}>
                                Formatos soportados: .md, .txt, .pdf, .docx | Máximo 10 MB por archivo (Límite 3)
                            </p>
                        </div>

                        {/* FILE LIST */}
                        {knowledgeBaseFiles.length > 0 && (
                            <div className="mb-4">
                                {knowledgeBaseFiles.map((file, idx) => (
                                    <div key={idx} style={{ background: '#f1f5f9', padding: '10px 15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <div className="d-flex align-items-center gap-2">
                                            <i className="bi bi-file-earmark-text text-primary"></i>
                                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{file}</span>
                                        </div>
                                        <button type="button" className="btn btn-sm text-danger" onClick={() => removeFile(idx)}>
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* USAGE INSTRUCTIONS */}
                        <div className="form-group mb-4">
                            <label className="form-label">¿Cuándo debe usarse esta base de conocimiento?</label>
                            <textarea
                                className="form-control"
                                rows={3}
                                value={knowledgeBaseUsage}
                                onChange={(e) => updateField('knowledgeBaseUsage', e.target.value)}
                                placeholder="Ej: Usa esta información solo cuando el cliente pregunte por detalles técnicos específicos de los implantes o garantías..."
                            />
                        </div>

                        {/* ADVANCED RETRIEVAL SETTINGS */}
                        <div className="retrieval-settings" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="bi bi-sliders"></i> Configuración avanzada de retrieval
                                <i className="bi bi-info-circle text-muted" style={{ fontSize: '14px' }}></i>
                            </h4>

                            <div className="row">
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <div className="d-flex justify-content-between mb-2">
                                            <label className="form-label mb-0">Retrieval chunks</label>
                                            <span className="badge bg-primary">{retrievalChunks}</span>
                                        </div>
                                        <input
                                            type="range"
                                            className="form-range"
                                            min="1" max="10" step="1"
                                            value={retrievalChunks}
                                            onChange={(e) => updateField('retrievalChunks', parseInt(e.target.value))}
                                        />
                                        <p style={{ fontSize: '11px', color: 'var(--gris-texto)', marginTop: '8px' }}>Número de fragmentos a recuperar por consulta</p>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <div className="d-flex justify-content-between mb-2">
                                            <label className="form-label mb-0">Similarity threshold</label>
                                            <span className="badge bg-primary">{similarityThreshold}</span>
                                        </div>
                                        <input
                                            type="range"
                                            className="form-range"
                                            min="0.1" max="1.0" step="0.1"
                                            value={similarityThreshold}
                                            onChange={(e) => updateField('similarityThreshold', parseFloat(e.target.value))}
                                        />
                                        <p style={{ fontSize: '11px', color: 'var(--gris-texto)', marginTop: '8px' }}>Umbral de similitud mínimo (0.1 - 1.0)</p>
                                    </div>
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
        </div>
    );
};
