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
    kbFiles?: { name: string }[];
    kbUsageInstructions?: string;
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

    // 2. Cal.com Booking & Availability (Both required for a good flow)
    if (parseBool(p.enableCalBooking) && p.calApiKey && p.calEventId) {
        const calSettings = {
            cal_api_key: p.calApiKey,
            event_type_id: parseInt(p.calEventId, 10),
            timezone: 'Europe/Madrid',
        };

        // Availability tool
        tools.push({
            type: 'check_availability_cal',
            name: 'check_availability',
            description: 'Consulta los horarios disponibles en el calendario antes de proponer una cita.',
            ...calSettings,
        });

        // Booking tool
        tools.push({
            type: 'book_appointment_cal',
            name: 'book_appointment',
            description: 'Reserva una cita en el calendario una vez el usuario ha elegido un horario.',
            ...calSettings,
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
    if (parseBool(p.enableCustomTools) && p.customTools.length > 0) {
        p.customTools.forEach((tool) => {
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
            required: true,
        }));
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
        /<!-- AUTO_KB_START -->[\s\S]*<!-- AUTO_KB_END -->/g
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

    if (p.enableCalBooking && p.calApiKey && !lowerPrompt.includes('check_availability')) {
        const today = new Date();
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Madrid' };
        const dateStr = today.toLocaleDateString('es-ES', options);

        blocks.push(`## Agenda (Citas)
Hoy es ${dateStr}.
Usa \`check_availability\` cuando el usuario quiera agendar, pregunte por huecos o quiera programar una visita.
 
### Cómo presentar los resultados:
 
**OFERTA INICIAL (primera vez):**
Selecciona los 2 huecos más próximos priorizando diversidad horaria:
1. Toma el primer hueco disponible.
2. Para el segundo, prefiere la tarde (12:00–19:59) si el primero fue por la mañana; si no, toma el siguiente más próximo.
3. Presentación natural: "Tenemos disponibilidad el [hueco 1] y [hueco 2]. ¿Cuál te viene mejor?"
 
**SI EL USUARIO PIDE MÁS OPCIONES:**
Si dice "¿no tenéis otra cosa?", "¿y otro día?", "¿nada más tarde?", "¿la semana que viene?", presenta TODOS los huecos disponibles agrupados por día.
 
### Reglas de formato (crítico):
- Idioma: Español, estilo hablado natural.
- Día: "martes dieciocho".
- Horas: Siempre con LETRAS, nunca dígitos (una, dos, tres...).
- Conversión 24h a 12h con periodos:
  - 00:00–11:59: "de la mañana"
  - 12:00: "del mediodía"
  - 12:30–19:59: "de la tarde"
  - 20:00–23:59: "de la noche"
- "la una" (nunca "un").
- :30 -> "y media" | :00 -> omitir minutos.
- Ejemplo mismo día: "a las diez de la mañana y a las tres de la tarde".
 
### Disponibilidad completa (agrupada por día):
Agrupa slots consecutivos de 30 min en rangos: "entre las [inicio] y las [fin]". Un hueco rompe la secuencia. Conecta rangos con ", y también".
Ejemplo: "Jueves 14 de noviembre: entre las nueve y las diez de la mañana, y también entre las dos y las tres y media de la tarde."
 
### Si no hay disponibilidad:
"Ahora mismo no tenemos huecos disponibles en los próximos días. ¿Quieres que te llame alguien del equipo para buscar una fecha?"
 
### Tras elegir un hueco:
Una vez que el usuario elige un hueco, confírmalo claramente (ej: "Perfecto, te apunto el martes dieciocho a las diez de la mañana"). Pide su nombre completo y usa INMEDIATAMENTE \`book_appointment\` para realizar la reserva. **No vuelvas a consultar disponibilidad una vez que el hueco ya ha sido seleccionado y confirmado por el usuario.**`);
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

    if (p.enableCustomTools && p.customTools.length > 0) {
        const toolList = p.customTools
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

    // ALWAYS add Voice Style Rules for phonetic consistency
    blocks.push(`## Normas de Estilo de Voz (CRÍTICO)
Para que suenes natural y cercano, sigue estas reglas de pronunciación en ESPAÑOL:
1. **Fechas y Horas**: No digas formatos numéricos. Usa lenguaje coloquial. Di "las nueve de la mañana", "la una de la tarde", "las ocho de la tarde". Nunca digas "trece horas" o "veinte cero cero".
2. **Números de Teléfono**: No digas el prefijo "+34". Pronuncia los números de uno en uno o en grupos pequeños, escritos con letras. Ejemplo: "seis seis seis, cinco cinco, cuatro tres".
3. **Páginas Web**: Pronuncia los puntos. Ejemplo: en lugar de "benam.es" di "benam punto e-s" o "benam punto es".
4. **Correos Electrónicos**: Di "arroba" para "@" y "punto" para ".". Ejemplo: "contacto arroba empresa punto com".
5. **General**: No leas números, símbolos o formatos técnicos. Di siempre las palabras tal y como se pronuncian en una conversación natural.`);

    if (blocks.length === 0) return cleanPrompt;

    return `${cleanPrompt}\n\n# Uso de herramientas\n\n${blocks.join('\n\n')}`;
}
