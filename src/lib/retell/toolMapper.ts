/**
 * toolMapper.ts
 * Converts Wizard Step 7 state into:
 *   1. Retell LLM `tools` array (sent when creating/updating the LLM)
 *   2. Retell LLM `post_call_analysis_data` (extraction variables)
 *   3. Prompt instruction blocks injected at the end of the system prompt
 */

import { 
    TransferDestination, 
    CustomTool, 
    ExtractionVariable,
    KBFile
} from './types';

export interface ToolsPayload {
    enableEndCall?: boolean;
    endCallDescription?: string;
    enableCalBooking?: boolean;
    calUrl?: string;
    calApiKey?: string;
    calEventId?: string;
    enableCalAvailability?: boolean;
    calAvailabilityDays?: number;
    enableTransfer: boolean;
    transferDestinations: TransferDestination[];
    enableCustomTools?: boolean;
    customTools?: CustomTool[];
    enableExtractions?: boolean;
    extractionVariables?: ExtractionVariable[];
    enableAnalysis?: boolean;
    analysisModel?: string;
    webhookUrl?: string;
    customNotes?: string;
    kbFiles?: KBFile[];
    kbUsageInstructions?: string;
    // Cal.com cancellation
    enableCalCancellation?: boolean;
    calTimezone?: string;
    // Resolved absolute site URL (set by the route handler before calling buildRetellTools)
    siteUrl?: string;
    // Company Info (kept for legacy but no longer injected into prompts)
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyWebsite?: string;
    companyDescription?: string;
    businessHours?: { day: string; open: string; close: string; closed: boolean }[];
}

type RetellTool = Record<string, unknown>;

/**
 * Builds the `tools` array for the Retell LLM create/update call.
 */
export function buildRetellTools(p: ToolsPayload): RetellTool[] {
    const tools: RetellTool[] = [];

    // Helper to handle both boolean true and string "true" from Supabase JSON
    const parseBool = (val: unknown): boolean => val === true || val === 'true';

    // 1. End Call
    if (parseBool(p.enableEndCall)) {
        tools.push({
            type: 'end_call',
            name: 'end_call',
            description: p.endCallDescription ||
                'Finaliza la llamada de forma cordial cuando la conversación haya concluido.',
        });
    }

    // 2. Cal.com Booking (Availability handled via Inbound Webhook variables)
    if (parseBool(p.enableCalBooking) && p.calApiKey && p.calEventId) {
        const eventId = parseInt(p.calEventId, 10);
        
        if (!isNaN(eventId)) {
            const calSettings = {
                cal_api_key: p.calApiKey,
                event_type_id: eventId,
                timezone: 'Europe/Madrid',
            };

            // Booking tool
            tools.push({
                type: 'book_appointment_cal',
                name: 'book_appointment',
                description: 'Reserva una cita en el calendario una vez el usuario ha elegido un horario.',
                ...calSettings,
            });
        }
    }

    // 3. Cal.com Cancellation (custom webhook tool)
    if (parseBool(p.enableCalBooking) && parseBool(p.enableCalCancellation) && p.calApiKey) {
        const siteUrl = p.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || '';
        const encodedKey = encodeURIComponent(p.calApiKey);
        tools.push({
            type: 'custom',
            name: 'cancel_appointment',
            description: 'Cancela una cita existente en el calendario buscándola por el número de teléfono del llamante. Usa esta herramienta cuando el usuario quiera cancelar su cita.',
            url: `${siteUrl}/api/retell/calcom/cancel?cal_api_key=${encodedKey}`,
            speak_during_execution: true,
            speak_after_execution: true,
            execution_message_description: 'Informa al usuario que estás buscando su cita para cancelarla.',
            parameters: {
                type: 'object',
                properties: {
                    phone_number: {
                        type: 'string',
                        description: 'Número de teléfono para buscar la cita en formato E.164 (ej: +34612345678). En el primer intento usa siempre el valor de {{user_number}}. Si no se encuentra la cita, usa el número alternativo que indique el usuario.',
                    },
                },
                required: ['phone_number'],
            },
        });
    }

    // 4. Call Transfer
    if (parseBool(p.enableTransfer) && p.transferDestinations.length > 0) {
        p.transferDestinations.forEach((dest) => {
            if (dest.destination_type === 'number' && !dest.number) return;
            if (dest.destination_type === 'agent' && !dest.agentId) return;
            // Use a clean, unique name for the tool
            const cleanName = dest.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'agent';
            const toolName = `transfer_to_${cleanName}`;

            if (dest.destination_type === 'agent') {
                // INTERNAL AGENT TRANSFER (Agent Swap)
                tools.push({
                    type: 'agent_swap',
                    name: toolName,
                    description: dest.description || `Transfiere la llamada a ${dest.name}.`,
                    agent_id: dest.agentId,
                    post_call_analysis_setting: 'both_agents'
                });
            } else {
                // EXTERNAL NUMBER TRANSFER
                const transfer_destination: { type: 'predefined'; number?: string; sip_authentication?: { auth_username?: string; auth_password?: string } } = { 
                    type: 'predefined', 
                    number: dest.number,
                    sip_authentication: (dest.sip_username || dest.sip_password) 
                        ? {
                            auth_username: dest.sip_username,
                            auth_password: dest.sip_password
                        }
                        : undefined
                };

                tools.push({
                    type: 'transfer_call',
                    name: toolName,
                    description: dest.description || `Transfiere la llamada a ${dest.name}.`,
                    transfer_destination,
                    transfer_option: {
                        type: dest.transfer_mode === 'warm' ? 'warm_transfer' : 'cold_transfer',
                    }
                });
            }
        });
    }

    // 5. Custom webhook tools
    if (parseBool(p.enableCustomTools) && (p.customTools?.length ?? 0) > 0) {
        p.customTools?.forEach((tool) => {
            if (!tool.url || !tool.name) return;
            // Build JSON Schema for parameters
            const properties: Record<string, { type: string; description: string }> = {};
            const required: string[] = [];

            if (tool.parameters && tool.parameters.length > 0) {
                tool.parameters.forEach(param => {
                    if (!param.name) return;
                    properties[param.name] = {
                        type: param.type,
                        description: param.description
                    };
                    if (param.required) {
                        required.push(param.name);
                    }
                });
            }

            tools.push({
                type: 'custom',
                name: tool.name,
                description: tool.description,
                url: tool.url,
                speak_during_execution: tool.speakDuring,
                speak_after_execution: tool.speakAfter,
                execution_message_description: tool.speakDuring
                    ? (tool.speakDuringMsg || 'Informa al usuario que estás procesando su solicitud.')
                    : undefined,
                parameters: {
                    type: 'object',
                    properties: properties,
                    required: required.length > 0 ? required : undefined
                }
            });
        });
    }

    return tools;
}

