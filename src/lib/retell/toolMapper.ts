/**
 * toolMapper.ts
 * Converts Wizard Step 7 state into:
 *   1. Retell LLM `tools` array (sent when creating/updating the LLM)
 *   2. Retell LLM `post_call_analysis_data` (extraction variables)
 *   3. Prompt instruction blocks injected at the end of the system prompt
 */

// ---- Wizard types (mirrored here to avoid circular deps) ----
export interface TransferDestination {
    name: string;
    description: string;
    number?: string;
    agentId?: string;
    destination_type: 'number' | 'agent';
    transfer_mode?: 'cold' | 'warm';
}
export interface ToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean';
    description: string;
    required: boolean;
}
export interface CustomTool {
    name: string;
    url: string;
    description: string;
    speakDuring: boolean;
    speakAfter: boolean;
    parameters: ToolParameter[];
}
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

type RetellTool = Record<string, unknown>;

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

    // 2. Cal.com Booking & Availability (Both required for a good flow)
    if (p.enableCalBooking && p.calApiKey) {
        const calSettings = {
            cal_api_key: p.calApiKey,
            event_type_id: parseInt(p.calEventId || '0', 10),
            timezone: 'Europe/Madrid',
        };

        // Availability tool
        tools.push({
            type: 'check_availability_cal',
            name: 'check_availability',
            description: 'Consulta los horarios disponibles en el calendario antes de proponer una cita.',
            ...calSettings,
            speak_during_execution: false,
            speak_after_execution: true,
            execution_message_description: 'Di algo como "Déjame revisar los horarios disponibles…"',
        });

        // Booking tool
        tools.push({
            type: 'book_appointment_cal',
            name: 'book_appointment',
            description: 'Reserva una cita en el calendario una vez el usuario ha elegido un horario.',
            ...calSettings,
            speak_during_execution: false,
            speak_after_execution: true,
            execution_message_description: 'Di algo como "Un momento, estoy reservando tu cita…"',
        });
    }

    // 4. Call Transfer
    if (p.enableTransfer && p.transferDestinations.length > 0) {
        p.transferDestinations.forEach((dest) => {
            if (dest.destination_type === 'number' && !dest.number) return;
            if (dest.destination_type === 'agent' && !dest.agentId) return;
            // Use a clean, unique name for the tool
            const cleanName = dest.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'agent';
            const toolName = `transfer_to_${cleanName}`;

            const transfer_destination: { type: 'agent'; agent_id?: string } | { type: 'predefined'; number?: string } = dest.destination_type === 'agent'
                ? { type: 'agent', agent_id: dest.agentId }
                : { type: 'predefined', number: dest.number };

            tools.push({
                type: 'transfer_call',
                name: toolName,
                description: dest.description || `Transfiere la llamada a ${dest.name}.`,
                transfer_destination,
                transfer_option: {
                    type: dest.transfer_mode === 'warm' ? 'warm_transfer' : 'cold_transfer',
                }
            });
        });
    }

    // 5. Custom webhook tools
    if (p.enableCustomTools && p.customTools.length > 0) {
        p.customTools.forEach((tool) => {
            if (!tool.url || !tool.name) return;
            // Build JSON Schema for parameters
            const properties: Record<string, any> = {};
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
                    ? 'Informa al usuario que estás procesando su solicitud.'
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
    // Definimos los marcadores para poder limpiar el prompt si es necesario
    const START_MARKER = '### INSTRUCCIONES_HERRAMIENTAS_START ###';
    const END_MARKER = '### INSTRUCCIONES_HERRAMIENTAS_END ###';

    // Limpiamos cualquier bloque previo de instrucciones automáticas para evitar duplicados
    let cleanPrompt = basePrompt;
    const regex = new RegExp(`\\n?\\n?${START_MARKER}[\\s\\S]*?${END_MARKER}`, 'g');
    cleanPrompt = cleanPrompt.replace(regex, '').trim();

    // Si el prompt ya tiene los marcadores de AUTO_TOOLS o AUTO_KB del frontend, 
    // no añadimos nada más en el backend para evitar redundancia.
    if (cleanPrompt.includes('<!-- AUTO_TOOLS_START -->') || cleanPrompt.includes('<!-- AUTO_KB_START -->')) {
        return cleanPrompt;
    }

    const blocks: string[] = [];

    if (p.enableEndCall) {
        blocks.push(
            `## Finalizar llamada\nCuando el usuario indique que ya no necesita nada más, o tras confirmar una gestión exitosa, usa la herramienta \`end_call\` para cerrar la llamada de forma amable.`
        );
    }

    // ... rest of the existing code for blocks ...
    if (p.enableCalBooking && p.calApiKey) {
        blocks.push(
            `## Gestión de Citas (Cal.com)\nSi el usuario quiere agendar una cita o reunión:\n1. Usa **siempre** primero la herramienta \`check_availability\` para ver los huecos libres.\n2. Presenta las opciones al usuario y pídele que elija una.\n3. Una vez confirmado el horario, usa \`book_appointment\` para realizar la reserva.\nRecoge siempre: nombre completo, email y número de teléfono antes de confirmar la reserva final.`
        );
    }

    if (p.enableTransfer && p.transferDestinations.length > 0) {
        const destList = p.transferDestinations
            .filter(d => (d.destination_type === 'number' && d.number) || (d.destination_type === 'agent' && d.agentId))
            .map((d) => {
                const cleanName = d.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'agent';
                const toolName = `transfer_to_${cleanName}`;
                const destInfo = d.destination_type === 'number' ? `número ${d.number}` : `agente con ID ${d.agentId}`;
                return `- **${d.name}**: ${d.description || `Transferir a ${destInfo}`} (llamar a la herramienta \`${toolName}\`)`;
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

    if (blocks.length === 0) return cleanPrompt;

    const toolInstructions = `\n\n${START_MARKER}\n# Instrucciones de uso de herramientas y base de conocimientos\n\n${blocks.join('\n\n')}\n${END_MARKER}`;

    return `${cleanPrompt}${toolInstructions}`;
}
