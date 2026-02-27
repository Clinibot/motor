"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

/* ─── Estilos locales fieles al HTML de referencia wizard-paso8-netelip.html ─── */
const S = {
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '24px',
        marginBottom: '32px',
    } as React.CSSProperties,
    summaryCard: {
        background: '#f5f6f8',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        padding: '24px',
    } as React.CSSProperties,
    summaryCardFullWidth: {
        gridColumn: '1 / -1',
        background: '#f5f6f8',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        padding: '24px',
    } as React.CSSProperties,
    summaryCardHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
    } as React.CSSProperties,
    summaryCardTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    } as React.CSSProperties,
    summaryCardIcon: {
        width: '40px',
        height: '40px',
        background: 'white',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
    } as React.CSSProperties,
    summaryCardH3: {
        fontSize: '16px',
        fontWeight: 700,
        color: '#1a2428',
        margin: 0,
    } as React.CSSProperties,
    editBtn: {
        background: 'white',
        border: '1px solid #e5e7eb',
        color: '#6c757d',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s',
    } as React.CSSProperties,
    summaryContent: {
        background: 'white',
        borderRadius: '8px',
        padding: '16px',
    } as React.CSSProperties,
    summaryItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #e5e7eb',
    } as React.CSSProperties,
    summaryItemLast: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
    } as React.CSSProperties,
    summaryLabel: {
        fontSize: '13px',
        fontWeight: 600,
        color: '#6c757d',
    } as React.CSSProperties,
    summaryValue: {
        fontSize: '14px',
        fontWeight: 600,
        color: '#1a2428',
        textAlign: 'right' as const,
        maxWidth: '60%',
        wordWrap: 'break-word' as const,
    } as React.CSSProperties,
    alertSuccess: {
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    } as React.CSSProperties,
    alertDanger: {
        background: '#fff1f2',
        border: '1px solid #fecdd3',
        borderRadius: '8px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
    } as React.CSSProperties,
    actionButtons: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginTop: '32px',
        paddingTop: '32px',
        borderTop: '2px solid #e5e7eb',
    } as React.CSSProperties,
    btnCreateAgent: {
        padding: '14px 20px',
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '14px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        background: '#10b981',
        color: 'white',
        transition: 'all 0.2s',
    } as React.CSSProperties,
    btnBack: {
        padding: '12px 24px',
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '14px',
        background: 'white',
        color: '#6c757d',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    } as React.CSSProperties,
    wizardActions: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '40px',
        paddingTop: '28px',
        borderTop: '1px solid #e5e7eb',
    } as React.CSSProperties,
};

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
    return (
        <div style={last ? S.summaryItemLast : S.summaryItem}>
            <span style={S.summaryLabel}>{label}</span>
            <span style={S.summaryValue}>{value}</span>
        </div>
    );
}

function SummaryCard({
    icon, color, title, step, onEdit, children,
    fullWidth = false,
}: {
    icon: string; color: string; title: string; step: number;
    onEdit: (s: number) => void; children: React.ReactNode; fullWidth?: boolean;
}) {
    return (
        <div style={fullWidth ? S.summaryCardFullWidth : S.summaryCard}>
            <div style={S.summaryCardHeader}>
                <div style={S.summaryCardTitle}>
                    <div style={S.summaryCardIcon}>
                        <i className={`bi ${icon}`} style={{ color }} />
                    </div>
                    <h3 style={S.summaryCardH3}>{title}</h3>
                </div>
                <button style={S.editBtn} onClick={() => onEdit(step)}>
                    <i className="bi bi-pencil" /> Editar
                </button>
            </div>
            <div style={S.summaryContent}>{children}</div>
        </div>
    );
}

