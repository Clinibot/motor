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
    businessHours?: { day: string; open: string; close: string; closed: boolean }[];
}

type RetellTool = Record<string, unknown>;

// Helper to handle both boolean true and string "true" from Supabase JSON
const parseBool = (val: unknown): boolean => val === true || val === 'true';

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
            const encodedKey = encodeURIComponent(p.calApiKey);
            const fsSuffix = process.env.FACTORY_CALCOM_SECRET ? `&fs=${encodeURIComponent(process.env.FACTORY_CALCOM_SECRET)}` : '';
            tools.push({
                type: 'custom',
                name: 'book_appointment',
                description: 'Reserva una cita en el calendario. Úsala una vez el usuario ha confirmado el horario exacto.',
                url: `${siteUrl}/api/retell/calcom/book?cal_api_key=${encodedKey}&event_type_id=${eventId}${fsSuffix}`,
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
        const encodedKey = encodeURIComponent(p.calApiKey);
        const fsSuffix3 = process.env.FACTORY_CALCOM_SECRET ? `&fs=${encodeURIComponent(process.env.FACTORY_CALCOM_SECRET)}` : '';
        tools.push({
            type: 'custom',
            name: 'cancel_appointment',
            description: 'Cancela una cita existente en el calendario buscándola por el número de teléfono del llamante. Usa esta herramienta cuando el usuario quiera cancelar su cita.',
            url: `${siteUrl}/api/retell/calcom/cancel?cal_api_key=${encodedKey}${fsSuffix3}`,
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
        const encodedKey = encodeURIComponent(p.calApiKey);
        const fsSuffix3b = process.env.FACTORY_CALCOM_SECRET ? `&fs=${encodeURIComponent(process.env.FACTORY_CALCOM_SECRET)}` : '';
        tools.push({
            type: 'custom',
            name: 'check_appointment',
            description: 'Consulta si el usuario tiene una cita activa buscando por su número de teléfono. Úsala cuando el usuario pregunte por su cita, quiera saber cuándo la tiene, o antes de cancelar.',
            url: `${siteUrl}/api/retell/calcom/check?cal_api_key=${encodedKey}${fsSuffix3b}`,
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
        p.transferDestinations.forEach((dest) => {
            if (dest.destination_type === 'number' && !dest.number) return;
            if (dest.destination_type === 'agent' && !dest.agentId) return;
            // Use a clean, unique name for the tool
            const toolName = toTransferToolName(dest.name);

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
 * Injects a structured call script + tool instructions into the system prompt.
 * Produces a single, clean, non-repetitive block. Called server-side on every
 * POST/PATCH so the LLM always gets an up-to-date version.
 */
export function injectToolInstructions(basePrompt: string, p: ToolsPayload): string {
    let cleanPrompt = basePrompt;

    // ── 1. STRIP OLD INJECTED SECTIONS ───────────────────────────────────────
    const cutMarkers = [
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
    cleanPrompt = cleanPrompt.replace(/\n?# Estilo de Pronunciación[\s\S]*?(?=\n#|$)/, '').trim();
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

    // ── 3. CALL SCRIPT ────────────────────────────────────────────────────────
    const scriptSteps: string[] = [];
    let paso = 1;

    // Greeting (inbound — the beginMessage has already been sent)
    scriptSteps.push(
        `**PASO ${paso} — Inicio**\n` +
        `Ya enviaste el saludo de bienvenida. Ahora:\n` +
        `- Si no sabes el nombre del usuario, pregunta: "¿Con quién tengo el gusto de hablar?"\n` +
        `- Identifica el motivo de la llamada: "¿En qué puedo ayudarte hoy?"`
    );
    paso++;

    // Qualification
    if (hasQualification) {
        const totalQ = p.leadQuestions!.length;
        const qLines = p.leadQuestions!.map((q, i) => {
            // Success condition
            const onPass = q.key?.trim()
                ? `la respuesta cumple: "${q.key.trim()}"`
                : 'la respuesta es satisfactoria';

            // Fail action
            let onFail = 'continúa con la siguiente pregunta';
            if (q.failAction === 'end_call')  onFail = 'finaliza la llamada con `end_call`';
            else if (q.failAction === 'booking') onFail = 'ofrece agendar una cita (ve al apartado Agendamiento)';
            else if (q.failAction === 'transfer') {
                const dest = validDests[q.failTransferIdx ?? 0];
                const tName = dest
                    ? toTransferToolName(dest.name)
                    : 'transferencia';
                onFail = `transfiere con \`${tName}\``;
            }

            const passLine = i === totalQ - 1
                ? `→ Si cualifica (${onPass}): continúa al flujo principal.`
                : `→ Si cualifica (${onPass}): pasa a la pregunta ${i + 2}.`;

            return `   ${i + 1}. "${q.question}"\n      ${passLine}\n      → Si NO cualifica: ${onFail}.`;
        });
        scriptSteps.push(
            `**PASO ${paso} — Cualificación**\n` +
            `Haz estas preguntas de una en una. Aplica la acción indicada según la respuesta:\n` +
            qLines.join('\n')
        );
        paso++;
    }

    // Main action
    if (hasCal && hasTransfer) {
        const tNames = validDests.map(d => `\`${toTransferToolName(d.name)}\``).join(' o ');
        scriptSteps.push(
            `**PASO ${paso} — Acción principal**\n` +
            `Según la necesidad del contacto:\n` +
            `- Quiere agendar una cita → sigue el apartado *Agendamiento* más abajo.\n` +
            `- Prefiere hablar con alguien → usa ${tNames}.`
        );
        paso++;
    } else if (hasCal) {
        scriptSteps.push(
            `**PASO ${paso} — Agendamiento**\n` +
            `Ofrece una cita y sigue el apartado *Agendamiento* más abajo.`
        );
        paso++;
    } else if (hasTransfer) {
        const tLines = validDests.map(d => {
            const tName = toTransferToolName(d.name);
            return `- **${d.name}**${d.description ? ': ' + d.description : ''} → \`${tName}\``;
        }).join('\n');
        scriptSteps.push(`**PASO ${paso} — Transferencia**\n${tLines}`);
        paso++;
    }

    // Closing
    if (hasEndCall) {
        scriptSteps.push(
            `**PASO ${paso} — Cierre**\n` +
            `Pregunta: "¿Hay algo más en lo que pueda ayudarte?" y espera la respuesta.\n` +
            `- Si dice que no → despídete usando el nombre que capturaste al inicio de la conversación` +
            `${hasCal ? ', menciona la cita si se agendó,' : ','} desea un buen día y ejecuta \`end_call\` DESPUÉS de terminar la despedida.`
        );
    }

    const callScript = `# Guión de la Llamada\n\nSigue este flujo en orden:\n\n${scriptSteps.join('\n\n')}`;

    // ── 4. TOOL DETAILS ───────────────────────────────────────────────────────
    const toolDetails: string[] = [];

    // Cal.com booking
    if (hasCal) {
        let calDetail =
            `### Agendamiento\n` +
            `**Disponibilidad:**\n` +
            `- \`{{disponibilidad_mas_temprana}}\` → los 2 huecos más próximos (usa este primero).\n` +
            `- \`{{consultar_disponibilidad}}\` → disponibilidad completa de los próximos días.\n` +
            `- Si las variables están vacías (llamada saliente) → pregunta qué día prefiere.\n\n` +
            `**Proceso (en este orden exacto):**\n` +
            `1. Di: "Tenemos disponibilidad el {{disponibilidad_mas_temprana}}. ¿Cuál te viene mejor?"\n` +
            `2. Si pide más opciones o ninguna le va → muestra \`{{consultar_disponibilidad}}\`.\n` +
            `3. **Validación CRÍTICA**: el horario que el usuario elija DEBE existir exactamente en las variables de disponibilidad. ` +
            `Nunca inventes ni calcules un horario distinto. Si el usuario pide uno que no está en las variables, ` +
            `dile: "Lo siento, ese horario no está disponible. Los que tenemos son..." y repite las opciones reales.\n` +
            `4. Di: "Estupendo. Para confirmar tu cita necesito que me des un par de datos. ¿Cuál es tu número de teléfono?"\n` +
            `5. Di: "Perfecto, anotado queda. Ahora, ¿cuál es tu correo electrónico?"\n` +
            `6. Di: "Perfecto. Deletréamelo letra por letra para asegurarme de que lo tengo bien."\n` +
            `7. Escucha el deletreo. Convierte MENTALMENTE a email estándar (NO lo digas en voz alta):\n` +
            `   "punto"→. | "arroba"→@ | "guion"→- | "guion bajo"→_. Letras en minúsculas, sin espacios.\n` +
            `8. Di: "Perfecto, déjame confirmar tu cita, un momento por favor..." ` +
            `y ejecuta \`book_appointment\` con los parámetros del slot elegido.\n` +
            `   ⚠️ El campo \`start_time\` DEBE ser la cadena ISO del slot TAL CUAL aparece en los datos de disponibilidad, ` +
            `incluyendo el offset de zona horaria completo. Formato obligatorio: "YYYY-MM-DDTHH:mm:ss.sss+HH:MM". ` +
            `Ejemplo válido: "2026-04-02T10:00:00.000+02:00". ` +
            `NUNCA envíes el datetime sin offset (ej: "2026-04-01T09:00:00" es INCORRECTO y causará un error).\n` +
            `9. Si \`book_appointment\` tiene éxito → Di: "Listo. Tu cita está confirmada para el [repite fecha/hora], ` +
            `hora de Madrid. Recibirás un correo de confirmación en unos minutos."\n` +
            `10. Si \`book_appointment\` falla → Di: "Vaya, parece que ese hueco acaba de ocuparse. ` +
            `Déjame ofrecerte otra opción." y vuelve al paso 1 con los slots restantes.\n\n` +
            `**Fechas coloquiales:** "mañana"→el día siguiente | "pasado mañana"→+2 días | ` +
            `"el lunes"→próximo lunes | "la próxima semana"→lunes siguiente. Zona horaria: Europe/Madrid.`;

        calDetail +=
            `\n\n**Consultar cita:**\n` +
            `Cuando el usuario pregunte por su cita o quiera saber cuándo la tiene:\n` +
            `1. Ejecuta \`check_appointment\` con \`phone_number: {{user_number}}\`.\n` +
            `2. Si la encuentra → comunica la fecha y hora al usuario.\n` +
            `3. Si no la encuentra → pregunta: "¿Con qué teléfono hiciste la reserva?" y reintenta con ese número.`;

        if (hasCancel) {
            calDetail +=
                `\n\n**Cancelaciones:**\n` +
                `1. Ejecuta \`check_appointment\` con \`phone_number: {{user_number}}\`.\n` +
                `2. Si lo encuentra → di: "Tengo tu cita del [fecha]. ¿Confirmas que quieres cancelarla?"\n` +
                `3. Si confirma → ejecuta \`cancel_appointment\` pasando el \`booking_uid\` que devolvió \`check_appointment\`. ` +
                `NO uses phone_number para cancelar si ya tienes el uid.\n` +
                `4. Si \`check_appointment\` no encuentra → pregunta: "¿Con qué teléfono hiciste la reserva?" ` +
                `y reintenta con ese número. Si sigue sin encontrar → ofrece transferir con una persona.`;
        }

        toolDetails.push(calDetail);
    }

    // Custom tools
    if (hasCustomTools) {
        const ctLines = (p.customTools || [])
            .filter(t => t.name && t.url)
            .map(t => `- **${t.name}**: ${t.description}`)
            .join('\n');
        if (ctLines) toolDetails.push(`### Herramientas personalizadas\n${ctLines}`);
    }

    // ── 5. ASSEMBLE ───────────────────────────────────────────────────────────
    const pronunciationSection =
        `# Estilo de Pronunciación\n\n` +
        `### Cómo pronunciar los números de teléfono\n` +
        `Nunca repitas el teléfono del usuario; solo pregunta si es el número desde el que llama. ` +
        `Cuando debas dar un número al usuario, sigue esta regla exacta — nunca te la saltes:\n` +
        `Pronuncia los 2 primeros dígitos, pausa breve, los 3 siguientes, los 2 siguientes y los 2 últimos.\n` +
        `Ejemplo: 666 522 22 22 → "seis seis - cinco dos dos - dos dos - dos dos"\n\n` +
        `### Cómo pronunciar los emails\n` +
        `Cuando tengas que dar o confirmar un email, di primero: "Esta parte me cuesta un poco, así que lo haré poco a poco." ` +
        `Luego pronuncia lo que va antes de la arroba, di "arroba" y después lo que va después.\n` +
        `Ejemplo: pepe@pepe.com → "pepe - arroba - pepe punto com"\n\n` +
        `### Cómo pronunciar las fechas y horas\n` +
        `- Día con número: "martes dieciocho", "jueves primero".\n` +
        `- Horas siempre con palabras: "diez de la mañana", "cuatro de la tarde". Nunca formato 24h.\n` +
        `- Para la 1:00 → "la una" (nunca "un").\n` +
        `- Para los 30 minutos → "y media": "diez y media de la mañana".`;

    // Language rule — injected only when a non-Spanish language is set
    const langCode = p.language?.split('-')[0];
    const langRule = langCode === 'ca'
        ? `# Idioma\n\n**NORMA ABSOLUTA: Habla SIEMPRE en catalán, sin excepción.** Aunque el usuario te hable en castellano, inglés o cualquier otro idioma, debes responder siempre en catalán. No existe ninguna circunstancia que justifique cambiar de idioma.`
        : langCode === 'en'
        ? `# Language\n\n**ABSOLUTE RULE: Always speak in English without exception.** Even if the user addresses you in another language, always respond in English.`
        : `# Idioma\n\n**NORMA ABSOLUTA: Habla SIEMPRE en español, sin excepción.** Aunque el usuario te hable en otro idioma, debes responder siempre en español. No existe ninguna circunstancia que justifique cambiar de idioma.`;

    let finalPrompt = cleanPrompt + '\n\n' + pronunciationSection;
    if (langRule) finalPrompt += '\n\n' + langRule;
    finalPrompt += '\n\n' + callScript;

    if (toolDetails.length > 0) {
        finalPrompt += `\n\n---\n\n## Instrucciones de Herramientas\n\n${toolDetails.join('\n\n')}`;
    }

    // KB — clean, single occurrence
    if (hasKB) {
        const kbNames = p.kbFiles!.map(f => `- ${f.name || f.id}`).join('\n');
        finalPrompt +=
            `\n\n# Base de Conocimiento\n` +
            `Consulta los documentos adjuntos cuando el usuario pregunte sobre servicios, productos o información de la empresa:\n` +
            `${kbNames}\n\n` +
            `Si la información no está en estos documentos ni en el prompt, díselo amablemente ` +
            `y ofrécete a consultarlo con el equipo: "No tengo esa información ahora mismo, pero puedo consultarlo con el equipo y hacértela llegar."`;
        if (p.kbUsageInstructions?.trim()) {
            finalPrompt += `\n\n**Instrucciones de uso:**\n${p.kbUsageInstructions.trim()}`;
        }
    }

    // Notes — clean, single occurrence
    if (notes) {
        finalPrompt += `\n\n# Notas Específicas\n${notes}`;
    }

    return finalPrompt.trim();
}