/**
 * Builds the `post_call_analysis_data` array for the Retell LLM.
 */
export function buildPostCallAnalysis(p: ToolsPayload) {
    // Predefined system variables always included
    const predefined = [
        {
            name: 'resumen_llamada',
            type: 'string' as const,
            description: 'Escribe un resumen de 1 a 3 frases basado en la transcripción, capturando la información importante y acciones tomadas.',
        },
        {
            name: 'llamada_exitosa',
            type: 'boolean' as const,
            description: 'Evalúa si el agente tuvo una llamada exitosa: conversación completa, tarea finalizada, sin problemas técnicos ni buzón de voz.',
        },
        {
            name: 'sentimiento_usuario',
            type: 'string' as const,
            description: 'Evalúa el sentimiento, estado de ánimo y nivel de satisfacción del usuario durante la llamada.',
        },
    ];

    // Map Spanish type names → Retell valid types
    const typeMap: Record<string, string> = {
        texto: 'string',
        selector: 'enum',
        booleano: 'boolean',
        numero: 'number',
        string: 'string',
        boolean: 'boolean',
        number: 'number',
        enum: 'enum',
    };

    const custom = (p.extractionVariables || [])
        .filter(v => v.name && v.type)
        .map(v => {
            const retellType = typeMap[v.type] || 'string';
            if (retellType === 'enum') {
                // enum requires 'choices' array — parse from description or use placeholder
                const choices = v.description
                    ? v.description.split(',').map((s: string) => s.trim()).filter(Boolean)
                    : ['opcion_1', 'opcion_2'];
                return {
                    name: v.name.toLowerCase().replace(/\s+/g, '_'),
                    type: 'enum' as const,
                    description: v.description || v.name,
                    choices,
                };
            }
            return {
                name: v.name.toLowerCase().replace(/\s+/g, '_'),
                type: retellType as 'string' | 'boolean' | 'number',
                description: v.description || v.name,
            };
        });

    return [...predefined, ...custom];
}

/**
 * Injects tool usage instructions at the END of the system prompt.
 * This ensures the LLM knows when and how to call each tool.
 */
