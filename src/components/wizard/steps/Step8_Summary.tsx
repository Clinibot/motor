"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

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
            'cualificacion': 'Cualificación y atención'
        };
        return types[type] || type || 'No definido';
    };

    const getLanguageName = (lang: string) => {
        const names: Record<string, string> = {
            'es-ES': 'Español (España)',
            'es-MX': 'Español (México)',
            'es-AR': 'Español (Argentina)',
            'es-419': 'Español (Latam)',
            'en-US': 'Inglés (USA)',
            'en-GB': 'Inglés (UK)',
            'pt-BR': 'Portugués (Brasil)',
            'fr-FR': 'Francés'
        };
        return names[lang] || lang || 'No definido';
    };

    const generateAllInstructions = () => {
        setIsGenerating(true);

        const name = wizardData.agentName || "Sofía";
        const company = wizardData.companyName || "nuestra empresa";

        // Format business hours
        const formattedHours = wizardData.businessHours
            .map(h => `- ${h.day}: ${h.closed ? 'Cerrado' : `de ${h.open} a ${h.close}`}`)
            .join('\n');

        const personalityStr = wizardData.personality.length > 0
            ? `Tu personalidad es: ${wizardData.personality.join(', ')}.`
            : 'Tienes una personalidad profesional y atenta.';

        const toneStr = `Tu tono de comunicación es ${wizardData.tone}.`;

        const langMap: Record<string, string> = {
            'es-ES': 'español de España',
            'es-MX': 'español con acento mexicano',
            'es-AR': 'español con acento argentino',
            'es-419': 'español latinoamericano neutro',
            'en-US': 'inglés americano',
            'en-GB': 'inglés británico',
            'pt-BR': 'portugués de Brasil',
            'fr-FR': 'francés'
        };
        const langStr = langMap[wizardData.language] || 'español';

        const baseInstructions = `# Idioma
Habla siempre en ${langStr}. No cambies de idioma a menos que el usuario lo solicite explícitamente.

# Rol
Eres ${name} de ${company}. ${personalityStr} ${toneStr}
Tu misión es atender las llamadas de forma humana, cálida y eficiente, evitando sonar como un robot.

## Estilo de Comunicación
- Frases cortas y directas.
- Empatía y escucha activa.
- Nunca hagas más de una pregunta a la vez.
- REGLA CRÍTICA: No repitas datos que el usuario ya ha dicho. Pasa a la siguiente tarea.

## Tareas Principales
${wizardData.agentType === 'transferencia' ? `
### Identificación y Transferencia
1. Entiende el motivo de la llamada.
2. Si es necesario, informa que vas a transferir la llamada a un compañero.
` : wizardData.agentType === 'agendamiento' ? `
### Agendamiento
1. Resuelve dudas sobre los servicios.
2. Si el usuario quiere una cita, verifica disponibilidad usando tus herramientas.
3. Pide nombre y datos necesarios para confirmar.
` : `
### Resolución y Cualificación
1. Resuelve dudas sobre ${company}.
2. Interésate por las necesidades del cliente.
3. Si hay variables específicas a extraer, asegúrate de obtenerlas de forma natural.
`}

${wizardData.enableTransfer && wizardData.transferDestinations.length > 0 ? `
### Política de Transferencias
Puedes transferir la llamada si el usuario lo solicita explícitamente o si no puedes resolver el problema.
Destinos disponibles:
${wizardData.transferDestinations.map(d => `- **${d.name}**: ${d.description || 'Soporte especializado'} (usa la herramienta transfer_call a ${d.number})`).join('\n')}
` : ''}

${wizardData.extractionVariables.length > 0 ? `
### Datos a Extraer
Asegúrate de conseguir la siguiente información durante la conversación de forma conversacional:
${wizardData.extractionVariables.map(v => `- **${v.name}** (${v.type}): ${v.description}`).join('\n')}
` : ''}

${wizardData.enableCustomTools && wizardData.customTools.length > 0 ? `
### API y Herramientas Externas
Tienes acceso a las siguientes herramientas personalizadas. Úsalas cuando la conversación lo requiera:
${wizardData.customTools.map(t => `- **${t.name}**: ${t.description}`).join('\n')}
` : ''}

${wizardData.enableCalBooking ? `
### Agendamiento Autónomo (Cal.com)
Tienes acceso a tu calendario para reservar citas de los clientes en base a sus disponibilidades. Úsalo siempre que sugieran una reunión.
` : ''}

### Despedida
Antes de terminar, pregunta si hay algo más en lo que puedas ayudar. Despídete cordialmente.

${wizardData.kbFiles.length > 0 ? `
## CONTEXTO ADICIONAL (Base de Conocimientos)
${wizardData.kbUsageInstructions || 'Usa la información de tus documentos subidos para responder preguntas específicas sobre servicios o productos.'}
` : ''}

# Información de Contacto y Horarios
- Dirección: ${wizardData.companyAddress || 'No especificada'}
- Teléfono: ${wizardData.companyPhone || 'No especificado'}
- Web: ${wizardData.companyWebsite || 'No especificada'}

### Horarios comerciales:
${formattedHours}

# Reglas de Terminación
Si el usuario se despide o no necesita nada más, despídete y usa la herramienta 'end_call' inmediatamente.
`;

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
                body: JSON.stringify(bodyObj)
            });

            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || "Error al comunicarse con el servidor");
            setShowSuccess(true);
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "Error al crear el agente");
            setShowError(true);
        } finally {
            setIsCreating(false);
        }
    };

    if (showSuccess) {
        return (
            <div className="content-area">
                <div className="form-card text-center p-5">
                    <div className="mb-4">
                        <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '64px' }}></i>
                    </div>
                    <h2 className="mb-3">¡Agente IA {editingAgentId ? 'actualizado' : 'creado'} con éxito!</h2>
                    <p className="text-muted mb-4">
                        Tu agente <strong>{wizardData.agentName}</strong> {editingAgentId ? 'se ha guardado correctamente' : 'está configurado y listo'}.
                    </p>
                    <button className="btn btn-primary btn-lg" onClick={() => window.location.href = '/dashboard'}>
                        Ir al Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="content-area">
            <div className="form-card">
                <h1 className="section-title">Resumen y Generación de Prompt</h1>
                <p className="section-subtitle">
                    Revisa la configuración y genera las instrucciones finales para tu agente.
                </p>

                {showError && (
                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {errorMessage}
                        <button type="button" className="btn-close" onClick={() => setShowError(false)}></button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    {/* BÁSICO */}
                    <div className="p-3 border rounded bg-white shadow-sm">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="fw-bold m-0"><i className="bi bi-person-circle me-2 text-primary"></i>Datos Agente</h6>
                            <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => setStep(1)}>Editar</button>
                        </div>
                        <div className="small">
                            <p className="mb-1"><strong>Nombre:</strong> {wizardData.agentName}</p>
                            <p className="mb-0"><strong>Tipo:</strong> {getAgentTypeName(wizardData.agentType)}</p>
                        </div>
                    </div>

                    {/* LLM */}
                    <div className="p-3 border rounded bg-white shadow-sm">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="fw-bold m-0"><i className="bi bi-cpu me-2 text-primary"></i>LLM & Conocimiento</h6>
                            <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => setStep(2)}>Editar</button>
                        </div>
                        <div className="small">
                            <p className="mb-1"><strong>Modelo:</strong> {wizardData.model} (Temp: {wizardData.temperature})</p>
                            <p className="mb-0"><strong>KB:</strong> {wizardData.kbFiles.length} archivos subidos</p>
                        </div>
                    </div>

                    {/* EMPRESA */}
                    <div className="p-3 border rounded bg-white shadow-sm">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="fw-bold m-0"><i className="bi bi-building me-2 text-primary"></i>Empresa</h6>
                            <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => setStep(3)}>Editar</button>
                        </div>
                        <div className="small">
                            <p className="mb-1"><strong>Web:</strong> {wizardData.companyWebsite || '—'}</p>
                            <p className="mb-0"><strong>Horario:</strong> {wizardData.businessHours.filter(h => !h.closed).length} días activos</p>
                        </div>
                    </div>

                    {/* VOZ */}
                    <div className="p-3 border rounded bg-white shadow-sm">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="fw-bold m-0"><i className="bi bi-mic me-2 text-primary"></i>Voz</h6>
                            <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => setStep(4)}>Editar</button>
                        </div>
                        <div className="small">
                            <p className="mb-1"><strong>Voz:</strong> {wizardData.voiceName}</p>
                            <p className="mb-0"><strong>Velocidad:</strong> {wizardData.voiceSpeed}x</p>
                        </div>
                    </div>

                    {/* CONVERSACIÓN */}
                    <div className="md:col-span-2 p-3 border rounded bg-white shadow-sm">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="fw-bold m-0"><i className="bi bi-chat-dots me-2 text-primary"></i>Conversación</h6>
                            <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => setStep(5)}>Editar</button>
                        </div>
                        <div className="small">
                            <p className="mb-1"><strong>Idioma:</strong> {getLanguageName(wizardData.language)}</p>
                            <p className="mb-0"><strong>Ambiente:</strong> {wizardData.enableAmbientSound ? 'Activo' : 'No'}</p>
                        </div>
                    </div>
                </div>

                {/* GENERADOR DE PROMPT O ESTADO VACÍO */}
                {!hasGeneratedPrompt ? (
                    <div className="prompt-empty-state text-center mt-5 mb-4 p-5 rounded-4" style={{ background: 'linear-gradient(145deg, #f8f9fa, #e9ecef)', border: '1px dashed #ced4da' }}>
                        <div className="mb-4">
                            <i className="bi bi-robot text-primary" style={{ fontSize: '48px', opacity: 0.8 }}></i>
                        </div>
                        <h3 className="fw-bold mb-3">¡Casi listo!</h3>
                        <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '500px' }}>
                            Solo queda un paso crucial: generar el &quot;Prompt&quot; (las instrucciones maestras) basándose en toda la configuración que has seleccionado.
                        </p>
                        <button
                            type="button"
                            className={`btn btn-lg ${isGenerating ? 'btn-secondary' : 'btn-primary'} px-5 py-3`}
                            onClick={generateAllInstructions}
                            disabled={isGenerating}
                            style={{ borderRadius: '30px', fontWeight: 700, fontSize: '18px', boxShadow: '0 8px 20px rgba(38, 122, 176, 0.3)' }}
                        >
                            {isGenerating ? (
                                <><span className="spinner-border spinner-border-sm me-2"></span> Redactando instrucciones...</>
                            ) : (
                                <><i className="bi bi-magic me-2"></i> Generar Prompt Mágico</>
                            )}
                        </button>

                        <div className="mt-5 text-start">
                            <button type="button" className="btn btn-outline-secondary" onClick={prevStep} disabled={isCreating}>
                                <i className="bi bi-arrow-left"></i> Volver a revisar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="prompt-generated-state mt-5 animation-fade-in">
                        <div className="d-flex justify-content-between align-items-end mb-3">
                            <div>
                                <h4 className="fw-bold mb-1"><i className="bi bi-terminal me-2 text-dark"></i>Instrucciones del Agente</h4>
                                <p className="text-success small fw-bold mb-0"><i className="bi bi-check-circle-fill me-1"></i> Generadas correctamente. Puedes editarlas si lo deseas.</p>
                            </div>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={generateAllInstructions}
                                disabled={isGenerating}
                            >
                                {isGenerating ? 'Regenerando...' : <><i className="bi bi-arrow-clockwise"></i> Regenerar</>}
                            </button>
                        </div>

                        <div className="form-group mb-5">
                            <textarea
                                className="form-control"
                                rows={18}
                                value={wizardData.prompt}
                                onChange={(e) => updateField('prompt', e.target.value)}
                                style={{
                                    fontFamily: 'monospace',
                                    fontSize: '13.5px',
                                    lineHeight: '1.6',
                                    backgroundColor: '#272822',
                                    color: '#f8f8f2',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                                }}
                            />
                        </div>

                        <div className="wizard-actions d-flex gap-3 pt-4 border-top">
                            <button
                                type="button"
                                className="btn btn-lg btn-secondary px-4"
                                onClick={prevStep}
                                disabled={isCreating}
                            >
                                <i className="bi bi-arrow-left"></i> Atrás
                            </button>
                            <button
                                type="button"
                                className="btn btn-lg flex-grow-1"
                                onClick={handleCreateAgent}
                                disabled={isCreating}
                                style={{
                                    fontWeight: 700,
                                    background: editingAgentId ? 'var(--bs-primary)' : 'var(--exito)',
                                    color: 'white',
                                    border: 'none',
                                    boxShadow: editingAgentId ? '0 4px 12px rgba(13, 110, 253, 0.3)' : '0 4px 12px rgba(32, 201, 151, 0.3)'
                                }}
                            >
                                {isCreating ? (
                                    <><span className="spinner-border spinner-border-sm me-2"></span> {editingAgentId ? 'Guardando cambios...' : 'Creando servidor y agente...'}</>
                                ) : (
                                    <><i className={editingAgentId ? "bi bi-floppy me-2" : "bi bi-rocket-takeoff me-2"}></i> {editingAgentId ? 'Guardar Cambios' : 'Crear Agente IA Ahora'}</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
