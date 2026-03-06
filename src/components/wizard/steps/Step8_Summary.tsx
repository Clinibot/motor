"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';

/* ─── Estilos locales fieles al HTML de referencia wizard-paso8-netelip.html ─── */
const S = {
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '24px',
        marginBottom: '32px',
    } as React.CSSProperties,
    summaryCard: {
        background: '#f5f6f8',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        padding: '24px',
    } as React.CSSProperties,
    summaryCardFullWidth: {
        gridColumn: '1 / -1',
        background: '#f5f6f8',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        padding: '24px',
    } as React.CSSProperties,
    summaryCardHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
    } as React.CSSProperties,
    summaryCardTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    } as React.CSSProperties,
    summaryCardIcon: {
        width: '40px',
        height: '40px',
        background: 'white',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
    } as React.CSSProperties,
    summaryCardH3: {
        fontSize: '16px',
        fontWeight: 700,
        color: '#1a2428',
        margin: 0,
    } as React.CSSProperties,
    editBtn: {
        background: 'white',
        border: '1px solid #e5e7eb',
        color: '#6c757d',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s',
    } as React.CSSProperties,
    summaryContent: {
        background: 'white',
        borderRadius: '8px',
        padding: '16px',
    } as React.CSSProperties,
    summaryItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #e5e7eb',
    } as React.CSSProperties,
    summaryItemLast: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
    } as React.CSSProperties,
    summaryLabel: {
        fontSize: '13px',
        fontWeight: 600,
        color: '#6c757d',
    } as React.CSSProperties,
    summaryValue: {
        fontSize: '14px',
        fontWeight: 600,
        color: '#1a2428',
        textAlign: 'right' as const,
        maxWidth: '60%',
        wordWrap: 'break-word' as const,
    } as React.CSSProperties,
    alertSuccess: {
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    } as React.CSSProperties,
    alertDanger: {
        background: '#fff1f2',
        border: '1px solid #fecdd3',
        borderRadius: '8px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
    } as React.CSSProperties,
    actionButtons: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginTop: '32px',
        paddingTop: '32px',
        borderTop: '2px solid #e5e7eb',
    } as React.CSSProperties,
    btnCreateAgent: {
        padding: '14px 20px',
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '14px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        background: '#10b981',
        color: 'white',
        transition: 'all 0.2s',
    } as React.CSSProperties,
    btnBack: {
        padding: '12px 24px',
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '14px',
        background: 'white',
        color: '#6c757d',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    } as React.CSSProperties,
    wizardActions: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '40px',
        paddingTop: '28px',
        borderTop: '1px solid #e5e7eb',
    } as React.CSSProperties,
};

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
    return (
        <div style={last ? S.summaryItemLast : S.summaryItem}>
            <span style={S.summaryLabel}>{label}</span>
            <span style={S.summaryValue}>{value}</span>
        </div>
    );
}

function SummaryCard({
    icon, color, title, step, onEdit, children,
    fullWidth = false,
}: {
    icon: string; color: string; title: string; step: number;
    onEdit: (s: number) => void; children: React.ReactNode; fullWidth?: boolean;
}) {
    return (
        <div style={fullWidth ? S.summaryCardFullWidth : S.summaryCard}>
            <div style={S.summaryCardHeader}>
                <div style={S.summaryCardTitle}>
                    <div style={S.summaryCardIcon}>
                        <i className={`bi ${icon}`} style={{ color }} />
                    </div>
                    <h3 style={S.summaryCardH3}>{title}</h3>
                </div>
                <button style={S.editBtn} onClick={() => onEdit(step)}>
                    <i className="bi bi-pencil" /> Editar
                </button>
            </div>
            <div style={S.summaryContent}>{children}</div>
        </div>
    );
}

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
    // Eliminar +34 o 0034 al principio
    const cleanPhone = phone.replace(/^\+34|^0034/, '');

    // Convertir cada dígito en palabra para pronunciación clara
    const digitWords: Record<string, string> = {
        '0': 'cero', '1': 'uno', '2': 'dos', '3': 'tres', '4': 'cuatro',
        '5': 'cinco', '6': 'seis', '7': 'siete', '8': 'ocho', '9': 'nueve'
    };

    return cleanPhone
        .split('')
        .map(d => digitWords[d] || d)
        .join(' ')
        .trim();
};