export function injectToolInstructions(basePrompt: string, p: ToolsPayload): string {
    let cleanPrompt = basePrompt;

    // Lista de posibles encabezados que queremos limpiar antes de re-inyectar
    const sectionsToClean = [
        '# Uso de herramientas',
        '# Instrucciones de Herramientas',
        '### INSTRUCCIONES_HERRAMIENTAS_START ###',
        '## Agenda',
        '## Transferencias',
        '## Normas de Estilo de Voz'
    ];

    for (const section of sectionsToClean) {
        if (cleanPrompt.includes(section)) {
            // Limpiamos todo lo que haya después del primer encabezado de herramientas encontrado
            cleanPrompt = cleanPrompt.split(section)[0].trim();
            break;
        }
    }

    // Limpieza de marcadores del frontend si aún quedaran
    const fePatterns = [
        /<!-- AUTO_TOOLS_START -->[\s\S]*<!-- AUTO_TOOLS_END -->/g,
        /<!-- AUTO_KB_START -->[\s\S]*<!-- AUTO_KB_END -->/g,
        /<!-- AUTO_COMPANY_START -->[\s\S]*<!-- AUTO_COMPANY_END -->/g
    ];
    fePatterns.forEach(regex => {
        cleanPrompt = cleanPrompt.replace(regex, '');
    });

    cleanPrompt = cleanPrompt.trim();

    const blocks: string[] = [];
    const lowerPrompt = cleanPrompt.toLowerCase();

    if (p.enableEndCall && !lowerPrompt.includes('end_call')) {
        blocks.push(`## Finalizar llamada\nUsa la herramienta \`end_call\` para cerrar la llamada de forma cordial cuando termines.`);
    }

    if (p.enableCalBooking && p.calApiKey && !lowerPrompt.includes('book_appointment')) {
        const today = new Date();
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Madrid' };
        const dateStr = today.toLocaleDateString('es-ES', options);
        const tomorrowDate = new Date(today);
        tomorrowDate.setDate(today.getDate() + 1);
        const tomorrowStr = tomorrowDate.toISOString().split('T')[0]; // YYYY-MM-DD

        let calBlock = `## Gestión de Agenda y Citas
Hoy es ${dateStr} (ISO: ${today.toISOString().split('T')[0]}).

### Disponibilidad (llamadas entrantes)
Las variables del sistema llevan la disponibilidad pre-calculada:
- \`{{disponibilidad_mas_temprana}}\` → los 2 huecos más próximos (respuesta rápida)
- \`{{consultar_disponibilidad}}\` → disponibilidad completa de los próximos días

**Cuándo usarlas:**
- Si el usuario pregunta simplemente "¿cuándo puedo?" o acepta agendar → di primero los 2 huecos de \`{{disponibilidad_mas_temprana}}\`.
- Si pide más opciones o un día concreto → consulta \`{{consultar_disponibilidad}}\` y ofrécele lo que se ajuste.
- Si las variables están vacías (llamada saliente o sin webhook) → pregunta al usuario qué día prefiere e intenta agendar con la fecha que diga.

### Interpretación de fechas coloquiales (CRÍTICO)
Convierte siempre la fecha que diga el usuario a una fecha ISO absoluta antes de llamar a \`book_appointment\`:
- "mañana" → ${tomorrowStr}
- "pasado mañana" → suma 2 días a hoy
- "el lunes" → el próximo lunes (si hoy ya es lunes, el siguiente)
- "la próxima semana" → el lunes de la semana que viene
- "el viernes por la tarde" → ese viernes en la franja de tarde disponible
Usa siempre la zona horaria Europe/Madrid al construir el timestamp final.

### Proceso de Agendamiento
1. **Oferta inicial**: Cuando el usuario acepta agendar, di: "Tenemos disponibilidad el {{disponibilidad_mas_temprana}}. ¿Cuál te viene mejor?".
2. **Más opciones**: Si no le conviene ninguna, ofrece opciones de \`{{consultar_disponibilidad}}\`.
3. **Recogida de datos**: Una vez elegido el hueco, pide solamente el nombre y el email:
   - Di: "Estupendo. Para confirmar tu cita necesito tu nombre completo."
   - Tras el nombre, pide el email.
4. **Email y deletreo (CRÍTICO)**:
   - Di siempre: "Perfecto. Deletréamelo letra por letra para asegurarme de que lo tengo bien."
   - Espera el deletreo completo antes de continuar.
5. **Ejecución (CRÍTICO)**: Tras el deletreo di "Perfecto, déjame confirmar tu cita, un momento..." y ejecuta \`book_appointment\` con:
   - La fecha ISO correcta
   - El nombre y email que te dio el usuario
   - **El teléfono: SIEMPRE usa \`{{user_number}}\`** (el número desde el que llama). Nunca uses otro número. Esto es imprescindible para poder localizar y cancelar la cita después.
6. **Confirmación**: Confirma fecha y hora en formato hablado y avisa de que recibirá un correo.

### Formato de voz para fechas y horas
- Día con número: "martes dieciocho", "jueves primero".
- Horas siempre con palabras: "diez de la mañana", "cuatro de la tarde". Nunca formato 24h.
- Para la 1:00 → "la una" (nunca "un").`;

        if (p.enableCalCancellation) {
            calBlock += `

### Cancelaciones
Cuando el usuario quiera cancelar su cita, sigue este proceso exacto:
1. Di: "Voy a buscarte la cita ahora mismo, un momento."
2. Ejecuta \`cancel_appointment\` con \`phone_number: {{user_number}}\` (el número del llamante — NO se lo preguntes).
3. **Si se cancela correctamente**: confirma la cancelación al usuario.
4. **Si NO se encuentra la cita** (la respuesta indica que no hay cita con ese número):
   - Di: "No he encontrado ninguna cita con tu número. ¿Podrías decirme el número de teléfono con el que hiciste la reserva?"
   - Espera el número que te dé el usuario.
   - Ejecuta \`cancel_appointment\` de nuevo, esta vez con el número que te acaba de proporcionar.
   - Si tampoco encuentra la cita, indícalo y ofrece transferirle con una persona.`;
        }

        blocks.push(calBlock);
    }

    if (p.enableTransfer && p.transferDestinations.length > 0) {
        const destList = p.transferDestinations
            .filter(d => (d.destination_type === 'number' && d.number) || (d.destination_type === 'agent' && d.agentId))
            .map((d) => {
                const cleanName = d.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'agent';
                const toolName = `transfer_to_${cleanName}`;
                if (lowerPrompt.includes(toolName)) return null;
                return `- **${d.name}**: ${d.description || `Transferir`} (llamar a \`${toolName}\`)`;
            })
            .filter(Boolean)
            .join('\n');

        if (destList && !lowerPrompt.includes('transferir llamada')) {
            blocks.push(`## Transferencias\nCasos:\n${destList}`);
        }
    }

    if (p.enableCustomTools && (p.customTools?.length ?? 0) > 0) {
        const toolList = (p.customTools || [])
            .filter(t => t.name && t.url)
            .map(t => {
                const tName = t.name.toLowerCase();
                if (lowerPrompt.includes(tName)) return null;
                return `- **${t.name}**: ${t.description}`;
            })
            .filter(Boolean)
            .join('\n');

        if (toolList) blocks.push(`## Herramientas personalizadas\n${toolList}`);
    }

    if (p.kbFiles && p.kbFiles.length > 0 && !lowerPrompt.includes('base de conocimientos')) {
        blocks.push(`## Base de Conocimientos\nConsulta los documentos si el usuario tiene dudas sobre los servicios.`);
    }

    // Remove any stale company blocks left over from older agent versions
    const companyRegex = /<!-- AUTO_COMPANY_START -->[\s\S]*<!-- AUTO_COMPANY_END -->/;
    if (companyRegex.test(cleanPrompt)) {
        cleanPrompt = cleanPrompt.replace(companyRegex, '').trim();
    }

    // ALWAYS add Voice Style Rules for phonetic consistency
    blocks.push(`## Normas de Estilo de Voz (CRÍTICO)
Para que suenes natural y cercano, sigue estas reglas de pronunciación en ESPAÑOL:
- **Correos Electrónicos**: Di "arroba" para "@" y "punto" para ".". Ejemplo: "contacto arroba empresa punto com".
- **General**: No leas números, símbolos o formatos técnicos. Di siempre las palabras tal y como se pronuncian en una conversación natural.`);

    if (blocks.length === 0) return cleanPrompt;

    let finalPrompt = cleanPrompt;
    if (blocks.length > 0) {
        finalPrompt += `\n\n# Uso de herramientas\n\n${blocks.join('\n\n')}`;
    }

    // --- CUSTOM NOTES INJECTION ---
    if (p.customNotes) {
        const notesSection = `\n\n<!-- AUTO_NOTES_START -->\n# Notas\n${p.customNotes}\n<!-- AUTO_NOTES_END -->\n`;
        const notesRegex = /<!-- AUTO_NOTES_START -->[\s\S]*<!-- AUTO_NOTES_END -->/;
        if (notesRegex.test(finalPrompt)) {
            finalPrompt = finalPrompt.replace(notesRegex, () => notesSection.trim());
        } else {
            finalPrompt += notesSection;
        }
    }

    return finalPrompt;
}