export const Step8_Summary: React.FC = () => {
    const wizardData = useWizardStore();
    const { setStep, prevStep, updateField } = wizardData;

    const [isCreating, setIsCreating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasGeneratedPrompt, setHasGeneratedPrompt] = useState(false);
    const editingAgentId = wizardData.editingAgentId;

    const getAgentTypeName = (type: string) => {
        const types: Record<string, string> = {
            'transferencia': 'Transferencia de llamadas',
            'agendamiento': 'Agendamiento de citas',
            'cualificacion': 'Cualificación y atención',
        };
        return types[type] || type || 'No definido';
    };

    const getLanguageName = (lang: string) => {
        const names: Record<string, string> = {
            'es-ES': 'Español (España)', 'es-MX': 'Español (México)',
            'es-AR': 'Español (Argentina)', 'es-419': 'Español (Latam)',
            'en-US': 'Inglés (USA)', 'en-GB': 'Inglés (UK)',
            'pt-BR': 'Portugués (Brasil)', 'fr-FR': 'Francés',
        };
        return names[lang] || lang || 'No definido';
    };

    const generateAllInstructions = () => {
        setIsGenerating(true);
        const name = wizardData.agentName || 'Sofía';
        const company = wizardData.companyName || 'nuestra empresa';
        const formattedHours = wizardData.businessHours
            .map(h => `- ${h.day}: ${h.closed ? 'Cerrado' : `de ${h.open} a ${h.close}`}`)
            .join('\n');
        const personalityStr = wizardData.personality.length > 0
            ? `Tu personalidad es: ${wizardData.personality.join(', ')}.`
            : 'Tienes una personalidad profesional y atenta.';
        const toneStr = `Tu tono de comunicación es ${wizardData.tone}.`;
        const langMap: Record<string, string> = {
            'es-ES': 'español de España', 'es-MX': 'español con acento mexicano',
            'es-AR': 'español con acento argentino', 'es-419': 'español latinoamericano neutro',
            'en-US': 'inglés americano', 'en-GB': 'inglés británico',
            'pt-BR': 'portugués de Brasil', 'fr-FR': 'francés',
        };
        const langStr = langMap[wizardData.language] || 'español';

        const baseInstructions = `# Idioma\nHabla siempre en ${langStr}. No cambies de idioma a menos que el usuario lo solicite explícitamente.\n\n# Rol\nEres ${name} de ${company}.\nTu misión es atender las llamadas de forma humana, cálida y eficiente, evitando sonar como un robot.\n\n## Estilo de Comunicación\n- ${personalityStr}\n- ${toneStr}\n- Frases cortas y directas.\n- Empatía y escucha activa.\n- Nunca hagas más de una pregunta a la vez.\n- REGLA CRÍTICA: No repitas datos que el usuario ya ha dicho. Pasa a la siguiente tarea.\n\n## Tareas Principales\n${wizardData.agentType === 'transferencia' ? `### Identificación y Transferencia\n1. Entiende el motivo de la llamada.\n2. Si es necesario, informa que vas a transferir la llamada a un compañero.\n` : wizardData.agentType === 'agendamiento' ? `### Agendamiento\n1. Resuelve dudas sobre los servicios.\n2. Si el usuario quiere una cita, verifica disponibilidad usando tus herramientas.\n3. Pide nombre y datos necesarios para confirmar.\n` : `### Resolución y Cualificación\n1. Resuelve dudas sobre ${company}.\n2. Interésate por las necesidades del cliente.\n3. Si hay variables específicas a extraer, asegúrate de obtenerlas de forma natural.\n`}\n${wizardData.enableTransfer && wizardData.transferDestinations.length > 0 ? `### Política de Transferencias\nPuedes transferir si el usuario lo solicita o si no puedes resolver el problema.\n${wizardData.transferDestinations.filter(d => d.number).map(d => {
            const toolName = `transfer_call_${d.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'agent'}`;
            return `- **${d.name}**: ${d.description || d.number} (llama a la función \`${toolName}\`)`;
        }).join('\n')}\n` : ''}\n${wizardData.extractionVariables.length > 0 ? `### Datos a Extraer\n${wizardData.extractionVariables.map(v => `- **${v.name}** (${v.type}): ${v.description}`).join('\n')}\n` : ''}\n\n### Despedida\nAntes de terminar, pregunta si hay algo más en lo que puedas ayudar. Despídete cordialmente.\n\n${wizardData.kbFiles.length > 0 ? `## CONTEXTO ADICIONAL (Base de Conocimientos)\n${wizardData.kbUsageInstructions || 'Usa la información de tus documentos para responder preguntas específicas sobre servicios o productos.'}\n` : ''}\n# Información de Contacto y Horarios\n- Dirección: ${wizardData.companyAddress || 'No especificada'}\n- Teléfono: ${wizardData.companyPhone || 'No especificado'}\n- Web: ${wizardData.companyWebsite || 'No especificada'}\n\n### Horarios comerciales:\n${formattedHours}\n\n# Reglas de Terminación\nSi el usuario se despide o no necesita nada más, despídete y usa la herramienta 'end_call' inmediatamente.\n`;

        setTimeout(() => {
            updateField('prompt', baseInstructions);
            setIsGenerating(false);
            setHasGeneratedPrompt(true);
        }, 1500);
    };

    const handleCreateAgent = async () => {
        const missing = [];
        if (!wizardData.agentName) missing.push('Nombre del agente');
        if (!wizardData.model) missing.push('Modelo LLM');
        if (!wizardData.voiceId) missing.push('Voz');
        if (!wizardData.prompt || wizardData.prompt.length < 50) missing.push('Prompt (necesitas generarlo)');

        if (missing.length > 0) {
            setErrorMessage(`Faltan campos obligatorios: ${missing.join(', ')}`);
            setShowError(true);
            return;
        }
        setIsCreating(true);
        try {
            const method = editingAgentId ? 'PATCH' : 'POST';
            const bodyObj = editingAgentId ? { ...wizardData, id: editingAgentId } : wizardData;
            const response = await fetch('/api/retell/agent', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyObj),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Error al comunicarse con el servidor');
            setShowSuccess(true);
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : 'Error al crear el agente');
            setShowError(true);
        } finally {
            setIsCreating(false);
        }
    };

    /* ── PANTALLA ÉXITO ── */
    if (showSuccess) {
        return (
            <div className="content-area">
                <div className="form-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
                    <div style={{
                        width: '80px', height: '80px', background: '#f0fdf4', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
                    }}>
                        <i className="bi bi-check-circle-fill" style={{ fontSize: '48px', color: '#10b981' }} />
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a2428', marginBottom: '12px' }}>
                        ¡Agente IA {editingAgentId ? 'actualizado' : 'creado'} con éxito!
                    </h2>
                    <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '28px' }}>
                        Tu agente <strong>{wizardData.agentName}</strong> {editingAgentId ? 'se ha guardado correctamente' : 'está configurado y listo para usar'}.
                    </p>
                    <button
                        style={{ ...S.btnCreateAgent, padding: '14px 32px', fontSize: '15px', margin: '0 auto' }}
                        onClick={() => window.location.href = '/dashboard/agents'}
                    >
                        <i className="bi bi-grid-fill" /> Ir al Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="content-area">
            <div className="form-card">
                <h1 className="section-title">Resumen de configuración</h1>
                <p className="section-subtitle">
                    Revisa todos los detalles de tu agente antes de crearlo. Puedes editar cualquier paso si necesitas hacer cambios.
                </p>

                {/* BANNER ÉXITO CONFIGURACIÓN */}
                <div style={S.alertSuccess}>
                    <i className="bi bi-check-circle-fill" style={{ fontSize: '32px', color: '#10b981' }} />
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a2428', margin: '0 0 6px 0' }}>
                            ¡Configuración completada!
                        </h3>
                        <p style={{ fontSize: '14px', color: '#6c757d', margin: 0 }}>
                            Has completado todos los pasos. Revisa el resumen y crea tu agente.
                        </p>
                    </div>
                </div>

                {/* ERROR */}
                {showError && (
                    <div style={S.alertDanger}>
                        <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: 500 }}>
                            <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '8px' }} />
                            {errorMessage}
                        </span>
                        <button onClick={() => setShowError(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#ef4444', lineHeight: 1 }}>×</button>
                    </div>
                )}

                {/* SUMMARY GRID */}
                <div style={S.summaryGrid}>

                    {/* Paso 1 */}
                    <SummaryCard icon="bi-info-circle-fill" color="#267ab0" title="Paso 1: Información básica" step={1} onEdit={setStep}>
                        <SummaryRow label="Nombre del agente" value={wizardData.agentName || '—'} />
                        <SummaryRow label="Tipo de agente" value={getAgentTypeName(wizardData.agentType)} />
                        <SummaryRow label="Empresa" value={wizardData.companyName || '—'} last />
                    </SummaryCard>

                    {/* Paso 2 */}
                    <SummaryCard icon="bi-robot" color="#267ab0" title="Paso 2: Configuración LLM" step={2} onEdit={setStep}>
                        <SummaryRow label="Modelo de IA" value={wizardData.model || '—'} />
                        <SummaryRow label="Temperature" value={String(wizardData.temperature)} />
                        <SummaryRow label="Base de conocimientos" value={`${wizardData.kbFiles.length} archivo(s)`} last />
                    </SummaryCard>

                    {/* Paso 3 */}
                    <SummaryCard icon="bi-building" color="#267ab0" title="Paso 3: Empresa y horarios" step={3} onEdit={setStep}>
                        <SummaryRow label="Empresa" value={wizardData.companyName || '—'} />
                        <SummaryRow label="Web" value={wizardData.companyWebsite || '—'} />
                        <SummaryRow label="Días activos" value={`${wizardData.businessHours.filter(h => !h.closed).length} días`} last />
                    </SummaryCard>

                    {/* Paso 4 */}
                    <SummaryCard icon="bi-mic-fill" color="#10b981" title="Paso 4: Voz" step={4} onEdit={setStep}>
                        <SummaryRow label="Voz seleccionada" value={wizardData.voiceName || '—'} />
                        <SummaryRow label="Velocidad" value={`${wizardData.voiceSpeed}x`} last />
                    </SummaryCard>

                    {/* Paso 5 */}
                    <SummaryCard icon="bi-chat-dots-fill" color="#267ab0" title="Paso 5: Conversación" step={5} onEdit={setStep}>
                        <SummaryRow label="Idioma" value={getLanguageName(wizardData.language)} />
                        <SummaryRow label="Personalidad" value={wizardData.personality.join(', ') || '—'} />
                        <SummaryRow label="Tono" value={wizardData.tone || '—'} last />
                    </SummaryCard>

                    {/* Paso 6 */}
                    <SummaryCard icon="bi-clock-fill" color="#f59e0b" title="Paso 6: Tiempos" step={6} onEdit={setStep}>
                        <SummaryRow label="Tiempo máx. silencio" value={`${Math.round((wizardData.endCallAfterSilenceMs ?? 0) / 1000)}s`} />
                        <SummaryRow label="Tiempo máx. llamada" value={`${Math.round((wizardData.maxCallDurationMs ?? 0) / 60000)} min`} last />
                    </SummaryCard>

                    {/* Paso 7 Full Width */}
                    <SummaryCard icon="bi-gear-fill" color="#267ab0" title="Paso 7: Configuración avanzada" step={7} onEdit={setStep} fullWidth>
                        <SummaryRow label="Transferencias activas" value={wizardData.enableTransfer ? `Sí (${wizardData.transferDestinations.length} destinos)` : 'No'} />
                        <SummaryRow label="Variables de extracción" value={`${wizardData.extractionVariables.length} variable(s)`} />
                        <SummaryRow label="Herramientas externas" value={wizardData.enableCustomTools ? `Sí (${wizardData.customTools.length} herramientas)` : 'No'} last />
                    </SummaryCard>
                </div>

                {/* PROMPT */}
                {!hasGeneratedPrompt ? (
                    <div style={{
                        background: 'linear-gradient(145deg, #f8f9fa, #e9ecef)',
                        border: '1px dashed #ced4da',
                        borderRadius: '12px',
                        padding: '48px',
                        textAlign: 'center',
                        marginBottom: '32px',
                    }}>
                        <i className="bi bi-robot" style={{ fontSize: '48px', color: '#267ab0', opacity: 0.8, display: 'block', marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1a2428', marginBottom: '12px' }}>¡Casi listo!</h3>
                        <p style={{ fontSize: '14px', color: '#6c757d', maxWidth: '480px', margin: '0 auto 24px' }}>
                            Genera el Prompt (las instrucciones maestras del agente) basado en toda tu configuración.
                        </p>
                        <button
                            onClick={generateAllInstructions}
                            disabled={isGenerating}
                            style={{
                                ...S.btnCreateAgent,
                                padding: '14px 32px',
                                borderRadius: '30px',
                                fontSize: '16px',
                                fontWeight: 700,
                                boxShadow: '0 8px 20px rgba(38,122,176,0.3)',
                                background: isGenerating ? '#6c757d' : '#267ab0',
                                cursor: isGenerating ? 'wait' : 'pointer',
                            }}
                        >
                            {isGenerating ? (
                                <><span className="spinner-border spinner-border-sm me-2" /> Redactando instrucciones...</>
                            ) : (
                                <><i className="bi bi-magic" /> Generar Prompt Mágico</>
                            )}
                        </button>
                    </div>
                ) : (
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                            <div>
                                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1a2428', marginBottom: '4px' }}>
                                    <i className="bi bi-terminal me-2" /> Instrucciones del Agente
                                </h4>
                                <p style={{ fontSize: '13px', color: '#10b981', fontWeight: 600, margin: 0 }}>
                                    <i className="bi bi-check-circle-fill me-1" /> Generadas correctamente. Puedes editarlas.
                                </p>
                            </div>
                            <button onClick={generateAllInstructions} disabled={isGenerating}
                                style={{ ...S.editBtn, borderColor: '#267ab0', color: '#267ab0' }}>
                                {isGenerating ? 'Regenerando...' : <><i className="bi bi-arrow-clockwise" /> Regenerar</>}
                            </button>
                        </div>
                        <textarea
                            rows={18}
                            value={wizardData.prompt}
                            onChange={(e) => updateField('prompt', e.target.value)}
                            style={{
                                width: '100%',
                                fontFamily: 'monospace',
                                fontSize: '13.5px',
                                lineHeight: '1.6',
                                backgroundColor: '#272822',
                                color: '#f8f8f2',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '16px',
                                resize: 'vertical',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                            }}
                        />
                    </div>
                )}

                {/* ACTION BUTTONS */}
                <div style={S.actionButtons}>
                    <button
                        onClick={handleCreateAgent}
                        disabled={isCreating || !hasGeneratedPrompt}
                        style={{
                            ...S.btnCreateAgent,
                            background: editingAgentId ? '#267ab0' : '#10b981',
                            opacity: (!hasGeneratedPrompt || isCreating) ? 0.6 : 1,
                            cursor: (!hasGeneratedPrompt || isCreating) ? 'not-allowed' : 'pointer',
                            fontSize: '15px',
                        }}
                    >
                        {isCreating ? (
                            <><span className="spinner-border spinner-border-sm" /> {editingAgentId ? 'Guardando cambios...' : 'Creando agente...'}</>
                        ) : (
                            <><i className={editingAgentId ? 'bi bi-floppy' : 'bi bi-rocket-takeoff-fill'} />
                                {editingAgentId ? 'Guardar Cambios' : 'Crear Agente IA'}
                            </>
                        )}
                    </button>
                </div>

                {/* WIZARD ACTIONS */}
                <div style={S.wizardActions}>
                    <button style={S.btnBack} onClick={prevStep} disabled={isCreating}>
                        <i className="bi bi-arrow-left" /> Anterior
                    </button>
                </div>
            </div>
        </div>
    );
};
