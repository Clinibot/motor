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
    transferWhen?: string;
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
    // Agent identity (used to build the call script)
    agentName?: string;
    agentType?: string;
    // Language (used to enforce language rule in prompt)
    language?: string;
    // Lead qualification questions
    leadQuestions?: {
        question: string;
        key: string;
        failAction?: 'end_call' | 'transfer' | 'booking' | 'continue';
        failTransferIdx?: number;
    }[];
    // Company Info (kept for legacy but no longer injected into prompts)
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyWebsite?: string;
    companyDescription?: string;
}

type RetellTool = Record<string, unknown>;

// Helper to handle both boolean true and string "true" from Supabase JSON
export const parseBool = (val: unknown): boolean => val === true || val === 'true';

/**
 * Returns true if the config had Cal.com enabled but the rebuilt tools are missing it.
 * Used in the assign route to abort a tool refresh that would silently wipe Cal.com.
 */
export function detectCalToolLoss(config: ToolsPayload, builtTools: RetellTool[]): boolean {
    const hadCal = parseBool(config.enableCalBooking) && !!config.calApiKey && !!config.calEventId;
    const builtCal = builtTools.some(
        t => t.name === 'book_appointment' || t.name === 'check_appointment' || t.name === 'cancel_appointment'
    );
    return hadCal && !builtCal;
}

// Builds a valid Retell tool name from a transfer destination name.
// Retell requirement: only a-z, A-Z, 0-9, underscores and dashes, max 64 chars.
const toTransferToolName = (destName: string): string =>
    `transfer_to_${destName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`.slice(0, 64);

/**
 * Builds the `tools` array for the Retell LLM create/update call.
 */
