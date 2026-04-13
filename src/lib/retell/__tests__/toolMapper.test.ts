import { describe, it, expect } from 'vitest';
import { injectToolInstructions, buildRetellTools, buildPostCallAnalysis, parseBool, detectCalToolLoss, ToolsPayload } from '../toolMapper';
import { resolveVoiceId } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const base: ToolsPayload = {
    enableTransfer: false,
    transferDestinations: [],
};

const withCal: ToolsPayload = {
    ...base,
    enableCalBooking: true,
    calApiKey: 'test-cal-key',
    calEventId: '42',
    siteUrl: 'https://test.example.com',
};

// ─── injectToolInstructions ───────────────────────────────────────────────────

describe('injectToolInstructions', () => {

    describe('secciones siempre presentes', () => {
        it('incluye la sección de comunicación', () => {
            const result = injectToolInstructions('Eres un asistente.', base);
            expect(result).toContain('# Estilo de Comunicación');
        });

        it('incluye siempre la sección de idioma', () => {
            const result = injectToolInstructions('Eres un asistente.', base);
            expect(result).toContain('# Idioma');
        });

        it('incluye el guión de la llamada', () => {
            const result = injectToolInstructions('Eres un asistente.', base);
            expect(result).toContain('# Guión de la Llamada');
        });

        it('conserva el contenido del prompt base', () => {
            const result = injectToolInstructions('Eres un asistente de clínica dental.', base);
            expect(result).toContain('Eres un asistente de clínica dental.');
        });
    });

    describe('idempotencia', () => {
        it('llamarlo dos veces no duplica # Estilo de Comunicación', () => {
            const first = injectToolInstructions('Prompt base.', base);
            const second = injectToolInstructions(first, base);
            const count = (second.match(/# Estilo de Comunicación/g) || []).length;
            expect(count).toBe(1);
        });

        it('llamarlo dos veces no duplica # Idioma', () => {
            const first = injectToolInstructions('Prompt base.', base);
            const second = injectToolInstructions(first, base);
            const count = (second.match(/# Idioma/g) || []).length;
            expect(count).toBe(1);
        });

        it('llamarlo dos veces no duplica # Guión de la Llamada', () => {
            const first = injectToolInstructions('Prompt base.', base);
            const second = injectToolInstructions(first, base);
            const count = (second.match(/# Guión de la Llamada/g) || []).length;
            expect(count).toBe(1);
        });
    });

    describe('idioma', () => {
        it('inyecta norma de español por defecto', () => {
            const result = injectToolInstructions('Prompt.', base);
            expect(result).toContain('siempre en español');
        });

        it('inyecta norma de catalán cuando language es ca-ES', () => {
            const result = injectToolInstructions('Prompt.', { ...base, language: 'ca-ES' });
            expect(result).toContain('NORMA ABSOLUTA');
            expect(result).toContain('catalán');
        });

        it('inyecta norma de inglés cuando language es en-US', () => {
            const result = injectToolInstructions('Prompt.', { ...base, language: 'en-US' });
            expect(result).toContain('ABSOLUTE RULE');
            expect(result).toContain('English');
        });

        it('cambia de catalán a español al cambiar la voz', () => {
            const promptCa = injectToolInstructions('Prompt.', { ...base, language: 'ca-ES' });
            const promptEs = injectToolInstructions(promptCa, { ...base, language: 'es-ES' });
            expect(promptEs).not.toContain('catalán');
            expect(promptEs).toContain('siempre en español');
        });

        it('cambia de inglés a español al cambiar la voz', () => {
            const promptEn = injectToolInstructions('Prompt.', { ...base, language: 'en-US' });
            const promptEs = injectToolInstructions(promptEn, { ...base, language: 'es-ES' });
            expect(promptEs).not.toContain('ABSOLUTE RULE');
            expect(promptEs).toContain('siempre en español');
        });
    });

    describe('Cal.com', () => {
        it('incluye instrucciones de agendamiento cuando Cal.com está activo', () => {
            const result = injectToolInstructions('Prompt.', withCal);
            expect(result).toContain('Agendamiento');
        });

        it('no incluye agendamiento si Cal.com está desactivado', () => {
            const result = injectToolInstructions('Prompt.', base);
            expect(result).not.toContain('### Agendamiento');
        });

        it('incluye instrucciones de cancelación si cancellation está activo', () => {
            const result = injectToolInstructions('Prompt.', {
                ...withCal,
                enableCalCancellation: true,
            });
            expect(result).toContain('cancel');
        });
    });

    describe('cualificación', () => {
        it('incluye el paso de cualificación cuando hay preguntas', () => {
            const result = injectToolInstructions('Prompt.', {
                ...base,
                leadQuestions: [
                    { question: '¿Cuántos empleados tiene?', key: 'más de 10', failAction: 'end_call' },
                ],
            });
            expect(result).toContain('Cualificación');
            expect(result).toContain('¿Cuántos empleados tiene?');
        });

        it('muestra la condición de éxito', () => {
            const result = injectToolInstructions('Prompt.', {
                ...base,
                leadQuestions: [
                    { question: '¿Tiene seguro?', key: 'sí', failAction: 'end_call' },
                ],
            });
            expect(result).toContain('sí');
        });
    });

    describe('transferencias', () => {
        it('incluye instrucciones de transferencia en el guión cuando hay destinos', () => {
            const result = injectToolInstructions('Prompt.', {
                enableTransfer: true,
                transferDestinations: [
                    { name: 'Soporte', destination_type: 'number', number: '+34900000000' },
                ],
            });
            // Las instrucciones de transferencia están en el guión (PASO X), no duplicadas en sección aparte
            expect(result).toContain('transfer_to_soporte');
            expect(result).toContain('Soporte');
        });
    });

    describe('base de conocimiento', () => {
        it('incluye sección de KB si hay archivos', () => {
            const result = injectToolInstructions('Prompt.', {
                ...base,
                kbFiles: [{ id: 'kb-123', name: 'Servicios.pdf' }],
            });
            expect(result).toContain('# Base de Conocimiento');
            expect(result).toContain('Servicios.pdf');
        });

        it('no duplica la sección KB al regenerar', () => {
            const first = injectToolInstructions('Prompt.', {
                ...base,
                kbFiles: [{ id: 'kb-123', name: 'Servicios.pdf' }],
            });
            const second = injectToolInstructions(first, {
                ...base,
                kbFiles: [{ id: 'kb-123', name: 'Servicios.pdf' }],
            });
            const count = (second.match(/# Base de Conocimiento/g) || []).length;
            expect(count).toBe(1);
        });
    });

    describe('notas adicionales', () => {
        it('incluye notas si se proporcionan', () => {
            const result = injectToolInstructions('Prompt.', {
                ...base,
                customNotes: 'Siempre ofrecer café al final.',
            });
            expect(result).toContain('Siempre ofrecer café al final.');
        });
    });
});

// ─── buildRetellTools ─────────────────────────────────────────────────────────

describe('buildRetellTools', () => {

    it('devuelve array vacío si no hay herramientas activas', () => {
        const tools = buildRetellTools(base);
        expect(tools).toHaveLength(0);
    });

    it('añade end_call cuando está activo', () => {
        const tools = buildRetellTools({ ...base, enableEndCall: true });
        expect(tools.some(t => t.name === 'end_call')).toBe(true);
    });

    it('añade book_appointment cuando Cal.com está configurado', () => {
        const tools = buildRetellTools(withCal);
        expect(tools.some(t => t.name === 'book_appointment')).toBe(true);
    });

    it('añade check_appointment siempre que Cal.com está activo', () => {
        const tools = buildRetellTools(withCal);
        expect(tools.some(t => t.name === 'check_appointment')).toBe(true);
    });

    it('no añade book_appointment si calEventId no es un número válido', () => {
        const tools = buildRetellTools({ ...withCal, calEventId: 'no-es-un-id' });
        expect(tools.some(t => t.name === 'book_appointment')).toBe(false);
    });

    it('no añade book_appointment si no hay calApiKey', () => {
        const tools = buildRetellTools({ ...base, enableCalBooking: true, calEventId: '42' });
        expect(tools.some(t => t.name === 'book_appointment')).toBe(false);
    });

    it('añade transfer cuando hay destinos válidos', () => {
        const tools = buildRetellTools({
            enableTransfer: true,
            transferDestinations: [
                { name: 'Ventas', destination_type: 'number', number: '+34900000001' },
            ],
        });
        expect(tools.some(t => String(t.name).startsWith('transfer_to_'))).toBe(true);
    });

    it('acepta "true" como string (valor de Supabase JSON)', () => {
        const tools = buildRetellTools({
            ...base,
            enableEndCall: 'true' as unknown as boolean,
        });
        expect(tools.some(t => t.name === 'end_call')).toBe(true);
    });
});

// ─── buildPostCallAnalysis ────────────────────────────────────────────────────

describe('buildPostCallAnalysis', () => {

    it('incluye siempre las 3 variables predefinidas del sistema', () => {
        const result = buildPostCallAnalysis(base);
        const names = result.map(v => v.name);
        expect(names).toContain('resumen_llamada');
        expect(names).toContain('llamada_exitosa');
        expect(names).toContain('sentimiento_usuario');
    });

    it('sin extractionVariables devuelve solo las 3 predefinidas', () => {
        const result = buildPostCallAnalysis(base);
        expect(result).toHaveLength(3);
    });

    it('añade variables de extracción custom de tipo texto → string', () => {
        const result = buildPostCallAnalysis({
            ...base,
            enableExtractions: true,
            extractionVariables: [{ name: 'Motivo Llamada', type: 'texto', description: 'Por qué llama' }],
        });
        const custom = result.find(v => v.name === 'motivo_llamada');
        expect(custom).toBeDefined();
        expect(custom?.type).toBe('string');
    });

    it('normaliza el nombre a snake_case', () => {
        const result = buildPostCallAnalysis({
            ...base,
            extractionVariables: [{ name: 'Nombre Completo', type: 'string', description: '' }],
        });
        expect(result.find(v => v.name === 'nombre_completo')).toBeDefined();
    });

    it('mapea tipo selector → enum con choices desde description', () => {
        const result = buildPostCallAnalysis({
            ...base,
            extractionVariables: [{
                name: 'Interés',
                type: 'selector',
                description: 'alto, medio, bajo',
            }],
        });
        const variable = result.find(v => v.name === 'interés');
        expect(variable?.type).toBe('enum');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((variable as any)?.choices).toEqual(['alto', 'medio', 'bajo']);
    });

    it('enum sin description usa choices placeholder', () => {
        const result = buildPostCallAnalysis({
            ...base,
            extractionVariables: [{ name: 'Estado', type: 'enum', description: '' }],
        });
        const variable = result.find(v => v.name === 'estado');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((variable as any)?.choices).toEqual(['opcion_1', 'opcion_2']);
    });

    it('mapea booleano → boolean', () => {
        const result = buildPostCallAnalysis({
            ...base,
            extractionVariables: [{ name: 'Tiene seguro', type: 'booleano', description: '' }],
        });
        expect(result.find(v => v.name === 'tiene_seguro')?.type).toBe('boolean');
    });

    it('tipo desconocido cae en string por defecto', () => {
        const result = buildPostCallAnalysis({
            ...base,
            extractionVariables: [{ name: 'dato', type: 'inexistente', description: '' }],
        });
        expect(result.find(v => v.name === 'dato')?.type).toBe('string');
    });

    it('ignora variables sin nombre o sin tipo', () => {
        const result = buildPostCallAnalysis({
            ...base,
            extractionVariables: [
                { name: '', type: 'string', description: '' },
                { name: 'válida', type: '', description: '' },
            ],
        });
        expect(result).toHaveLength(3); // solo las predefinidas
    });
});

// ─── injectToolInstructions — ramas adicionales ───────────────────────────────

describe('injectToolInstructions — ramas no cubiertas', () => {

    it('incluye paso de cierre cuando enableEndCall está activo', () => {
        const result = injectToolInstructions('Prompt.', { ...base, enableEndCall: true });
        expect(result).toContain('Cierre');
        expect(result).toContain('end_call');
    });

    it('incluye herramientas personalizadas cuando customTools está activo', () => {
        const result = injectToolInstructions('Prompt.', {
            ...base,
            enableCustomTools: true,
            customTools: [
                { name: 'consultar_stock', url: 'https://api.ejemplo.com/stock', description: 'Consulta el stock disponible', speakDuring: false, speakAfter: false, parameters: [] },
            ],
        });
        expect(result).toContain('Herramientas personalizadas');
        expect(result).toContain('consultar_stock');
    });

    it('guión con Cal.com y transferencia simultáneos incluye ambas opciones', () => {
        const result = injectToolInstructions('Prompt.', {
            enableTransfer: true,
            transferDestinations: [{ name: 'Ventas', destination_type: 'number', number: '+34900000001' }],
            enableCalBooking: true,
            calApiKey: 'key',
            calEventId: '10',
            siteUrl: 'https://test.example.com',
        });
        expect(result).toContain('agendar');
        expect(result).toContain('transfer_to_ventas');
    });

    it('cualificación con failAction booking ofrece agendar cita', () => {
        const result = injectToolInstructions('Prompt.', {
            ...base,
            leadQuestions: [{ question: '¿Tiene empresa?', key: 'sí', failAction: 'booking' }],
        });
        expect(result).toContain('agendar una cita');
    });

    it('cualificación con failAction transfer usa el destino correcto', () => {
        const result = injectToolInstructions('Prompt.', {
            enableTransfer: true,
            transferDestinations: [{ name: 'Soporte', destination_type: 'number', number: '+34900000002' }],
            leadQuestions: [{
                question: '¿Tiene contrato?',
                key: 'sí',
                failAction: 'transfer',
                failTransferIdx: 0,
            }],
        });
        expect(result).toContain('transfer_to_soporte');
    });
});

// ─── buildRetellTools — custom tools con parámetros ──────────────────────────

describe('buildRetellTools — custom tools con parámetros', () => {

    it('añade custom tool con parámetros al array de herramientas', () => {
        const tools = buildRetellTools({
            ...base,
            enableCustomTools: true,
            customTools: [{
                name: 'consultar_precio',
                url: 'https://api.ejemplo.com/precio',
                description: 'Consulta el precio de un producto',
                speakDuring: false,
                speakAfter: false,
                parameters: [
                    { name: 'producto_id', type: 'string' as const, description: 'ID del producto', required: true },
                    { name: 'moneda', type: 'string' as const, description: 'Moneda (EUR, USD)', required: false },
                ],
            }],
        });
        const tool = tools.find(t => t.name === 'consultar_precio');
        expect(tool).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((tool as any)?.parameters?.properties).toHaveProperty('producto_id');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((tool as any)?.parameters?.required).toContain('producto_id');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((tool as any)?.parameters?.required).not.toContain('moneda');
    });

    it('ignora custom tools sin url o sin nombre', () => {
        const tools = buildRetellTools({
            ...base,
            enableCustomTools: true,
            customTools: [
                { name: '', url: 'https://api.ejemplo.com', description: '', speakDuring: false, speakAfter: false, parameters: [] },
                { name: 'valida', url: '', description: '', speakDuring: false, speakAfter: false, parameters: [] },
            ],
        });
        expect(tools).toHaveLength(0);
    });
});

// ─── parseBool ────────────────────────────────────────────────────────────────

describe('parseBool', () => {
    it('true (boolean) → true', () => expect(parseBool(true)).toBe(true));
    it('"true" (string) → true', () => expect(parseBool('true')).toBe(true));
    it('false (boolean) → false', () => expect(parseBool(false)).toBe(false));
    it('"false" (string) → false', () => expect(parseBool('false')).toBe(false));
    it('undefined → false', () => expect(parseBool(undefined)).toBe(false));
    it('null → false', () => expect(parseBool(null)).toBe(false));
    it('1 (number) → false — no acepta números', () => expect(parseBool(1)).toBe(false));
    it('"1" (string) → false', () => expect(parseBool('1')).toBe(false));
});

// ─── detectCalToolLoss ────────────────────────────────────────────────────────

describe('detectCalToolLoss', () => {
    const calConfig: ToolsPayload = {
        ...base,
        enableCalBooking: true,
        calApiKey: 'cal_xxx',
        calEventId: '42',
    };

    it('detecta pérdida cuando config tiene Cal.com pero tools no la incluyen', () => {
        const tools = buildRetellTools(base); // no Cal.com
        expect(detectCalToolLoss(calConfig, tools)).toBe(true);
    });

    it('no detecta pérdida cuando tools sí incluyen Cal.com', () => {
        const tools = buildRetellTools({ ...calConfig, siteUrl: 'https://test.example.com' });
        expect(detectCalToolLoss(calConfig, tools)).toBe(false);
    });

    it('no detecta pérdida si el agente no tenía Cal.com', () => {
        const tools = buildRetellTools(base);
        expect(detectCalToolLoss(base, tools)).toBe(false);
    });

    it('detecta pérdida con enableCalBooking como string "true"', () => {
        const cfgStringTrue = { ...calConfig, enableCalBooking: 'true' as unknown as boolean };
        const tools = buildRetellTools(base);
        expect(detectCalToolLoss(cfgStringTrue, tools)).toBe(true);
    });

    it('no detecta pérdida si calApiKey está vacío (Cal nunca estuvo configurada)', () => {
        const cfgNoKey = { ...calConfig, calApiKey: '' };
        const tools = buildRetellTools(base);
        expect(detectCalToolLoss(cfgNoKey, tools)).toBe(false);
    });
});

// ─── buildRetellTools — Cal.com edge cases ────────────────────────────────────

describe('buildRetellTools — Cal.com edge cases', () => {
    it('enableCalBooking como string "true" incluye book_appointment', () => {
        const tools = buildRetellTools({
            ...base,
            enableCalBooking: 'true' as unknown as boolean,
            calApiKey: 'cal_xxx',
            calEventId: '42',
            siteUrl: 'https://test.example.com',
        });
        expect(tools.some(t => t.name === 'book_appointment')).toBe(true);
    });

    it('enableCalBooking false (boolean) no incluye Cal.com tools', () => {
        const tools = buildRetellTools({
            ...base,
            enableCalBooking: false,
            calApiKey: 'cal_xxx',
            calEventId: '42',
        });
        expect(tools.some(t => t.name === 'book_appointment')).toBe(false);
    });

    it('enableCalBooking "false" (string) no incluye Cal.com tools', () => {
        const tools = buildRetellTools({
            ...base,
            enableCalBooking: 'false' as unknown as boolean,
            calApiKey: 'cal_xxx',
            calEventId: '42',
        });
        expect(tools.some(t => t.name === 'book_appointment')).toBe(false);
    });

    it('calApiKey vacío no incluye Cal.com tools aunque enableCalBooking sea true', () => {
        const tools = buildRetellTools({
            ...base,
            enableCalBooking: true,
            calApiKey: '',
            calEventId: '42',
        });
        expect(tools.some(t => t.name === 'book_appointment')).toBe(false);
    });
});

// ─── buildRetellTools — deduplicación de nombres de herramientas transfer ────

describe('buildRetellTools — deduplicación de nombres de transfer', () => {
    it('renombra destinos con el mismo nombre sanitizado añadiendo sufijo _2', () => {
        // "ventas web" and "ventas-web" both sanitize to transfer_to_ventas_web
        const tools = buildRetellTools({
            ...base,
            enableTransfer: true,
            transferDestinations: [
                { name: 'ventas web', destination_type: 'number', number: '+34600000001' },
                { name: 'ventas-web', destination_type: 'number', number: '+34600000002' },
            ],
        });
        const names = tools.map(t => t.name as string);
        expect(new Set(names).size).toBe(names.length);
        expect(names[0]).toBe('transfer_to_ventas_web');
        expect(names[1]).toBe('transfer_to_ventas_web_2');
    });

    it('no modifica el nombre si no hay colisión', () => {
        const tools = buildRetellTools({
            ...base,
            enableTransfer: true,
            transferDestinations: [
                { name: 'Ventas', destination_type: 'number', number: '+34600000001' },
                { name: 'Soporte', destination_type: 'number', number: '+34600000002' },
            ],
        });
        const names = tools.map(t => t.name as string);
        expect(names).toEqual(['transfer_to_ventas', 'transfer_to_soporte']);
    });

    it('asigna sufijos incrementales para más de dos colisiones', () => {
        // Three destinations that all sanitize to transfer_to_soporte_tecnico
        const tools = buildRetellTools({
            ...base,
            enableTransfer: true,
            transferDestinations: [
                { name: 'soporte tecnico', destination_type: 'number', number: '+34600000001' },
                { name: 'soporte-tecnico', destination_type: 'number', number: '+34600000002' },
                { name: 'soporte_tecnico', destination_type: 'number', number: '+34600000003' },
            ],
        });
        const names = tools.map(t => t.name as string);
        expect(new Set(names).size).toBe(3);
        expect(names[0]).toBe('transfer_to_soporte_tecnico');
        expect(names[1]).toBe('transfer_to_soporte_tecnico_2');
        expect(names[2]).toBe('transfer_to_soporte_tecnico_3');
    });
});

// ─── resolveVoiceId ───────────────────────────────────────────────────────────

describe('resolveVoiceId', () => {

    it('devuelve el voice_id si es válido', () => {
        expect(resolveVoiceId('11labs-Nico')).toBe('11labs-Nico');
    });

    it('devuelve fallback si el voice_id está vacío', () => {
        expect(resolveVoiceId('')).toBe('11labs-Adrian');
        expect(resolveVoiceId(undefined)).toBe('11labs-Adrian');
    });

    it('devuelve fallback si el ID es el provider_voice_id de Carolina (no importada)', () => {
        expect(resolveVoiceId('11labs-UOIqAnmS11Reiei1Ytkc')).toBe('11labs-Adrian');
    });

    it('no bloquea voice IDs válidos que empiecen por 11labs-', () => {
        expect(resolveVoiceId('11labs-Willa')).toBe('11labs-Willa');
    });
});
