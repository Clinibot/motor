"use client";

import React from 'react';
import { useWizardStore } from '../../../store/wizardStore';

export const Step2_LLM: React.FC = () => {
    const {
        agentName, companyName, agentType,
        model, prompt,
        enableCalBooking, calUrl,
        enableTransfer, transferDestinations,
        extractionVariables,
        companyAddress, companyPhone, companyWebsite, companyDescription, businessHours,
        knowledgeBaseFiles, knowledgeBaseUsage,
        updateField, prevStep, nextStep
    } = useWizardStore();

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        nextStep();
    };

    const generateInstructions = () => {
        const name = agentName || "Sofía";
        const company = companyName || "nuestra empresa";

        // Format business hours for the prompt
        const formattedHours = businessHours
            .map(h => `- ${h.day}: ${h.closed ? 'Cerrado' : `de las ${h.open.replace(':', ' y ')} hasta las ${h.close.replace(':', ' y ')}`}`)
            .join('\n');

        // Base structure that applies to all
        const pronunciationRules = `### Cómo pronunciar los números de teléfono
No repitas nunca el teléfono del usuario, solo pregunta si es desde el que llama. Pero si debes darle un número de teléfono es muy importante que lo pronuncies siguiendo esta regla:
El teléfono debe pronunciarse los 3 primeros números, luego un espacio, dos más, dos más y los dos últimos. Por ejemplo: seis seis seis - cinco dos - dos dos - dos dos.

### Cómo pronunciar los emails
Siempre que tengas que dar un email al usuario, dile que esta parte te cuesta un poco así que lo harás poco a poco. Primero le dirás lo que va antes de la arroba y después lo que va después de la arroba.
Por ejemplo: pepe - arroba - pepe punto com.

### Cómo pronunciar las fechas
Las fechas debes darlas siempre de forma muy coloquial: "mañana", "dentro de 3 días", etc. 
Recuerda que la fecha y hora actual es: {{current_time_Europe/Madrid}}`;

        const styleRules = `## Tu Estilo de Comunicación
Hablas siempre de forma natural, amable y muy humana. Frases cortas, muy directas. Un toque de humor suave, sin pasarte.

- Nada de listas, nada de enumeraciones.
- Nunca repitas lo que dice el usuario.
- Mucha empatía, curiosidad y escucha.
- Adapta el idioma al paciente/cliente según sea necesario.
- Nunca hagas más de una pregunta en tu turno, busca el diálogo terminando la mayoría de veces con una pregunta.
- Sé lo más breve y concisa posible.
- REGLA CRÍTICA DE AVANCE: ESTÁ PROHIBIDO confirmar o repetir datos que el usuario ya ha dicho. Pasa INMEDIATAMENTE a la siguiente tarea o pregunta.`;

        const conversationRules = `## REGLAS DE CONVERSACIÓN
- REGLA CRÍTICA DE AVANCE: Está prohibido repetir datos ya dichos. Prioriza la rapidez.
- REGLA CRÍTICA DE FORMATO DE HORAS: NUNCA digas horas en formato numérico (15:00). SIEMPRE lenguaje coloquial ("las tres de la tarde").
- IMPORTANTE: Si el teléfono no está disponible, solicita el email para identificar al usuario de forma segura.`;

        const terminationRules = `## TERMINACIÓN DE LLAMADA
Si el usuario se despide o indica que quiere terminar, usa la herramienta 'end_call' INMEDIATAMENTE. No preguntes si quiere algo más, simplemente despídete y cuelga.`;

        let specificTasks = "";
        let toolRules = "";

        if (agentType === 'transferencia') {
            specificTasks = `### Primera tarea: Identificar necesidad
Presentate como ${name} de ${company}. Entiende por qué llama el usuario y busca la mejor solución.

### Segunda tarea: Proceder a la transferencia
Si el usuario necesita hablar con un departamento específico, informa que vas a transferir la llamada. No hagas esperar al usuario innecesariamente.
${enableTransfer ? `\nDestinos disponibles: ${transferDestinations.map(d => `${d.name} (${d.number})`).join(', ')}.` : ''}`;
        } else if (agentType === 'agendamiento') {
            specificTasks = `### Primera tarea: Consultar disponibilidad
Informa sobre los servicios de ${company}. Si el usuario quiere una cita, verifica disponibilidad.

### Segunda tarea: Agendar cita
Usa las herramientas correspondientes para agendar. Pide nombre completo, email y motivo de la cita.
${enableCalBooking ? `\nLink de reserva: ${calUrl || 'Integrado automáticamente'}.` : ''}`;

            toolRules = `## GESTIÓN DE CITAS (Cal.com)
Tienes acceso a Cal.com para gestionar citas.
1. Consultar disponibilidad: Verifica horarios libres.
2. Agendar: Pide datos y confirma.
3. SIEMPRE verifica disponibilidad ANTES de agendar.`;
        } else {
            // Cualificación y atención
            specificTasks = `### Primera tarea: Resolución de dudas
Resuelve dudas sobre ${company} de forma sencilla y humana. Usa la información de contacto y horarios:
- Dirección: ${companyAddress || 'No especificada'}
- Teléfono: ${companyPhone || 'No especificado'}
- Web: ${companyWebsite || 'No especificada'}
- Info adicional: ${companyDescription || 'No especificada'}

### Segunda tarea: Cualificación (Contexto)
Interésate por qué necesita el usuario, si ya es cliente y qué busca exactamente. No hagas más de una pregunta por turno.
${extractionVariables.length > 0 ? `\nVariables a extraer: ${extractionVariables.map(v => v.name).join(', ')}.` : ''}`;
        }

        const fullPrompt = `# Idioma
Habla siempre en español.

# Rol
Eres ${name} de ${company}, la voz cercana y amable que atiende las llamadas. Tu misión es ayudar al usuario con un tono humano, cálido y fácil. Hablas como una persona real, sin sonar a robot.

${styleRules}

${pronunciationRules}

## Tus Tareas Principales
${specificTasks}

### Tarea de despedida
Antes de cerrar, pregunta si puedes ayudar con algo más. Si no, despídete con un "¡Que tengas un día bien bonito!".

${knowledgeBaseFiles.length > 0 ? `
## CONTEXTO Y CONOCIMIENTO ADICIONAL
Tienes acceso a una base de conocimientos con información detallada sobre ${company}.
### Cuándo usar esta información:
${knowledgeBaseUsage || 'Usa esta información para responder preguntas específicas que no estén cubiertas en tus instrucciones principales.'}
` : ''}

## Reglas Especiales
- Nunca des precios si no están confirmados.
- Nunca des teléfonos completos de terceros; dilos en bloques.
- Si preguntan por temas técnicos o IA, responde: "Prefiero que vayamos al grano, ¿en qué te ayudo con ${company}?"

${conversationRules}

${toolRules}

# Horario de Atención
Este es el horario comercial de ${company}. Informa al usuario si pregunta por los horarios o si intenta agendar una cita fuera de estos periodos. SIEMPRE en horario de España.

${formattedHours}

${terminationRules}
`;

        updateField('prompt', fullPrompt);
    };

    return (
        <div className="content-area">
            <div className="form-card">
                <h1 className="section-title">
                    Configuración LLM
                    <div className="custom-tooltip">
                        <i className="bi bi-info-circle tooltip-icon"></i>
                        <div className="tooltip-content">
                            El Cerebro de tu agente. Aquí defines qué modelo de lenguaje usará y cuáles serán sus instrucciones específicas de comportamiento.
                        </div>
                    </div>
                </h1>
                <p className="section-subtitle">
                    Define las instrucciones y el modelo de lenguaje para tu agente.
                </p>

                <div style={{ marginBottom: '24px', padding: '16px', background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '24px' }}>✨</div>
                        <div>
                            <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--netelip-azul)' }}>Generador de prompts con IA</h4>
                            <p style={{ fontSize: '13px', color: 'var(--gris-texto)', margin: 0 }}>Crea instrucciones optimizadas basadas en tus pasos anteriores.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={generateInstructions}
                        style={{ background: 'var(--netelip-azul)', border: 'none', padding: '8px 16px', fontSize: '13px' }}
                    >
                        <i className="bi bi-magic me-2"></i> Generar instrucciones
                    </button>
                </div>

                <form onSubmit={handleNext}>
                    <div className="form-group">
                        <label className="form-label">
                            Modelo LLM <span className="required">*</span>
                        </label>
                        <select
                            className="form-control"
                            value={model}
                            onChange={(e) => updateField('model', e.target.value)}
                            required
                        >
                            <option value="gpt-4o">GPT-4o (Recomendado)</option>
                            <option value="gpt-4-turbo">GPT-4 Turbo</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Rápido)</option>
                            <option value="claude-3-opus">Claude 3 Opus</option>
                            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Prompt / Instrucciones del Sistema <span className="required">*</span>
                            <div className="custom-tooltip">
                                <i className="bi bi-info-circle tooltip-icon"></i>
                                <div className="tooltip-content">
                                    Define la personalidad, el tono y las reglas que debe seguir el agente. Puedes usar el botón de arriba para generar una base sólida.
                                </div>
                            </div>
                        </label>
                        <textarea
                            className="form-control"
                            rows={15}
                            value={prompt}
                            onChange={(e) => updateField('prompt', e.target.value)}
                            placeholder="Escribe las instrucciones detalladas para tu agente..."
                            required
                            style={{ fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.6', background: '#f8fafc' }}
                        />
                    </div>

                    <div className="wizard-actions">
                        <button type="button" className="btn btn-secondary" onClick={prevStep}>
                            <i className="bi bi-arrow-left"></i> Anterior
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!model || !prompt}>
                            Siguiente paso <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
