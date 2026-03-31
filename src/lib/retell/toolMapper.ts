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
    // Agent identity (used to build the call script)
    agentName?: string;
    agentType?: string;
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
    cleanPrompt = cleanPrompt.replace(/\n?# Estilo de Pronunciación[\s\S]*?(?=\n#|$)/, '').trim();
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
                    ? `transfer_to_${dest.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
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
        const tNames = validDests.map(d => `\`transfer_to_${d.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}\``).join(' o ');
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
            const tName = `transfer_to_${d.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
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
            `- Si dice que no → despídete usando \`{{user_name}}\`, menciona la cita si se agendó, ` +
            `desea un buen día y ejecuta \`end_call\` DESPUÉS de terminar la despedida.`
        );
    }

    const callScript = `# Guión de la Llamada\n\nSigue este flujo en orden:\n\n${scriptSteps.join('\n\n')}`;

    // ── 4. TOOL DETAILS ───────────────────────────────────────────────────────
    const toolDetails: string[] = [];

    // Cal.com booking
    if (hasCal) {
        const today = new Date();
        const dateStr = today.toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Madrid'
        });
        const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0];

        let calDetail =
            `### Agendamiento\n` +
            `Hoy es ${dateStr} (ISO: ${today.toISOString().split('T')[0]}).\n\n` +
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
            `y ejecuta \`book_appointment\` con: la fecha/hora ISO EXACTA del slot tal como aparece en las variables de disponibilidad, nombre, email y teléfono del paso 4.\n` +
            `9. Si \`book_appointment\` tiene éxito → Di: "Listo, {{user_name}}. Tu cita está confirmada para el [repite fecha/hora], ` +
            `hora de Madrid. Recibirás un correo de confirmación en unos minutos."\n` +
            `10. Si \`book_appointment\` falla con error de disponibilidad → Di: "Vaya, parece que ese hueco acaba de ocuparse. ` +
            `Déjame ofrecerte otra opción." y vuelve al paso 1 con los slots restantes.\n\n` +
            `**Fechas coloquiales:** "mañana"→${tomorrowStr} | "pasado mañana"→+2 días | ` +
            `"el lunes"→próximo lunes | "la próxima semana"→lunes siguiente. Zona horaria: Europe/Madrid.\n` +
            `**IMPORTANTE:** Pasa siempre el valor ISO exacto del slot (ej: "2026-04-02T10:00:00.000+02:00"), nunca lo reformules.`;

        if (hasCancel) {
            calDetail +=
                `\n\n**Cancelaciones:**\n` +
                `1. Di: "Voy a buscarte la cita ahora mismo, un momento." ` +
                `y ejecuta \`cancel_appointment\` con \`phone_number: {{user_number}}\`.\n` +
                `2. Si se cancela → confirma al usuario.\n` +
                `3. Si no se encuentra → pregunta: "¿Con qué teléfono hiciste la reserva?" ` +
                `y reintenta con ese número. Si sigue sin encontrar → ofrece transferir con una persona.`;
        }

        toolDetails.push(calDetail);
    }

    // Transfers
    if (hasTransfer) {
        const tLines = validDests.map(d => {
            const tName = `transfer_to_${d.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
            return `- **${d.name}**${d.description ? ': ' + d.description : ''} → \`${tName}\``;
        }).join('\n');
        toolDetails.push(`### Transferencias\n${tLines}`);
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

    let finalPrompt = cleanPrompt + '\n\n' + pronunciationSection + '\n\n' + callScript;

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
    }

    // Notes — clean, single occurrence
    if (notes) {
        finalPrompt += `\n\n# Notas Específicas\n${notes}`;
    }

    return finalPrompt.trim();
}
