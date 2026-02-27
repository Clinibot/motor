"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step2_LLM: React.FC = () => {
    const {
        model, temperature, highPriority, whoFirst, beginMessage, personality, tone,
        knowledgeBaseFiles, knowledgeBaseUsage, retrievalChunks, similarityThreshold,
        updateField, prevStep, nextStep
    } = useWizardStore();

    const [isDragging, setIsDragging] = useState(false);

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        nextStep();
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

    const togglePersonality = (trait: string) => {
        const newPersonality = personality.includes(trait)
            ? personality.filter(p => p !== trait)
            : [...personality, trait];
        updateField('personality', newPersonality);
    };

    const personalityOptions = [
        { id: 'profesional', label: 'Profesional' },
        { id: 'amigable', label: 'Amigable / Cercano' },
        { id: 'empatico', label: 'Empático' },
        { id: 'divertido', label: 'Divertido / Humor' },
        { id: 'directo', label: 'Directo / Conciso' },
        { id: 'persuasivo', label: 'Persuasivo' }
    ];

    return (
        <div className="content-area">
            <div className="form-card">
                <h1 className="section-title">
                    Configuración LLM
                    <div className="custom-tooltip">
                        <i className="bi bi-info-circle tooltip-icon"></i>
                        <div className="tooltip-content">
                            El Cerebro de tu agente. Aquí defines qué modelo de lenguaje usará y cuáles serán sus rasgos de personalidad y base de conocimientos.
                        </div>
                    </div>
                </h1>
                <p className="section-subtitle">
                    Define las instrucciones, el modelo de lenguaje y el conocimiento de tu agente.
                </p>

                <form onSubmit={handleNext}>
                    {/* SECCIÓN 1: CONFIGURACIÓN DEL MODELO */}
                    <div className="section-group mb-5">
                        <h3 className="section-group-title mb-4">
                            <i className="bi bi-cpu me-2"></i> Configuración del Modelo
                        </h3>

                        <div className="row">
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label className="form-label">Modelo LLM</label>
                                    <select
                                        className="form-control"
                                        value={model}
                                        onChange={(e) => updateField('model', e.target.value)}
                                    >
                                        <option value="gpt-4.1">GPT-4.1 (Recomendado)</option>
                                        <option value="gpt-4o">GPT-4o (Omni)</option>
                                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                        <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                                    </select>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="form-group">
                                    <div className="d-flex justify-content-between mb-2">
                                        <label className="form-label mb-0">Temperatura</label>
                                        <span className="badge bg-primary">{temperature}</span>
                                    </div>
                                    <input
                                        type="range"
                                        className="form-range"
                                        min="0" max="1" step="0.1"
                                        value={temperature}
                                        onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                                    />
                                    <p className="text-muted small mt-1">Valores bajos son más deterministas, valores altos más creativos.</p>
                                </div>
                            </div>
                        </div>

                        <div className="form-check form-switch mt-3">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="highPriority"
                                checked={highPriority}
                                onChange={(e) => updateField('highPriority', e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="highPriority">
                                Activar modelo de alta prioridad
                                <span className="text-muted small ms-2">(Reduce latencia, coste superior)</span>
                            </label>
                        </div>
                    </div>

                    <hr className="my-5" />

                    {/* SECCIÓN 2: MENSAJE Y COMPORTAMIENTO */}
                    <div className="section-group mb-5">
                        <h3 className="section-group-title mb-4">
                            <i className="bi bi-chat-quote me-2"></i> Mensaje y Comportamiento
                        </h3>

                        <div className="form-group mb-4">
                            <label className="form-label d-block mb-3">¿Quién inicia la conversación?</label>
                            <div className="d-flex gap-4">
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="whoFirst"
                                        id="firstAgent"
                                        checked={whoFirst === 'agent'}
                                        onChange={() => updateField('whoFirst', 'agent')}
                                    />
                                    <label className="form-check-label" htmlFor="firstAgent">
                                        El Agente
                                    </label>
                                </div>
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="whoFirst"
                                        id="firstUser"
                                        checked={whoFirst === 'user'}
                                        onChange={() => updateField('whoFirst', 'user')}
                                    />
                                    <label className="form-check-label" htmlFor="firstUser">
                                        El Usuario
                                    </label>
                                </div>
                            </div>
                        </div>

                        {whoFirst === 'agent' && (
                            <div className="form-group mb-4 animate-fade-in">
                                <label className="form-label">Mensaje de inicio</label>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    value={beginMessage}
                                    onChange={(e) => updateField('beginMessage', e.target.value)}
                                    placeholder="Ej: Hola, soy Sofía de DentaDent. ¿En qué puedo ayudarte hoy?"
                                />
                                <div className="alert alert-info mt-2 py-2 px-3 border-0 bg-light-blue" style={{ fontSize: '12px' }}>
                                    <i className="bi bi-info-circle me-1"></i>
                                    Este mensaje será lo primero que diga el agente al descolgar la llamada.
                                </div>
                            </div>
                        )}

                        <div className="row">
                            <div className="col-md-7">
                                <div className="form-group">
                                    <label className="form-label mb-3">Personalidad del Agente</label>
                                    <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                        {personalityOptions.map(opt => (
                                            <div key={opt.id} className="form-check custom-checkbox-card">
                                                <input
                                                    className="form-check-input d-none"
                                                    type="checkbox"
                                                    id={`trait-${opt.id}`}
                                                    checked={personality.includes(opt.id)}
                                                    onChange={() => togglePersonality(opt.id)}
                                                />
                                                <label
                                                    className={`personality-pill ${personality.includes(opt.id) ? 'active' : ''}`}
                                                    htmlFor={`trait-${opt.id}`}
                                                >
                                                    {opt.label}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-5">
                                <div className="form-group">
                                    <label className="form-label mb-3">Tono de comunicación</label>
                                    <div className="tone-selector">
                                        <button
                                            type="button"
                                            className={`tone-btn ${tone === 'formal' ? 'active' : ''}`}
                                            onClick={() => updateField('tone', 'formal')}
                                        >
                                            Formal
                                        </button>
                                        <button
                                            type="button"
                                            className={`tone-btn ${tone === 'semiformal' ? 'active' : ''}`}
                                            onClick={() => updateField('tone', 'semiformal')}
                                        >
                                            Semiformal
                                        </button>
                                        <button
                                            type="button"
                                            className={`tone-btn ${tone === 'casual' ? 'active' : ''}`}
                                            onClick={() => updateField('tone', 'casual')}
                                        >
                                            Casual
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="my-5" />

                    {/* SECCIÓN 3: BASE DE CONOCIMIENTOS */}
                    <div className="section-group mb-5">
                        <h1 className="section-title mb-8" style={{ fontSize: '20px', fontWeight: 700 }}>
                            <i className="bi bi-book me-2"></i> Base de conocimientos
                        </h1>
                        <p className="section-subtitle">
                            Sube documentos que tu agente podrá consultar para responder con información precisa.
                        </p>

                        <div className="alert alert-warning mb-4" style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '10px' }}>
                            <div className="d-flex gap-3">
                                <i className="bi bi-exclamation-triangle-fill" style={{ color: '#d97706', fontSize: '20px' }}></i>
                                <div style={{ fontSize: '13px', color: '#92400e' }}>
                                    <strong style={{ display: 'block', marginBottom: '4px' }}>Importante: Datos Tratados</strong>
                                    Recomendamos documentos estructurados en formato <strong>Preguntas Frecuentes (FAQ)</strong> o <strong>Problema/Solución</strong>.
                                    <br />
                                    <em>Límite máximo de 3 archivos (máx 10 MB/cada uno).</em>
                                </div>
                            </div>
                        </div>

                        <div
                            onClick={simulateUpload}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            className={`dropzone ${isDragging ? 'dragging' : ''}`}
                            style={{
                                border: `2px dashed ${isDragging ? 'var(--netelip-azul)' : '#cbd5e1'}`,
                                borderRadius: '12px',
                                padding: '30px 20px',
                                textAlign: 'center',
                                background: isDragging ? '#f0f9ff' : 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: '20px'
                            }}
                        >
                            <i className="bi bi-cloud-arrow-up h1 text-primary mb-3 d-block"></i>
                            <strong>Arrastra archivos aquí o haz clic para subir</strong>
                            <p className="text-muted small m-0">Formatos: .md, .txt, .pdf, .docx</p>
                        </div>

                        {knowledgeBaseFiles.length > 0 && (
                            <div className="file-list mb-4">
                                {knowledgeBaseFiles.map((file, idx) => (
                                    <div key={idx} className="file-item d-flex justify-content-between align-items-center p-2 bg-light rounded mb-2 border">
                                        <div className="d-flex align-items-center gap-2">
                                            <i className="bi bi-file-earmark-text text-primary"></i>
                                            <span className="small fw-bold">{file}</span>
                                        </div>
                                        <button type="button" className="btn btn-link btn-sm text-danger p-0" onClick={() => removeFile(idx)}>
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="form-group mb-4">
                            <label className="form-label">Instrucciones de uso de la base</label>
                            <textarea
                                className="form-control"
                                rows={2}
                                value={knowledgeBaseUsage}
                                onChange={(e) => updateField('knowledgeBaseUsage', e.target.value)}
                                placeholder="Ej: Consulta esta información solo para dudas técnicas sobre implantes..."
                            />
                        </div>

                        {/* CONFIGURACIÓN AVANZADA KB */}
                        <div className="advanced-kb-config p-3 border rounded bg-light">
                            <h4 className="small fw-bold mb-3"><i className="bi bi-sliders me-1"></i> Configuración avanzada del retrieval</h4>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="small fw-bold d-block mb-1">Fragmentos (Chunks): {retrievalChunks}</label>
                                    <input
                                        type="range"
                                        className="form-range"
                                        min="1" max="10" step="1"
                                        value={retrievalChunks}
                                        onChange={(e) => updateField('retrievalChunks', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="small fw-bold d-block mb-1">Umbral Similitud: {similarityThreshold}</label>
                                    <input
                                        type="range"
                                        className="form-range"
                                        min="0.1" max="1" step="0.1"
                                        value={similarityThreshold}
                                        onChange={(e) => updateField('similarityThreshold', parseFloat(e.target.value))}
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
                .personality-pill {
                    display: block;
                    padding: 8px 12px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 13px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: white;
                }
                .personality-pill:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                }
                .personality-pill.active {
                    background: var(--netelip-azul);
                    color: white;
                    border-color: var(--netelip-azul);
                }
                .tone-selector {
                    display: flex;
                    gap: 8px;
                    background: #f1f5f9;
                    padding: 4px;
                    border-radius: 8px;
                }
                .tone-btn {
                    flex: 1;
                    padding: 6px 12px;
                    border: none;
                    background: transparent;
                    border-radius: 6px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .tone-btn.active {
                    background: white;
                    color: var(--netelip-azul);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    font-weight: 600;
                }
                .bg-light-blue {
                    background-color: #f0f9ff;
                    color: #0369a1;
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};