const formatUrlForTTS = (url: string) => {
    if (!url) return '';
    return url
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\//g, ' barra ')
        .replace(/\./g, ' punto ')
        .replace(/\s+/g, ' ')
        .trim();
};

const cleanPromptForDeployment = (prompt: string) => {
    if (!prompt) return '';
    return prompt
        // Eliminar comentarios de sincronización
        .replace(/<!-- AUTO_TOOLS_START -->[\s\S]*<!-- AUTO_TOOLS_END -->/g, (match) => {
            return match
                .replace(/<!-- AUTO_TOOLS_START -->/g, '')
                .replace(/<!-- AUTO_TOOLS_END -->/g, '')
                .trim();
        })
        .replace(/<!-- AUTO_KB_START -->[\s\S]*<!-- AUTO_KB_END -->/g, (match) => {
            return match
                .replace(/<!-- AUTO_KB_START -->/g, '')
                .replace(/<!-- AUTO_KB_END -->/g, '')
                .trim();
        })
        // Eliminar cualquier otro comentario HTML que pudiera quedar
        .replace(/<!--[\s\S]*?-->/g, '')
        // Normalizar espacios en blanco (máximo 2 saltos de línea)
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

export const Step8_Summary: React.FC = () => {
    const wizardData = useWizardStore();
    const { setStep, prevStep, updateField } = wizardData;

    const [mounted, setMounted] = useState(false);
    React.useEffect(() => { setMounted(true); }, []);

    const [isCreating, setIsCreating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const editingAgentId = wizardData.editingAgentId;

    const getUpdatedPrompt = React.useCallback(() => {
        const name = wizardData.agentName || 'Sofía';
        const company = wizardData.companyName || 'nuestra empresa';
        const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const formattedHours = groupBusinessHours(wizardData.businessHours);

        const personalityStr = wizardData.personality.length > 0
            ? `Tu personalidad es: ${wizardData.personality.join(', ')}.`
            : 'Tienes una personalidad profesional y atenta.';
        const toneStr = `Tu tono de comunicación es ${wizardData.tone}.`;
        const langMap: Record<string, string> = {
            'es-ES': 'español de España', 'es-MX': 'español con acento mexicano',
            'es-AR': 'español con acento argentino', 'es-419': 'español latinoamericano neutro',
            'en-US': 'inglés americano', 'en-GB': 'inglés británico',
            'pt-BR': 'portugués de Brasil', 'fr-FR': 'francés',
        };
        const langStr = langMap[wizardData.language] || 'español';

        // Bloques de herramientas y KB para la previsualización con marcadores para evitar bucles
        const toolsContentArr: string[] = [];
        if (wizardData.enableCalBooking && wizardData.calApiKey) {
            toolsContentArr.push(`## Agenda y Disponibilidad (Cal.com)
Tienes acceso a una herramienta para consultar huecos disponibles. Úsala cuando el usuario quiera reservar, pregunte por horarios o quiera agendar una visita.

### Cómo presentar los resultados:

**OFERTA INICIAL (primer contacto):**
Selecciona los 2 huecos más próximos priorizando diversidad horaria:
1. Toma el hueco más cercano.
2. Para el segundo, prefiere la tarde (12:00 a 20:00) si el primero fue por la mañana; si no, el siguiente disponible.
3. Preséntalos de forma natural: "Tenemos disponibilidad el [hueco 1] y [hueco 2]. ¿Cuál te viene mejor?"

**CUANDO EL USUARIO PIDE MÁS OPCIONES:**
Si el usuario dice "¿no tenéis otra cosa?", "¿y otro día?", "¿algo más tarde?" o similar, presenta TODOS los huecos disponibles agrupados por día.

### Reglas de formato (Habla natural):
- Idioma: Español coloquial.
- Días: "martes dieciocho", "miércoles diecinueve".
- Horas: SIEMPRE con palabras, nunca números (una, dos, tres...).
- Formato horario:
  - 00:00–11:59 → "de la mañana"
  - 12:00 → "del mediodía"
  - 12:30–19:59 → "de la tarde"
  - 20:00–23:59 → "de la noche"
- 1:00 → SIEMPRE "la una" (nunca "un").
- :30 → "y media" | :00 → omite los minutos.
- Ejemplo mismo día: "a las diez de la mañana y a las tres de la tarde".

### Disponibilidad Completa (agrupada):
Agrupa huecos de 30 minutos consecutivos en rangos: "entre las [inicio] y las [fin]".
Un salto de tiempo rompe el rango. Usa ", y también" para conectar rangos del mismo día.
Hueco único: "solo tenemos disponibilidad a las [hora]".

**Si no hay disponibilidad:** "Ahora mismo no tenemos huecos libres en los próximos días. ¿Quieres que te llame alguien del equipo para buscar una fecha?"

**Tras elegir hueco:** Confirma el día y hora claramente antes de reservar: "Perfecto, te apunto el [día] a las [hora]. ¿Me confirmas tu nombre completo?"`);
        }
        if (wizardData.enableTransfer && wizardData.transferDestinations.length > 0) {
            const transfers = wizardData.transferDestinations
                .map(d => `- Si el usuario ${d.description || 'quiere hablar con un compañero'}, entonces ejecuta la función \`transfer_to_${d.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}\`.`)
                .join('\n');
            toolsContentArr.push(`## Transferencias\n${transfers}`);
        }

        const toolsInnerContent = toolsContentArr.join('\n\n');
        const toolsSection = toolsInnerContent
            ? `\n\n<!-- AUTO_TOOLS_START -->\n# Uso de herramientas\n${toolsInnerContent}\n<!-- AUTO_TOOLS_END -->\n`
            : '';

        const kbInnerContent = wizardData.kbFiles.length > 0
            ? wizardData.kbFiles.map(f => `- Información: ${f.name}`).join('\n') +
            (wizardData.kbUsageInstructions ? `\n\nInstrucciones adicionales: ${wizardData.kbUsageInstructions}` : '')
            : '';

        const kbSection = kbInnerContent
            ? `\n\n<!-- AUTO_KB_START -->\n${kbInnerContent}\n<!-- AUTO_KB_END -->\n`
            : '';

        const companySection = `\n\n<!-- AUTO_COMPANY_START -->\n# Información de Contacto de ${company}\n- Dirección: ${wizardData.companyAddress || 'No especificada'}\n- Teléfono para contacto (leído dígito a dígito): ${formatPhoneForTTS(wizardData.companyPhone || '') || 'No especificado'}\n- Web: ${formatUrlForTTS(wizardData.companyWebsite || '') || 'No especificada'}\n\n# Horario comercial:\n${formattedHours}\n<!-- AUTO_COMPANY_END -->\n`;

        let finalPrompt = '';
        const currentPrompt = wizardData.prompt || '';

        // Si ya hay un prompt y no es el por defecto, intentamos "Smart Update"
        if (currentPrompt && currentPrompt !== 'Eres un asistente útil.') {
            finalPrompt = currentPrompt;

            const toolsRegex = /<!-- AUTO_TOOLS_START -->[\s\S]*<!-- AUTO_TOOLS_END -->/;
            if (toolsRegex.test(finalPrompt)) {
                finalPrompt = finalPrompt.replace(toolsRegex, toolsSection.trim());
            } else if (toolsSection) {
                if (finalPrompt.includes('### Despedida')) {
                    finalPrompt = finalPrompt.replace('### Despedida', `${toolsSection.trim()}\n\n### Despedida`);
                } else {
                    finalPrompt += `\n\n${toolsSection.trim()}`;
                }
            }

            const kbRegex = /<!-- AUTO_KB_START -->[\s\S]*<!-- AUTO_KB_END -->/;
            if (kbRegex.test(finalPrompt)) {
                finalPrompt = finalPrompt.replace(kbRegex, kbSection.trim());
            } else if (kbSection) {
                finalPrompt += `\n\n${kbSection.trim()}`;
            }

            const companyRegex = /<!-- AUTO_COMPANY_START -->[\s\S]*<!-- AUTO_COMPANY_END -->/;
            if (companyRegex.test(finalPrompt)) {
                finalPrompt = finalPrompt.replace(companyRegex, companySection.trim());
            } else {
                // Si no hay marcadores de empresa, los inyectamos al final
                finalPrompt += `\n\n${companySection.trim()}`;
            }
        } else {
            finalPrompt = `
# Contexto Temporal
Fecha actual: ${today}. Úsala para orientar al cliente sobre días de la semana y citas.

# Idioma
Habla siempre en ${langStr}. No cambies de idioma a menos que el usuario lo solicite explícitamente.

# Rol
Eres ${name} de ${company}.
Tu misión es atender las llamadas de forma humana, cálida y eficiente, evitando sonar como un robot.

## Estilo de Comunicación
- ${personalityStr}
- ${toneStr}
- Frases cortas y directas. No des rodeos.
- Regla de oro: Habla siempre con palabras. Nunca uses dígitos para horas, teléfonos o fechas cuando respondas.
- Empatía y escucha activa.
- Nunca hagas más de una pregunta a la vez.
- REGLA CRÍTICA: No repitas datos que el usuario ya ha dicho. Pasa a la siguiente tarea.

## Tareas Principales
${wizardData.agentType === 'transferencia' ? `### Identificación y Transferencia
1. Entiende el motivo de la llamada.
2. Si es necesario, informa que vas a transferir la llamada a un compañero.` : wizardData.agentType === 'agendamiento' ? `### Agendamiento
1. Resuelve dudas sobre los servicios.
2. Si el usuario quiere una cita, verifica disponibilidad usando tus herramientas de agenda.
3. Sigue estrictamente las reglas de presentación de huecos (oferta inicial vs más opciones).
4. Pide nombre y datos necesarios para confirmar una vez elegido el hueco.` : `### Resolución y Cualificación
1. Resuelve dudas sobre ${company}.
2. Interésate por las necesidades del cliente.
3. Si hay variables específicas a extraer, asegúrate de obtenerlas de forma natural en la charla.`}

${toolsSection.trim() ? `${toolsSection.trim()}` : ''}
${wizardData.extractionVariables.length > 0 ? `\n### Datos a Extraer
${wizardData.extractionVariables.map(v => `- **${v.name}** (${v.type}): ${v.description}`).join('\n')}` : ''}

### Despedida
Antes de terminar, pregunta si hay algo más en lo que puedas ayudar. Despídete cordialmente.
${kbSection.trim() ? `\n${kbSection.trim()}` : ''}
${companySection.trim() ? `\n${companySection.trim()}` : ''}

# Reglas de Terminación
Si el usuario se despide o no necesita nada más, despídete y usa la herramienta 'end_call' inmediatamente.`.replace(/\n{3,}/g, '\n\n').trim();
        }
        return finalPrompt;
    }, [
        wizardData.agentName, wizardData.companyName, wizardData.agentType, wizardData.language,
        wizardData.prompt, wizardData.businessHours,
        wizardData.personality, wizardData.tone, wizardData.extractionVariables,
        wizardData.companyAddress, wizardData.companyPhone, wizardData.companyWebsite,
        wizardData.enableCalBooking, wizardData.calApiKey, wizardData.enableTransfer,
        wizardData.transferDestinations, wizardData.kbFiles, wizardData.kbUsageInstructions
    ]);

    // Asegurar visibilidad del prompt
    const [hasGeneratedPrompt, setHasGeneratedPrompt] = useState(
        !!editingAgentId || (!!wizardData.prompt && wizardData.prompt !== '' && wizardData.prompt !== 'Eres un asistente útil.')
    );

    // Efecto para asegurar que en modo edición el prompt sea visible directamente
    // y se mantenga sincronizado con los cambios de herramientas/KB
    React.useEffect(() => {
        if (editingAgentId || (wizardData.prompt && wizardData.prompt !== 'Eres un asistente útil.')) {
            setHasGeneratedPrompt(true);
        }

        if (editingAgentId) {
            const updated = getUpdatedPrompt();
            if (updated !== wizardData.prompt) {
                updateField('prompt', updated);
            }
        }
    }, [editingAgentId, wizardData.prompt, getUpdatedPrompt, updateField]);

    const getAgentTypeName = (type: string) => {
        const types: Record<string, string> = {
            'transferencia': 'Transferencia de llamadas',
            'agendamiento': 'Agendamiento de citas',
            'cualificacion': 'Cualificación y atención',
        };
        return types[type] || type || 'No definido';
    };

    const getLanguageName = (lang: string) => {
        const names: Record<string, string> = {
            'es-ES': 'Español (España)', 'es-MX': 'Español (México)',
            'es-AR': 'Español (Argentina)', 'es-419': 'Español (Latam)',
            'en-US': 'Inglés (USA)', 'en-GB': 'Inglés (UK)',
            'pt-BR': 'Portugués (Brasil)', 'fr-FR': 'Francés',
        };
        return names[lang] || lang || 'No definido';
    };

    const generateAllInstructions = () => {
        setIsGenerating(true);
        const finalPrompt = getUpdatedPrompt();
        setTimeout(() => {
            updateField('prompt', finalPrompt);
            setIsGenerating(false);
            setHasGeneratedPrompt(true);
        }, 1500);
    };

    const handleCreateAgent = async () => {
        // En modo edición, actualizamos el prompt automáticamente antes de enviar
        let currentPromptValue = wizardData.prompt;
        if (editingAgentId) {
            currentPromptValue = getUpdatedPrompt();
        }

        // LIMPIEZA CRÍTICA: Eliminar marcadores y espacios extra antes de enviar a Retell
        const cleanedPrompt = cleanPromptForDeployment(currentPromptValue);

        // Sincronizar el prompt limpio de vuelta al store (opcional, pero recomendado)
        updateField('prompt', cleanedPrompt);

        const missing = [];
        if (!wizardData.agentName) missing.push('Nombre del agente');
        if (!wizardData.model) missing.push('Modelo LLM');
        if (!wizardData.voiceId) missing.push('Voz');
        if (!cleanedPrompt || cleanedPrompt.length < 50) missing.push('Prompt (necesitas generarlo)');

        if (missing.length > 0) {
            setErrorMessage(`Faltan campos obligatorios: ${missing.join(', ')}`);
            setShowError(true);
            return;
        }
        setIsCreating(true);
        try {
            const method = editingAgentId ? 'PATCH' : 'POST';
            const bodyObj = editingAgentId
                ? { ...wizardData, id: editingAgentId, prompt: cleanedPrompt }
                : { ...wizardData, prompt: cleanedPrompt };

            const response = await fetch('/api/retell/agent', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyObj),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Error al comunicarse con el servidor');
            setShowSuccess(true);
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : 'Error al crear el agente');
            setShowError(true);
        } finally {
            setIsCreating(false);
        }
    };

    /* ── PANTALLA ÉXITO ── */
    if (showSuccess) {
        return (
            <div className="content-area">
                <div className="form-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
                    <div style={{
                        width: '80px', height: '80px', background: '#f0fdf4', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
                    }}>
                        <i className="bi bi-check-circle-fill" style={{ fontSize: '48px', color: '#10b981' }} />
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a2428', marginBottom: '12px' }}>
                        ¡Agente IA {editingAgentId ? 'actualizado' : 'creado'} con éxito!
                    </h2>
                    <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '28px' }}>
                        Tu agente <strong>{wizardData.agentName}</strong> {editingAgentId ? 'se ha guardado correctamente' : 'está configurado y listo para usar'}.
                    </p>
                    <button
                        style={{ ...S.btnCreateAgent, padding: '14px 32px', fontSize: '15px', margin: '0 auto' }}
                        onClick={() => window.location.href = '/dashboard/agents'}
                    >
                        <i className="bi bi-grid-fill" /> Ir al Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!mounted) return (
        <div className="content-area">
            <div className="form-card" style={{ textAlign: 'center', padding: '100px 40px' }}>
                <div role="status" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #267ab0', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
                <p style={{ color: '#6c757d', fontSize: '16px' }}>Cargando resumen...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );

    return (
        <div className="content-area">
            <div className="form-card">
                <h1 className="section-title">Resumen de configuración</h1>
                <p className="section-subtitle">
                    Revisa todos los detalles de tu agente antes de crearlo. Puedes editar cualquier paso si necesitas hacer cambios.
                </p>

                {/* BANNER ÉXITO CONFIGURACIÓN */}
                <div style={S.alertSuccess}>
                    <i className="bi bi-check-circle-fill" style={{ fontSize: '32px', color: '#10b981' }} />
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a2428', margin: '0 0 6px 0' }}>
                            ¡Configuración completada!
                        </h3>
                        <p style={{ fontSize: '14px', color: '#6c757d', margin: 0 }}>
                            Has completado todos los pasos. Revisa el resumen y crea tu agente.
                        </p>
                    </div>
                </div>

                {/* ERROR */}
                {showError && (
                    <div style={S.alertDanger}>
                        <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: 500 }}>
                            <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '8px' }} />
                            {errorMessage}
                        </span>
                        <button onClick={() => setShowError(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#ef4444', lineHeight: 1 }}>×</button>
                    </div>
                )}

                {/* SUMMARY GRID */}
                <div style={S.summaryGrid}>

                    {/* Paso 1 */}
                    <SummaryCard icon="bi-info-circle-fill" color="#267ab0" title="Paso 1: Información básica" step={1} onEdit={setStep}>
                        <SummaryRow label="Nombre del agente" value={wizardData.agentName || '—'} />
                        <SummaryRow label="Tipo de agente" value={getAgentTypeName(wizardData.agentType)} />
                        <SummaryRow label="Empresa" value={wizardData.companyName || '—'} last />
                    </SummaryCard>

                    {/* Paso 2 */}
                    <SummaryCard icon="bi-robot" color="#267ab0" title="Paso 2: Configuración LLM" step={2} onEdit={setStep}>
                        <SummaryRow label="Modelo de IA" value={wizardData.model || '—'} />
                        <SummaryRow label="Temperature" value={String(wizardData.temperature)} />
                        <SummaryRow label="Base de conocimientos" value={`${wizardData.kbFiles.length} archivo(s)`} last />
                    </SummaryCard>

                    {/* Paso 3 */}
                    <SummaryCard icon="bi-building" color="#267ab0" title="Paso 3: Empresa y horarios" step={3} onEdit={setStep}>
                        <SummaryRow label="Empresa" value={wizardData.companyName || '—'} />
                        <SummaryRow label="Web" value={wizardData.companyWebsite || '—'} />
                        <SummaryRow label="Días activos" value={`${wizardData.businessHours.filter(h => !h.closed).length} días`} last />
                    </SummaryCard>

                    {/* Paso 4 */}
                    <SummaryCard icon="bi-mic-fill" color="#10b981" title="Paso 4: Voz" step={4} onEdit={setStep}>
                        <SummaryRow label="Voz seleccionada" value={wizardData.voiceName || '—'} />
                        <SummaryRow label="Velocidad" value={`${wizardData.voiceSpeed}x`} last />
                    </SummaryCard>

                    {/* Paso 5 */}
                    <SummaryCard icon="bi-chat-dots-fill" color="#267ab0" title="Paso 5: Conversación" step={5} onEdit={setStep}>
                        <SummaryRow label="Idioma" value={getLanguageName(wizardData.language)} />
                        <SummaryRow label="Personalidad" value={wizardData.personality.join(', ') || '—'} />
                        <SummaryRow label="Tono" value={wizardData.tone || '—'} last />
                    </SummaryCard>

                    {/* Paso 6 */}
                    <SummaryCard icon="bi-clock-fill" color="#f59e0b" title="Paso 6: Tiempos" step={6} onEdit={setStep}>
                        <SummaryRow label="Tiempo máx. silencio" value={`${Math.round((wizardData.endCallAfterSilenceMs ?? 0) / 1000)}s`} />
                        <SummaryRow label="Tiempo máx. llamada" value={`${Math.round((wizardData.maxCallDurationMs ?? 0) / 60000)} min`} last />
                    </SummaryCard>

                    {/* Paso 7 */}
                    <SummaryCard icon="bi-mic-fill" color="#267ab0" title="Paso 7: Audio y STT" step={7} onEdit={setStep}>
                        <SummaryRow label="Volumen agente" value={(wizardData.volume * 100).toFixed(0) + '%'} />
                        <SummaryRow label="Ruido ambiente" value={wizardData.enableAmbientSound ? (wizardData.ambientSound || 'Activado') : 'Desactivado'} />
                        <SummaryRow label="Modo STT" value={wizardData.sttMode === 'accurate' ? 'Precisión' : 'Velocidad'} last />
                    </SummaryCard>

                    {/* Paso 8 Full Width */}
                    <SummaryCard icon="bi-gear-fill" color="#267ab0" title="Paso 8: Herramientas" step={8} onEdit={setStep} fullWidth>
                        <SummaryRow label="Transferencias activas" value={wizardData.enableTransfer ? `Sí (${wizardData.transferDestinations.length} destinos)` : 'No'} />
                        <SummaryRow label="Variables de extracción" value={`${wizardData.extractionVariables.length} variable(s)`} />
                        <SummaryRow label="Herramientas externas" value={wizardData.enableCustomTools ? `Sí (${wizardData.customTools.length} herramientas)` : 'No'} last />
                    </SummaryCard>
                </div>

                {/* PROMPT */}
                {(!hasGeneratedPrompt && !editingAgentId) ? (
                    <div style={{
                        background: 'linear-gradient(145deg, #f8f9fa, #e9ecef)',
                        border: '1px dashed #ced4da',
                        borderRadius: '12px',
                        padding: '48px',
                        textAlign: 'center',
                        marginBottom: '32px',
                    }}>
                        <i className="bi bi-robot" style={{ fontSize: '48px', color: '#267ab0', opacity: 0.8, display: 'block', marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1a2428', marginBottom: '12px' }}>¡Casi listo!</h3>
                        <p style={{ fontSize: '14px', color: '#6c757d', maxWidth: '480px', margin: '0 auto 24px' }}>
                            Genera el Prompt (las instrucciones maestras del agente) basado en toda tu configuración.
                        </p>
                        <button
                            onClick={generateAllInstructions}
                            disabled={isGenerating}
                            style={{
                                ...S.btnCreateAgent,
                                padding: '14px 32px',
                                borderRadius: '30px',
                                fontSize: '16px',
                                fontWeight: 700,
                                boxShadow: '0 8px 20px rgba(38,122,176,0.3)',
                                background: isGenerating ? '#6c757d' : '#267ab0',
                                cursor: isGenerating ? 'wait' : 'pointer',
                            }}
                        >
                            {isGenerating ? (
                                <><span className="spinner-border spinner-border-sm me-2" /> Redactando instrucciones...</>
                            ) : (
                                <><i className="bi bi-magic" /> Generar Prompt Mágico</>
                            )}
                        </button>
                    </div>
                ) : (
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                            <div>
                                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1a2428', marginBottom: '4px' }}>
                                    <i className="bi bi-terminal me-2" /> Instrucciones del Agente
                                </h4>
                                <p style={{ fontSize: '13px', color: '#10b981', fontWeight: 600, margin: 0 }}>
                                    <i className="bi bi-check-circle-fill me-1" /> {editingAgentId ? 'Instrucciones maestras del agente (se auto-actualizan al guardar).' : 'Generadas correctamente. Puedes editarlas.'}
                                </p>
                            </div>
                            {!editingAgentId && (
                                <button onClick={generateAllInstructions} disabled={isGenerating}
                                    style={{ ...S.editBtn, borderColor: '#267ab0', color: '#267ab0' }}>
                                    {isGenerating ? 'Regenerando...' : <><i className="bi bi-arrow-clockwise" /> Regenerar</>}
                                </button>
                            )}
                        </div>
                        <textarea
                            rows={18}
                            value={wizardData.prompt}
                            onChange={(e) => updateField('prompt', e.target.value)}
                            style={{
                                width: '100%',
                                fontFamily: 'monospace',
                                fontSize: '13.5px',
                                lineHeight: '1.6',
                                backgroundColor: '#272822',
                                color: '#f8f8f2',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '16px',
                                resize: 'vertical',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                            }}
                        />
                    </div>
                )}

                {/* ACTION BUTTONS */}
                <div style={S.actionButtons}>
                    <button
                        onClick={handleCreateAgent}
                        disabled={isCreating || !hasGeneratedPrompt}
                        style={{
                            ...S.btnCreateAgent,
                            background: editingAgentId ? '#267ab0' : '#10b981',
                            opacity: (!hasGeneratedPrompt || isCreating) ? 0.6 : 1,
                            cursor: (!hasGeneratedPrompt || isCreating) ? 'not-allowed' : 'pointer',
                            fontSize: '15px',
                        }}
                    >
                        {isCreating ? (
                            <><span className="spinner-border spinner-border-sm" /> {editingAgentId ? 'Guardando cambios...' : 'Creando agente...'}</>
                        ) : (
                            <><i className={editingAgentId ? 'bi bi-floppy' : 'bi bi-rocket-takeoff-fill'} />
                                {editingAgentId ? 'Guardar Cambios' : 'Crear Agente IA'}
                            </>
                        )}
                    </button>
                </div>

                {/* WIZARD ACTIONS */}
                <div style={S.wizardActions}>
                    <button style={S.btnBack} onClick={prevStep} disabled={isCreating}>
                        <i className="bi bi-arrow-left" /> Anterior
                    </button>
                </div>
            </div>
        </div>
    );
};