export function buildRetellTools(p: ToolsPayload): RetellTool[] {
    const tools: RetellTool[] = [];

    // 1. End Call
    if (parseBool(p.enableEndCall)) {
        tools.push({
            type: 'end_call',
            name: 'end_call',
            description: p.endCallDescription ||
                'Finaliza la llamada de forma cordial cuando la conversación haya concluido.',
        });
    }

    // 2. Cal.com Booking (custom endpoint — bypasses Retell's internal cal_util to avoid "Invalid time value")
    if (parseBool(p.enableCalBooking) && p.calApiKey && p.calEventId) {
        const eventId = parseInt(p.calEventId, 10);
        const siteUrl = p.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || '';

        if (!isNaN(eventId) && siteUrl) {
            const calHeaders: Record<string, string> = { 'x-cal-api-key': p.calApiKey };
            if (process.env.FACTORY_CALCOM_SECRET) calHeaders['x-factory-secret'] = process.env.FACTORY_CALCOM_SECRET;
            tools.push({
                type: 'custom',
                name: 'book_appointment',
                description: 'Reserva una cita en el calendario. Úsala una vez el usuario ha confirmado el horario exacto.',
                url: `${siteUrl}/api/retell/calcom/book?event_type_id=${eventId}`,
                headers: calHeaders,
                speak_during_execution: true,
                speak_after_execution: true,
                execution_message_description: 'Indica al usuario que estás confirmando la cita, que espere un momento.',
                parameters: {
                    type: 'object',
                    properties: {
                        start_time: {
                            type: 'string',
                            description: 'Fecha y hora exacta del slot en formato ISO 8601 con offset de zona horaria, copiado literalmente de los datos de disponibilidad. Ejemplo válido: "2026-04-07T10:00:00.000+02:00". NUNCA construyas este valor — cópialo tal cual del slot elegido.',
                        },
                        name: {
                            type: 'string',
                            description: 'Nombre completo del usuario.',
                        },
                        email: {
                            type: 'string',
                            description: 'Correo electrónico del usuario.',
                        },
                        phone: {
                            type: 'string',
                            description: 'Número de teléfono del usuario en formato E.164 (ej: +34612345678). Usa {{user_number}} si el usuario no ha dado otro número.',
                        },
                    },
                    required: ['start_time', 'name', 'email'],
                },
            });
        }
    }

    // 3. Cal.com Cancellation (custom webhook tool)
    if (parseBool(p.enableCalBooking) && parseBool(p.enableCalCancellation) && p.calApiKey) {
        const siteUrl = p.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || '';
        const cancelHeaders: Record<string, string> = { 'x-cal-api-key': p.calApiKey };
        if (process.env.FACTORY_CALCOM_SECRET) cancelHeaders['x-factory-secret'] = process.env.FACTORY_CALCOM_SECRET;
        tools.push({
            type: 'custom',
            name: 'cancel_appointment',
            description: 'Cancela una cita existente en el calendario buscándola por el número de teléfono del llamante. Usa esta herramienta cuando el usuario quiera cancelar su cita.',
            url: `${siteUrl}/api/retell/calcom/cancel`,
            headers: cancelHeaders,
            speak_during_execution: true,
            speak_after_execution: true,
            execution_message_description: 'Informa al usuario que estás buscando su cita para cancelarla.',
            parameters: {
                type: 'object',
                properties: {
                    booking_uid: {
                        type: 'string',
                        description: 'UID de la reserva devuelto por check_appointment. Úsalo siempre que lo tengas disponible para evitar búsquedas adicionales.',
                    },
                    phone_number: {
                        type: 'string',
                        description: 'Número de teléfono E.164 para buscar la cita (ej: +34612345678). Solo necesario si no tienes booking_uid.',
                    },
                },
                required: [],
            },
        });
    }

    // 3b. Cal.com Check appointment (always added when Cal.com is enabled)
    if (parseBool(p.enableCalBooking) && p.calApiKey) {
        const siteUrl = p.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || '';
        const checkHeaders: Record<string, string> = { 'x-cal-api-key': p.calApiKey };
        if (process.env.FACTORY_CALCOM_SECRET) checkHeaders['x-factory-secret'] = process.env.FACTORY_CALCOM_SECRET;
        tools.push({
            type: 'custom',
            name: 'check_appointment',
            description: 'Consulta si el usuario tiene una cita activa buscando por su número de teléfono. Úsala cuando el usuario pregunte por su cita, quiera saber cuándo la tiene, o antes de cancelar.',
            url: `${siteUrl}/api/retell/calcom/check`,
            headers: checkHeaders,
            speak_during_execution: true,
            speak_after_execution: true,
            execution_message_description: 'Informa al usuario que estás buscando su cita.',
            parameters: {
                type: 'object',
                properties: {
                    phone_number: {
                        type: 'string',
                        description: 'Número de teléfono en formato E.164 (ej: +34612345678). Usa {{user_number}} por defecto.',
                    },
                },
                required: ['phone_number'],
            },
        });
    }

    // 4. Call Transfer
    if (parseBool(p.enableTransfer) && p.transferDestinations.length > 0) {
        const seenTransferNames = new Set<string>();
        p.transferDestinations.forEach((dest) => {
            if (dest.destination_type === 'number' && !dest.number) return;
            if (dest.destination_type === 'agent' && !dest.agentId) return;
            // Use a clean, unique name for the tool — deduplicate with suffix if collision
            let toolName = toTransferToolName(dest.name);
            if (seenTransferNames.has(toolName)) {
                let suffix = 2;
                let candidate = `${toolName}_${suffix}`.slice(0, 64);
                while (seenTransferNames.has(candidate)) {
                    suffix++;
                    candidate = `${toolName}_${suffix}`.slice(0, 64);
                }
                toolName = candidate;
            }
            seenTransferNames.add(toolName);

            if (dest.destination_type === 'agent') {
                // INTERNAL AGENT TRANSFER (Agent Swap)
                tools.push({
                    type: 'agent_swap',
                    name: toolName,
                    description: dest.description || `Transfiere la llamada a ${dest.name}.`,
                    agent_id: dest.agentId,
                    post_call_analysis_setting: 'both_agents',
                    speak_during_execution: true,
                    execution_message_description: 'Di de forma natural: "Dame un segundo que te paso la llamada."',
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
                    },
                    speak_during_execution: true,
                    execution_message_description: 'Di de forma natural: "Dame un segundo que te paso la llamada."',
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
 * Injects a structured prompt (## Instrucciones + ## Etapas) into the system prompt.
 * Produces a single, clean, non-repetitive block. Called server-side on every
 * POST/PATCH so the LLM always gets an up-to-date version.
 *
 * Format mirrors the customer's production prompt: no **bold**, no backtick tool refs,
 * no emojis, no → arrows — clean section headers and plain bullet lists only.
 */
export function injectToolInstructions(basePrompt: string, p: ToolsPayload): string {
    let cleanPrompt = basePrompt;

    // ── 1. STRIP OLD INJECTED SECTIONS ───────────────────────────────────────
    const cutMarkers = [
        '## Instrucciones',
        '## Etapas',
        '# Guión de la Llamada',
        '# Uso de herramientas',
        '# Instrucciones de Herramientas',
        '### INSTRUCCIONES_HERRAMIENTAS_START ###',
        '## Agenda',
        '## Transferencias',
        '## Normas de Estilo de Voz',
        '## Guión de la Llamada',
    ];
    for (const marker of cutMarkers) {
        if (cleanPrompt.includes(marker)) {
            cleanPrompt = cleanPrompt.split(marker)[0].trim();
            break;
        }
    }

    // Strip AUTO_* markers and company section (legacy)
    [
        /<!-- AUTO_TOOLS_START -->[\s\S]*?<!-- AUTO_TOOLS_END -->/g,
        /<!-- AUTO_KB_START -->[\s\S]*?<!-- AUTO_KB_END -->/g,
        /<!-- AUTO_COMPANY_START -->[\s\S]*?<!-- AUTO_COMPANY_END -->/g,
        /<!-- AUTO_NOTES_START -->[\s\S]*?<!-- AUTO_NOTES_END -->/g,
    ].forEach(re => { cleanPrompt = cleanPrompt.replace(re, ''); });

    // Extract & remove KB and Notes from base prompt (we'll re-add cleanly at the end)
    // NOTE: no 'm' flag — without it, '$' matches end-of-string so the full section is consumed
    cleanPrompt = cleanPrompt.replace(/\n?# Base de Conocimiento[\s\S]*?(?=\n#|$)/, '').trim();
    cleanPrompt = cleanPrompt.replace(/\n?# Notas Adicionales[\s\S]*?(?=\n#|$)/, '').trim();
    cleanPrompt = cleanPrompt.replace(/\n?# Notas Específicas[\s\S]*?(?=\n#|$)/, '').trim();
    cleanPrompt = cleanPrompt.replace(/\n?# Estilo de (?:Pronunciación|Comunicación)[\s\S]*?(?=\n#|$)/, '').trim();
    cleanPrompt = cleanPrompt.replace(/\n?# Idioma[\s\S]*?(?=\n#|$)/, '').trim();
    cleanPrompt = cleanPrompt.replace(/\n?# Language[\s\S]*?(?=\n#|$)/, '').trim();
    cleanPrompt = cleanPrompt.trim();

    // ── 2. FLAGS ──────────────────────────────────────────────────────────────
    const hasQualification = (p.leadQuestions?.length ?? 0) > 0;
    const hasCal    = parseBool(p.enableCalBooking) && !!p.calApiKey;
    const hasCancel = hasCal && parseBool(p.enableCalCancellation);
    const hasTransfer = parseBool(p.enableTransfer) && p.transferDestinations.length > 0;
    const hasEndCall  = parseBool(p.enableEndCall);
    const hasCustomTools = parseBool(p.enableCustomTools) && (p.customTools?.length ?? 0) > 0;
    const hasKB   = (p.kbFiles?.length ?? 0) > 0;
    const notes   = p.customNotes?.trim() || '';

    const validDests = p.transferDestinations.filter(
        d => (d.destination_type === 'number' && d.number) || (d.destination_type === 'agent' && d.agentId)
    );

    // Deduplicate transfer tool names (mirrors buildRetellTools)
    const seenNames = new Set<string>();
    const dedupedDests = validDests.map(dest => {
        let toolName = toTransferToolName(dest.name);
        if (seenNames.has(toolName)) {
            let suffix = 2;
            let candidate = `${toolName}_${suffix}`.slice(0, 64);
            while (seenNames.has(candidate)) { suffix++; candidate = `${toolName}_${suffix}`.slice(0, 64); }
            toolName = candidate;
        }
        seenNames.add(toolName);
        return { ...dest, toolName };
    });

    // ── 3. LANGUAGE RULE ──────────────────────────────────────────────────────
    const langCode = p.language?.split('-')[0];
    const langSection = langCode === 'ca'
        ? `# Idioma\n\nNORMA ABSOLUTA: Habla SIEMPRE en catalán, sin excepción. Aunque el usuario te hable en castellano, inglés o cualquier otro idioma, debes responder siempre en catalán. No existe ninguna circunstancia que justifique cambiar de idioma.`
        : langCode === 'en'
        ? `# Language\n\nABSOLUTE RULE: Always speak in English without exception. Even if the user addresses you in another language, always respond in English.`
        : `# Idioma\n\nNORMA ABSOLUTA: Habla SIEMPRE en español, sin excepción. Aunque el usuario te hable en otro idioma, debes responder siempre en español. No existe ninguna circunstancia que justifique cambiar de idioma.`;

    // ── 4. ## Instrucciones ───────────────────────────────────────────────────
    const instrSections: string[] = [];

    instrSections.push(
        `### Estilos de comunicación\n` +
        `- Haz solo una pregunta a la vez y espera respuesta (no digas "¿Cuál es tu nombre y en qué puedo ayudarte?"; en su lugar pregunta "¿Cuál es tu nombre?", espera la respuesta, y luego pregunta "¿En qué puedo ayudarte?")\n` +
        `- Mantén las interacciones breves con oraciones cortas\n` +
        `- Esta es una conversación de voz con potencial retraso (2 mensajes cortados seguidos) y errores de transcripción (palabras equivocadas), así que adáptate en consecuencia. Considera el contexto para aclarar información ambigua o mal transcrita\n` +
        `- Si recibes un mensaje obviamente incompleto, responde: "uhm"\n` +
        `- Escribe los símbolos como palabras: "tres euros" no "3€", "arroba" no "@"\n` +
        `- Menciona la zona horaria (hora de Madrid) una vez al inicio si es relevante, no la repitas durante la llamada\n` +
        `- Presta atención a la información que el contacto ya ha compartido — si mencionan su nombre, empresa o motivo mientras responden otra pregunta, reconócelo y no vuelvas a preguntarlo\n` +
        `- Al ofrecer opciones (ej. horarios de citas), limita las opciones a 2 máximo\n` +
        `- Varía las respuestas entusiastas ("Genial", "Perfecto", "Estupendo") — evita repeticiones\n` +
        `- Maneja preguntas sobre IA con humor y transparencia: si preguntan "¿Eres un robot?" o "¿Eres real?", responde "No soy un robot, soy un agente de voz creado con inteligencia artificial" y luego redirige al objetivo principal de la llamada\n` +
        `- Considera la knowledge base proporcionada para aclarar cualquier información ambigua o confusa sobre los servicios o productos\n` +
        `- Usa palabras de relleno naturales ("umm", "entonces") de forma muy limitada — máximo una cada 4 interacciones`
    );

    instrSections.push(
        `### Control de Entonación y Puntuación (IMPORTANTE)\n` +
        `- Mantén un tono profesional y estable en todo momento\n` +
        `- Evita el uso excesivo de signos de exclamación (máximo uno cada 3 frases)\n` +
        `- NO uses puntos suspensivos innecesarios\n` +
        `- Cuando expreses entusiasmo, usa palabras precisas pero mantén el mismo nivel de energía vocal\n` +
        `- Las variaciones de confirmación ("Perfecto", "Genial", "Estupendo") deben sonar naturales, no forzadas\n` +
        `- No subas ni bajes bruscamente el tono al cambiar de tema`
    );

    instrSections.push(
        `### Reglas de comunicación\n` +
        `- Máximo 30 segundos por respuesta\n` +
        `- Usa el {{user_name}} frecuentemente una vez lo tengas capturado\n` +
        `- Lee las fechas de forma natural y con palabras completas: "lunes quince de abril a las seis y media de la tarde" no "15/04 a las 18:30"\n\n` +
        `### Cómo pronunciar los números de teléfono\n` +
        `Nunca repitas el teléfono del usuario; solo pregunta si es el número desde el que llama. ` +
        `Cuando debas dar un número al usuario, sigue esta regla exacta — nunca te la saltes:\n` +
        `Pronuncia los 2 primeros dígitos, pausa breve, los 3 siguientes, los 2 siguientes y los 2 últimos.\n` +
        `Ejemplo: 666 522 22 22 — "seis seis - cinco dos dos - dos dos - dos dos"\n\n` +
        `### Cómo pronunciar los emails\n` +
        `Cuando tengas que dar o confirmar un email, di primero: "Esta parte me cuesta un poco, así que lo haré poco a poco." ` +
        `Luego pronuncia lo que va antes de la arroba, di "arroba" y después lo que va después.\n` +
        `Ejemplo: pepe@pepe.com — "pepe - arroba - pepe punto com"\n\n` +
        `### Cómo pronunciar las fechas y horas\n` +
        `- Día con número: "martes dieciocho", "jueves primero".\n` +
        `- Horas siempre con palabras: "diez de la mañana", "cuatro de la tarde". Nunca formato 24h.\n` +
        `- Para la 1:00 — "la una" (nunca "un").\n` +
        `- Para los 30 minutos — "y media": "diez y media de la mañana".`
    );

    // ### Herramientas (dynamic)
    const toolLines: string[] = [];

    if (hasEndCall) {
        toolLines.push(
            `end_call\n` +
            `- Cuando el usuario exprese que no necesita más ayuda, se despida o cierre la conversación.\n` +
            `- Ejecútala después de terminar la despedida completa, nunca antes.`
        );
    }

    if (hasTransfer && dedupedDests.length > 0) {
        dedupedDests.forEach(dest => {
            const desc = dest.description?.trim();
            toolLines.push(
                `${dest.toolName}\n` +
                `- ${desc || `Cuando el usuario deba ser transferido a ${dest.name}.`}`
            );
        });
    }

    if (hasCal) {
        toolLines.push(
            `book_appointment\n` +
            `- Usa esta herramienta para reservar una cita cuando el usuario quiera agendar.\n` +
            `- La variable {{slots_iso}} contiene los ISO datetimes exactos de todos los slots disponibles, agrupados por fecha. SIEMPRE extrae el start_time de {{slots_iso}}. NUNCA calcules ni deduzcas un ISO datetime.\n` +
            `- El sistema te proporciona los 2 huecos más próximos en {{disponibilidad_mas_temprana}}. Ofrécelos diciendo: "Tenemos disponibilidad el {{disponibilidad_mas_temprana}}. ¿Cuál te viene mejor?"\n` +
            `- Si el usuario rechaza las 2 primeras opciones o pide más alternativas, usa {{consultar_disponibilidad}} para describir los rangos disponibles, y {{slots_iso}} para proponer horarios concretos dentro de esos rangos. Cuando el usuario diga "la más cercana" o "la primera disponible", usa el primer slot de {{slots_iso}}.\n` +
            `- Si las variables están vacías (llamada saliente), pregunta qué día prefiere el usuario.\n` +
            `- El horario que el usuario elija debe existir exactamente en {{slots_iso}}. Nunca inventes ni calcules un horario distinto. Si el usuario pide uno que no está, di: "Lo siento, ese horario no está disponible. Los que tenemos son..." y propón el slot más cercano de {{slots_iso}}.\n` +
            `- Cuando el usuario acepta un horario, di: "Estupendo. Para confirmar tu cita necesito que me des un par de datos. ¿Cuál es tu número de teléfono?"\n` +
            `- Una vez confirmado el teléfono, di: "Genial. Ahora, ¿cuál es tu correo electrónico?"\n` +
            `- Escucha el email del usuario. Luego di: "Perfecto. Deletréamelo letra por letra para asegurarme de que lo tengo bien."\n` +
            `- Escucha el deletreo completo. Convierte MENTALMENTE a formato email estándar (NO lo digas en voz alta): "punto" → . | "arroba" → @ | "guion" → - | "guion bajo" → _. Letras en minúsculas, sin espacios. Ejemplo: "a-ene-a-punto-garcia-arroba-empresa-punto-com" → ana.garcia@empresa.com\n` +
            `- Inmediatamente después de escuchar el deletreo, di: "Perfecto, déjame confirmar tu cita, un momento por favor..." y ejecuta inmediatamente book_appointment.\n` +
            `- El campo start_time debe ser el string ISO exacto extraído de {{slots_iso}} para el horario acordado. Incluye el offset completo. Formato: "YYYY-MM-DDTHH:mm:ss.sss+HH:MM". Nunca envíes el datetime sin offset.\n` +
            `- Si la reserva tiene éxito, di: "Listo, {{user_name}}. Tu cita está confirmada para el [repite fecha/hora], hora de Madrid. Recibirás un correo de confirmación en unos minutos."\n` +
            `- Si la reserva falla, di: "Vaya, parece que ese hueco acaba de ocuparse. Déjame ofrecerte otra opción." y vuelve a ofrecer el siguiente slot disponible de {{slots_iso}}.\n` +
            `- Fechas coloquiales: "mañana" es el día siguiente, "pasado mañana" es +2 días, "el lunes" es el próximo lunes. Zona horaria: Europe/Madrid.`
        );

        toolLines.push(
            `check_appointment\n` +
            `- Usa esta herramienta para consultar la cita de un usuario cuando pregunte por ella.\n` +
            `- Llámala con phone_number igual a {{user_number}}.\n` +
            `- Si la encuentra, comunica la fecha y hora.\n` +
            `- Si no la encuentra, pregunta: "¿Con qué teléfono hiciste la reserva?" y reintenta con ese número.`
        );

        if (hasCancel) {
            toolLines.push(
                `cancel_appointment\n` +
                `- Usa esta herramienta para cancelar la cita de un usuario cuando lo solicite.\n` +
                `- Primero ejecuta check_appointment con phone_number igual a {{user_number}} para obtener el booking_uid.\n` +
                `- Si encuentra la cita, confirma con el usuario: "Tengo tu cita del [fecha]. ¿Confirmas que quieres cancelarla?"\n` +
                `- Si confirma, ejecuta cancel_appointment pasando el booking_uid.\n` +
                `- Si check_appointment no encuentra la cita, pregunta: "¿Con qué teléfono hiciste la reserva?" y reintenta. Si sigue sin encontrar, ofrece transferir con una persona.`
            );
        }
    }

    if (hasCustomTools) {
        (p.customTools || [])
            .filter(t => t.name && t.url)
            .forEach(t => {
                toolLines.push(
                    `${t.name}\n` +
                    `- ${t.description || 'Herramienta personalizada.'}`
                );
            });
    }

    if (toolLines.length > 0) {
        instrSections.push(`### Herramientas\n\n${toolLines.join('\n\n')}`);
    }

    // ### Preguntas de cualificación (dynamic)
    if (hasQualification) {
        const totalQ = p.leadQuestions!.length;
        const qLines = p.leadQuestions!.map((q, i) => {
            const onPass = q.key?.trim()
                ? `la respuesta cumple: "${q.key.trim()}"`
                : 'la respuesta es satisfactoria';

            let onFail = 'continúa con la siguiente pregunta';
            if (q.failAction === 'end_call')  onFail = 'finaliza la llamada con end_call';
            else if (q.failAction === 'booking') onFail = 'ofrece agendar una cita';
            else if (q.failAction === 'transfer') {
                const dest = dedupedDests[q.failTransferIdx ?? 0];
                onFail = dest ? `transfiere con ${dest.toolName}` : 'transfiere la llamada';
            }

            const passLine = i === totalQ - 1
                ? `Si cualifica (${onPass}): continúa al flujo principal.`
                : `Si cualifica (${onPass}): pasa a la pregunta ${i + 2}.`;

            return `${i + 1}. "${q.question}"\n   - ${passLine}\n   - Si NO cualifica: ${onFail}.`;
        });

        instrSections.push(
            `### Preguntas de cualificación\n\n` +
            `Haz estas preguntas de una en una. Aplica la acción indicada según la respuesta:\n\n` +
            qLines.join('\n\n') + '\n\n' +
            `Nota: si la respuesta parece incompleta, ambigua o inconsistente con el contexto (posible error de transcripción), pide aclaración antes de aplicar la acción de no cualificación. Solo ejecuta end_call o una transferencia cuando estés seguro de haber entendido correctamente.`
        );
    }

    const instruccionesSection = `## Instrucciones\n\n${instrSections.join('\n\n')}`;

    // ── 5. ## Etapas ──────────────────────────────────────────────────────────
    const etapas: string[] = [];
    let step = 1;

    etapas.push(
        `### ${step}. Saludo\n` +
        `- Ya enviaste el mensaje de bienvenida configurado.\n` +
        `- Si no sabes el nombre del contacto, pregunta: "¿Con quién tengo el gusto de hablar?"\n` +
        `- Identifica el motivo de la llamada.`
    );
    step++;

    if (hasQualification) {
        etapas.push(
            `### ${step}. Cualificación\n` +
            `- Haz las preguntas de cualificación en orden.\n` +
            `- Aplica la acción indicada según la respuesta de cada pregunta.`
        );
        step++;
    }

    if (hasCal && hasTransfer) {
        const tList = dedupedDests.map(d => d.name).join(' o ');
        etapas.push(
            `### ${step}. Acción principal\n` +
            `- Si el contacto quiere agendar una cita: ofrece {{disponibilidad_mas_temprana}}, si rechaza las 2 opciones usa {{consultar_disponibilidad}} para describir rangos y {{slots_iso}} para proponer horarios concretos, solicita teléfono y email con deletreo, y ejecuta book_appointment inmediatamente después del deletreo usando el ISO exacto de {{slots_iso}}.\n` +
            `- Si prefiere hablar con alguien de ${tList}, usa la herramienta de transferencia correspondiente.`
        );
        step++;
    } else if (hasCal) {
        etapas.push(
            `### ${step}. Agendamiento\n` +
            `- Ofrece los huecos de {{disponibilidad_mas_temprana}}.\n` +
            `- Si el usuario rechaza las 2 primeras opciones, usa {{consultar_disponibilidad}} para describir rangos y {{slots_iso}} para proponer horarios concretos dentro de esos rangos.\n` +
            `- Cuando acepte un horario, solicita teléfono, luego email, luego deletreo.\n` +
            `- Inmediatamente después del deletreo, ejecuta book_appointment usando el ISO exacto de {{slots_iso}} como start_time.\n` +
            `- Confirma la cita y sigue a la etapa de cierre.`
        );
        step++;
    } else if (hasTransfer) {
        const tLines = dedupedDests.map(d => {
            const desc = d.description?.trim();
            return `- ${d.name}${desc ? ': ' + desc : ''}: usa ${d.toolName}.`;
        }).join('\n');
        etapas.push(`### ${step}. Transferencia\n${tLines}`);
        step++;
    }

    if (hasEndCall) {
        etapas.push(
            `### ${step}. Cierre\n` +
            `- Pregunta: "¿Hay algo más en lo que pueda ayudarte?" y espera la respuesta.\n` +
            `- Si dice que no, despídete usando el nombre que capturaste${hasCal ? ', menciona la cita si se agendó,' : ''} desea un buen día y ejecuta end_call después de terminar la despedida.`
        );
    }

    const etapasSection = `## Etapas\n\n${etapas.join('\n\n')}`;

    // ── 6. ASSEMBLE ───────────────────────────────────────────────────────────
    let finalPrompt = cleanPrompt + '\n\n' + langSection;
    finalPrompt += '\n\n' + instruccionesSection;
    finalPrompt += '\n\n' + etapasSection;

    // KB — clean, single occurrence
    if (hasKB) {
        // Strip common file extensions so the name matches the Retell KB identifier exactly
        const kbNamesPlain = p.kbFiles!.map(f => {
            const raw = f.name || f.id;
            return raw.replace(/\.(pdf|docx?|txt|md)$/i, '');
        });
        const kbNames = kbNamesPlain.map(n => `- ${n}`).join('\n');
        const kbNamesInline = kbNamesPlain.join(', ');

        const kbFallback =
            `Si la información no está en la base de conocimiento, díselo amablemente y ofrécete a consultarlo con el equipo: ` +
            `"No tengo esa información ahora mismo, pero puedo consultarlo con el equipo y hacértela llegar." ` +
            `No des ninguna información que no aparezca explícitamente en tu base de conocimiento.`;

        finalPrompt += `\n\n# Base de Conocimiento\n${kbNames}\n`;

        if (p.kbUsageInstructions?.trim()) {
            // Append "consulta siempre [name]" so Retell knows which document to look up
            const instruction = p.kbUsageInstructions.trim().replace(/[.,;:]+$/, '');
            finalPrompt += `\n${instruction} consulta siempre ${kbNamesInline}\n\n${kbFallback}`;
        } else {
            finalPrompt +=
                `\nConsulta los documentos adjuntos cuando el usuario pregunte sobre servicios, productos o información de la empresa.\n\n` +
                `${kbFallback}`;
        }
    }

    // Notes — clean, single occurrence
    if (notes) {
        finalPrompt += `\n\n# Notas Específicas\n${notes}`;
    }

    return finalPrompt.trim();
}
