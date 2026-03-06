"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { createClient } from '../../../lib/supabase/client';

export const Step2_CompanyInfo: React.FC = () => {
    const {
        companyAddress, companyPhone, companyWebsite, companyDescription, businessHours,
        kbFiles, kbUsageInstructions,
        updateField, prevStep, nextStep
    } = useWizardStore();

    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const files = Array.from(e.target.files);

        // Reset the input immediately (synchronously) so the user can re-upload the same file later if deleted
        const inputElement = e.target;
        inputElement.value = '';

        if (kbFiles.length + files.length > 3) {
            setUploadError('Máximo 3 archivos permitidos en la base de conocimientos.');
            return;
        }

        setUploadError(null);

        setIsUploading(true);
        const newFiles = [...kbFiles];

        for (const f of files) {
            const formData = new FormData();
            formData.append('file', f);

            try {
                // Try reading workspace ID to attach to the upload
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const { data: user } = await supabase.from('users').select('workspace_id').eq('id', session.user.id).single();
                    if (user && user.workspace_id) {
                        formData.append('workspace_id', user.workspace_id);
                    }
                }

                const res = await fetch('/api/retell/knowledge-base', {
                    method: 'POST',
                    body: formData
                });

                const data = await res.json();

                if (data.success && data.knowledge_base_id) {
                    newFiles.push({
                        id: data.knowledge_base_id,
                        name: data.name,
                        retell_name: data.retell_name,
                        size: data.size,
                        type: data.type
                    });
                } else {
                    console.error('Upload error:', data.error);
                    setUploadError('Error al subir archivo ' + f.name + ': ' + data.error);
                }
            } catch (error) {
                console.error('Fetch error uploading file:', error);
                setUploadError('Error de conexión al subir archivo ' + f.name);
            }
        }

        updateField('kbFiles', newFiles);
        setIsUploading(false);
    };

    const removeFile = (index: number) => {
        const newFiles = [...kbFiles];
        newFiles.splice(index, 1);
        updateField('kbFiles', newFiles);
    };

    return (
        <div className="content-area">
            <div className="form-card">
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

                        <div className="row">
                            <div className="col-md-12">

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
                        </div>
                    </div>

                    <div className="section-divider my-5"></div>

                    {/* SECCIÓN 3: BASE DE CONOCIMIENTOS */}
                    <div className="step-section">
                        <div className="kb-header mb-4 text-center">
                            <h3>
                                <i className="bi bi-book-fill me-2" style={{ color: 'var(--netelip-azul)' }}></i>
                                Base de conocimientos
                            </h3>
                            <p className="text-muted">Sube documentos para que tu agente responda con información precisa sobre tu negocio.</p>
                        </div>

                        <div className="kb-section-container">
                            <div className="kb-warning-card">
                                <i className="bi bi-exclamation-triangle-fill"></i>
                                <div className="banner-content">
                                    <span className="kb-warning-title">Importante: Preparación de Documentos</span>
                                    <p className="m-0">
                                        Para mejores resultados, utiliza archivos estructurados como <strong>Preguntas Frecuentes (FAQ)</strong>.
                                        Límite: 3 archivos, máx 10 MB cada uno.
                                    </p>
                                </div>
                            </div>

                            {uploadError && (
                                <div style={{
                                    background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px',
                                    padding: '14px 20px', display: 'flex',
                                    alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                                    fontSize: '14px', color: '#ef4444', fontWeight: 600,
                                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.05)'
                                }}>
                                    <span><i className="bi bi-exclamation-circle-fill me-2" />{uploadError}</span>
                                    <button onClick={() => setUploadError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '20px', lineHeight: 1 }}>×</button>
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="kb-upload"
                                    className={`kb-upload-dropzone ${isUploading ? 'opacity-50' : ''}`}
                                    style={{ cursor: isUploading ? 'default' : 'pointer', width: '100%', display: 'flex' }}
                                >
                                    {isUploading ? (
                                        <div className="py-4 w-100 text-center">
                                            <div className="spinner-border text-primary mb-3" role="status"></div>
                                            <div className="fw-bold" style={{ color: 'var(--netelip-azul)' }}>Subiendo archivos...</div>
                                        </div>
                                    ) : (
                                        <div className="w-100 text-center">
                                            <div className="kb-upload-icon mx-auto mb-3">
                                                <i className="bi bi-cloud-arrow-up"></i>
                                            </div>
                                            <div className="fw-700 mb-1" style={{ fontSize: '16px', color: 'var(--oscuro)' }}>
                                                Arrastra archivos aquí o haz clic para subir
                                            </div>
                                            <div style={{ color: '#64748b', fontSize: '13px' }}>
                                                Formatos: <span className="fw-600">.md, .txt, .pdf, .docx</span>
                                            </div>
                                        </div>
                                    )}
                                </label>
                                <input
                                    type="file"
                                    id="kb-upload"
                                    style={{ display: 'none', position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: '0' }}
                                    multiple
                                    accept=".md,.txt,.pdf,.docx"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                />
                            </div>

                            <div className="kb-info-note">
                                <i className="bi bi-info-circle-fill"></i>
                                <div>
                                    <strong>Consejo:</strong> Si la información es breve, es más eficiente incluirla directamente en las
                                    instrucciones finales del agente para una respuesta más rápida.
                                </div>
                            </div>

                            {kbFiles.length > 0 && (
                                <div className="kb-file-grid">
                                    {kbFiles.map((file, idx) => (
                                        <div key={idx} className="kb-file-card">
                                            <div className="kb-file-icon">
                                                <i className="bi bi-file-earmark-text"></i>
                                            </div>
                                            <div className="kb-file-info">
                                                <span className="kb-file-name" title={file.name}>{file.name}</span>
                                                <div className="kb-file-meta">
                                                    <span>{file.size}</span>
                                                    {file.retell_name && <span className="kb-retell-badge">ID: {file.retell_name}</span>}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className="kb-btn-remove"
                                                onClick={() => removeFile(idx)}
                                                title="Eliminar archivo"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="form-group mb-0 mt-2">
                                <label className="form-label fw-bold">
                                    Instrucciones de uso de la base
                                    <div className="custom-tooltip ms-2">
                                        <i className="bi bi-question-circle tooltip-icon" style={{ fontSize: '14px' }}></i>
                                        <div className="tooltip-content">
                                            Explica al agente cuándo debe consultar estos documentos (ej: &quot;Solo para precios técnicos&quot;).
                                        </div>
                                    </div>
                                </label>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    style={{ borderRadius: '12px', padding: '14px' }}
                                    placeholder="Ej: Consulta esta información solo para dudas técnicas sobre implantes y tiempos de recuperación."
                                    value={kbUsageInstructions}
                                    onChange={(e) => updateField('kbUsageInstructions', e.target.value)}
                                />
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
