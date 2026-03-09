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
    // Company Info
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyWebsite?: string;
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

// ---- Formatting Utilities (Sync with Step 8) ----

const formatTimeToSpanishWords = (timeStr: string) => {
    if (!timeStr) return '';
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);

    const minutesToWords = (n: number) => {
        const words: Record<number, string> = {
            1: 'un', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez',
            11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince', 16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve',
            20: 'veinte', 21: 'veintiuno', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro', 25: 'veinticinco', 26: 'veintiséis', 27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve',
            30: 'treinta', 31: 'treinta y uno', 32: 'treinta y dos', 33: 'treinta y tres', 34: 'treinta y cuatro', 35: 'treinta y cinco', 36: 'treinta y seis', 37: 'treinta y siete', 38: 'treinta y ocho', 39: 'treinta y nueve',
            40: 'cuarenta', 41: 'cuarenta y uno', 42: 'cuarenta y dos', 43: 'cuarenta y tres', 44: 'cuarenta y cuatro', 45: 'cuarenta y cinco', 46: 'cuarenta y seis', 47: 'cuarenta y siete', 48: 'cuarenta y ocho', 49: 'cuarenta y nueve',
            50: 'cincuenta', 51: 'cincuenta y uno', 52: 'cincuenta y dos', 53: 'cincuenta y tres', 54: 'cincuenta y cuatro', 55: 'cincuenta y cinco', 56: 'cincuenta y seis', 57: 'cincuenta y siete', 58: 'cincuenta y ocho', 59: 'cincuenta y nueve'
        };
        return words[n] || String(n);
    };

    let hourWord = '';
    const hoursMap: Record<number, string> = {
        0: 'las doce de la noche', 1: 'la una de la mañana', 2: 'las dos de la mañana', 3: 'las tres de la mañana',
        4: 'las cuatro de la mañana', 5: 'las cinco de la mañana', 6: 'las seis de la mañana', 7: 'las siete de la mañana',
        8: 'las ocho de la mañana', 9: 'las nueve de la mañana', 10: 'las diez de la mañana', 11: 'las once de la mañana',
        12: 'las doce del mediodía', 13: 'la una de la tarde', 14: 'las dos de la tarde', 15: 'las tres de la tarde',
        16: 'las cuatro de la tarde', 17: 'las cinco de la tarde', 18: 'las seis de la tarde', 19: 'las siete de la tarde',
        20: 'las ocho de la tarde', 21: 'las nueve de la noche', 22: 'las diez de la noche', 23: 'las once de la noche'
    };

    hourWord = hoursMap[hours] || `${hours}`;

    if (minutes === 0) return hourWord;
    if (minutes === 30) return `${hourWord} y media`;
    if (minutes === 15) return `${hourWord} y cuarto`;

    return `${hourWord} y ${minutesToWords(minutes)} minutos`;
};

const groupBusinessHours = (hours: { day: string; open: string; close: string; closed: boolean }[]) => {
    const active = hours.filter(h => !h.closed);
    if (active.length === 0) return "Estamos cerrados todos los días.";

    const groups: { hoursKey: string; open: string; close: string; days: string[] }[] = [];

    active.forEach(h => {
        const hoursKey = `${h.open}-${h.close}`;
        const existing = groups.find(g => g.hoursKey === hoursKey);
        if (existing) {
            existing.days.push(h.day);
        } else {
            groups.push({ hoursKey, open: h.open, close: h.close, days: [h.day] });
        }
    });

    return groups.map(g => {
        const formattedDays = g.days.map((d, i) => i === 0 ? d : d.toLowerCase());
        const daysJoined = formattedDays.length === 1
            ? formattedDays[0]
            : formattedDays.slice(0, -1).join(', ') + ' y ' + formattedDays[formattedDays.length - 1];

        return `${daysJoined} de ${formatTimeToSpanishWords(g.open)} a ${formatTimeToSpanishWords(g.close)}.`;
    }).join(' ');
};

const formatPhoneForTTS = (phone: string) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/^\+34|^0034/, '');
    const digitWords: Record<string, string> = {
        '0': 'cero', '1': 'uno', '2': 'dos', '3': 'tres', '4': 'cuatro',
        '5': 'cinco', '6': 'seis', '7': 'siete', '8': 'ocho', '9': 'nueve'
    };
    return cleanPhone.split('').map(d => digitWords[d] || d).join(' ').trim();
};

const formatUrlForTTS = (url: string) => {
    if (!url) return '';
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\//g, ' barra ').replace(/\./g, ' punto ').replace(/\s+/g, ' ').trim();
};

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

    // --- COMPANY INFO INJECTION ---
    const formattedHours = p.businessHours ? groupBusinessHours(p.businessHours) : '';
    const companySection = p.companyName ? `
<!-- AUTO_COMPANY_START -->
# Información de Contacto de ${p.companyName}
- Dirección: ${p.companyAddress || 'No especificada'}
- Teléfono para contacto (leído dígito a dígito): ${formatPhoneForTTS(p.companyPhone || '') || 'No especificado'}
- Web: ${formatUrlForTTS(p.companyWebsite || '') || 'No especificada'}

# Horario comercial:
${formattedHours}
<!-- AUTO_COMPANY_END -->
` : '';

    // Clean existing company blocks if they exist
    const companyRegex = /<!-- AUTO_COMPANY_START -->[\s\S]*<!-- AUTO_COMPANY_END -->/;
    if (companyRegex.test(cleanPrompt)) {
        cleanPrompt = cleanPrompt.replace(companyRegex, '').trim();
    }

    // ALWAYS add Voice Style Rules for phonetic consistency
    blocks.push(`## Normas de Estilo de Voz (CRÍTICO)
Para que suenes natural y cercano, sigue estas reglas de pronunciación en ESPAÑOL:
4. **Correos Electrónicos**: Di "arroba" para "@" y "punto" para ".". Ejemplo: "contacto arroba empresa punto com".
5. **General**: No leas números, símbolos o formatos técnicos. Di siempre las palabras tal y como se pronuncian en una conversación natural.`);

    if (blocks.length === 0 && !companySection) return cleanPrompt;

    let finalPrompt = cleanPrompt;
    if (blocks.length > 0) {
        finalPrompt += `\n\n# Uso de herramientas\n\n${blocks.join('\n\n')}`;
    }
    if (companySection) {
        finalPrompt += `\n\n${companySection.trim()}`;
    }

    return finalPrompt;
}
