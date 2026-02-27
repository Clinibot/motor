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
                        <h3 className="step-section-title mb-4">
                            <i className="bi bi-book-fill me-2" style={{ color: '#64748b' }}></i>
                            Base de conocimientos
                        </h3>

                        <div className="row">
                            <div className="col-md-12">
                                <p className="text-muted small mb-4">Sube documentos que tu agente podrá consultar para responder con información precisa.</p>

                                <div className="warning-box mb-4">
                                    <i className="bi bi-exclamation-triangle-fill me-3"></i>
                                    <div>
                                        <strong className="d-block mb-1">Importante: Datos Tratados</strong>
                                        <p className="mb-0">Recomendamos documentos estructurados en formato <strong>Preguntas Frecuentes (FAQ)</strong> o <strong>Problema/Solución</strong>. Límite máximo de 3 archivos (máx 10 MB/cada uno).</p>
                                    </div>
                                </div>

                                {uploadError && (
                                    <div style={{
                                        background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px',
                                        padding: '12px 16px', marginBottom: '12px', display: 'flex',
                                        alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                                        fontSize: '13px', color: '#ef4444', fontWeight: 500,
                                    }}>
                                        <span><i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '8px' }} />{uploadError}</span>
                                        <button onClick={() => setUploadError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '16px', lineHeight: 1 }}>×</button>
                                    </div>
                                )}
                                <div className={`kb-upload-area ${isUploading ? 'opacity-50' : ''}`} onClick={() => { if (!isUploading) document.getElementById('kb-upload')?.click() }}>
                                    {isUploading ? (
                                        <div className="py-3">
                                            <div className="spinner-border text-primary mb-2" role="status"></div>
                                            <div className="fw-bold">Subiendo archivo(s)...</div>
                                        </div>
                                    ) : (
                                        <>
                                            <i className="bi bi-cloud-arrow-up-fill mb-2" style={{ fontSize: '30px', color: '#cbd5e1' }}></i>
                                            <div className="fw-bold">Arrastra archivos aquí o haz clic para subir</div>
                                            <div className="text-muted small">Formatos: .md, .txt, .pdf, .docx</div>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        id="kb-upload"
                                        className="d-none"
                                        multiple
                                        accept=".md,.txt,.pdf,.docx"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                    />
                                </div>

                                <div className="alert alert-info mt-3 d-flex align-items-center" role="alert" style={{ fontSize: '0.9rem' }}>
                                    <i className="bi bi-info-circle-fill me-2" style={{ fontSize: '1.2rem' }}></i>
                                    <div>
                                        Si la información que quieres añadir no es muy extensa, es recomendable añadirla en las instrucciones finales que se generarán para el agente en lugar de subir un archivo.
                                    </div>
                                </div>

                                {kbFiles.length > 0 && (
                                    <div className="kb-file-list mt-3">
                                        {kbFiles.map((file, idx) => (
                                            <div key={idx} className="kb-file-item">
                                                <div className="d-flex flex-column flex-grow-1">
                                                    <div className="d-flex align-items-center">
                                                        <i className="bi bi-file-earmark-text me-2 text-primary"></i>
                                                        <span className="file-name">{file.name}</span>
                                                        <span className="file-size ms-2">({file.size})</span>
                                                    </div>
                                                    {file.retell_name && (
                                                        <div className="small text-muted mt-1 ps-4" style={{ fontSize: '0.75rem' }}>
                                                            <strong>ID para Prompt:</strong> <code>{file.retell_name}</code>
                                                        </div>
                                                    )}
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
