/**
 * toolMapper.ts
 * Converts Wizard Step 7 state into:
 *   1. Retell LLM `tools` array (sent when creating/updating the LLM)
 *   2. Retell LLM `post_call_analysis_data` (extraction variables)
 *   3. Prompt instruction blocks injected at the end of the system prompt
 */

// ---- Wizard types (mirrored here to avoid circular deps) ----
export interface TransferDestination { name: string; number: string; description: string; }
export interface CustomTool { name: string; url: string; description: string; speakDuring: boolean; speakAfter: boolean; }
export interface ExtractionVariable { name: string; type: string; description: string; }

export interface ToolsPayload {
    enableEndCall: boolean;
    endCallDescription: string;
    enableCalBooking: boolean;
    calUrl: string;
    calApiKey: string;
    calEventId: string;
    enableCalAvailability: boolean;
    calAvailabilityDays: number;
    enableTransfer: boolean;
    transferDestinations: TransferDestination[];
    enableCustomTools: boolean;
    customTools: CustomTool[];
    extractionVariables: ExtractionVariable[];
    enableAnalysis: boolean;
    analysisModel: string;
    webhookUrl: string;
    webhookInbound: string;
    kbFiles?: { name: string }[];
    kbUsageInstructions?: string;
}

// ---- Retell SDK tool types ----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RetellTool = Record<string, any>;

/**
 * Builds the `tools` array for the Retell LLM create/update call.
 */
export function buildRetellTools(p: ToolsPayload): RetellTool[] {
    const tools: RetellTool[] = [];

    // 1. End Call
    if (p.enableEndCall) {
        tools.push({
            type: 'end_call',
            name: 'end_call',
            description: p.endCallDescription ||
                'Finaliza la llamada de forma cordial cuando la conversación haya concluido.',
        });
    }

    // 2. Cal.com Booking
    if (p.enableCalBooking && p.calUrl && p.calApiKey) {
        tools.push({
            type: 'book_appointment_cal',
            name: 'book_appointment',
            description: 'Reserva una cita en el calendario del cliente a través de Cal.com.',
            cal: {
                cal_api_key: p.calApiKey,
                event_type_id: parseInt(p.calEventId || '0', 10),
                timezone: 'Europe/Madrid',
            },
            speak_during_execution: false,
            speak_after_execution: true,
            execution_message_description:
                'Di algo como "Un momento, estoy comprobando la disponibilidad…"',
        });
    }

    // 3. Cal.com Availability check
    if (p.enableCalAvailability && p.calApiKey) {
        tools.push({
            type: 'check_availability_cal',
            name: 'check_availability',
            description: `Consulta la disponibilidad del calendario para los próximos ${p.calAvailabilityDays} días.`,
            cal: {
                cal_api_key: p.calApiKey,
                event_type_id: parseInt(p.calEventId || '0', 10),
                timezone: 'Europe/Madrid',
            },
            speak_during_execution: false,
            speak_after_execution: true,
            execution_message_description:
                'Di algo como "Déjame revisar los horarios disponibles…"',
        });
    }

    // 4. Call Transfer
    if (p.enableTransfer && p.transferDestinations.length > 0) {
        p.transferDestinations.forEach((dest, idx) => {
            if (!dest.number) return;
            // Use a clean, unique name for the tool
            const cleanName = dest.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'agent';
            const toolName = `transfer_to_${cleanName}`;

            tools.push({
                type: 'transfer_call',
                name: toolName,
                description: dest.description || `Transfiere la llamada a ${dest.name}.`,
                number: dest.number,
            });
        });
    }

    // 5. Custom webhook tools
    if (p.enableCustomTools && p.customTools.length > 0) {
        p.customTools.forEach((tool) => {
            if (!tool.url || !tool.name) return;
            tools.push({
                type: 'custom',
                name: tool.name,
                description: tool.description,
                url: tool.url,
                speak_during_execution: tool.speakDuring,
                speak_after_execution: tool.speakAfter,
                execution_message_description: tool.speakDuring
                    ? 'Informa al usuario que estás procesando su solicitud.'
                    : undefined,
            });
        });
    }

    return tools;
}

/**
 * Builds the `post_call_analysis_data` array for the Retell LLM.
 */
export function buildPostCallAnalysis(p: ToolsPayload) {
    if (!p.extractionVariables || p.extractionVariables.length === 0) return undefined;

    return p.extractionVariables
        .filter(v => v.name && v.type)
        .map(v => ({
            name: v.name,
            type: v.type as 'string' | 'boolean' | 'number',
            description: v.description,
        }));
}

/**
 * Injects tool usage instructions at the END of the system prompt.
 * This ensures the LLM knows when and how to call each tool.
 */
export function injectToolInstructions(basePrompt: string, p: ToolsPayload): string {
    // Si el prompt ya tiene los marcadores de AUTO_TOOLS o AUTO_KB del frontend, 
    // no añadimos nada más en el backend para evitar redundancia y "ensuciar" el prompt.
    if (basePrompt.includes('<!-- AUTO_TOOLS_START -->') || basePrompt.includes('<!-- AUTO_KB_START -->')) {
        return basePrompt;
    }

    const blocks: string[] = [];

    if (p.enableEndCall) {
        blocks.push(
            `## Finalizar llamada\nCuando el usuario indique que ya no necesita nada más, o tras confirmar una gestión exitosa, usa la herramienta \`end_call\` para cerrar la llamada de forma amable.`
        );
    }

    // ... rest of the existing code for blocks ...
    if (p.enableCalBooking && p.calUrl) {
        blocks.push(
            `## Reservar cita\nSi el usuario quiere programar una cita o reunión, usa la herramienta \`book_appointment\` para registrarla en el calendario. Recoge siempre: nombre completo, email, número de teléfono y horario deseado antes de confirmar.`
        );
    }

    if (p.enableCalAvailability) {
        blocks.push(
            `## Consultar disponibilidad\nAntes de proponer fechas concretas, usa \`check_availability\` para verificar los huecos libres en el calendario. Presenta al usuario 2 o 3 opciones de las disponibles.`
        );
    }

    if (p.enableTransfer && p.transferDestinations.length > 0) {
        const destList = p.transferDestinations
            .filter(d => d.number)
            .map((d, idx) => {
                const cleanName = d.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'agent';
                const toolName = `transfer_to_${cleanName}`;
                return `- **${d.name}**: ${d.description || d.number} (llamar a la herramienta \`${toolName}\`)`;
            })
            .join('\n');
        blocks.push(
            `## Transferir llamada\nPuedes transferir la llamada en los siguientes casos:\n${destList}\nAnuncia siempre la transferencia al usuario antes de ejecutar la función correspondiente.`
        );
    }

    if (p.enableCustomTools && p.customTools.length > 0) {
        const toolList = p.customTools
            .filter(t => t.name && t.url)
            .map(t => `- **${t.name}**: ${t.description}`)
            .join('\n');
        blocks.push(`## Herramientas personalizadas\n${toolList}`);
    }

    if (p.kbFiles && p.kbFiles.length > 0) {
        const fileNames = p.kbFiles.map(f => f.name.toLowerCase().replace(/\s+/g, '_')).join(', ');
        blocks.push(
            `## Base de Conocimientos\nSi el usuario te pregunta sobre ${p.kbUsageInstructions || 'servicios o productos'}, consulta la base de conocimientos ${fileNames}.`
        );
    }

    if (blocks.length === 0) return basePrompt;

    return `${basePrompt}\n\n---\n\n# Instrucciones de uso de herramientas y base de conocimientos\n\n${blocks.join('\n\n')}`;
}
