"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';

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
    const [showConfirmRegenerate, setShowConfirmRegenerate] = useState(false);
    const editingAgentId = wizardData.editingAgentId;

    const getUpdatedPrompt = React.useCallback((forceRebuild = false) => {
        const name = wizardData.agentName || 'Elio';
        const company = wizardData.companyName || 'netelip';
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
            toolsContentArr.push(`# GESTIÓN DE AGENDA Y DISPONIBILIDAD

Tienes acceso a dos herramientas para gestionar citas: \`check_availability\` y \`book_appointment\`. Úsalas siempre que el usuario quiera reservar, pregunte por horarios o quiera agendar una visita.

## HORARIO COMERCIAL — REGLA CRÍTICA
Antes de ofrecer cualquier hueco, filtra los resultados por el horario de apertura de la empresa (ver sección "# Horario comercial" más abajo). La herramienta puede devolver slots en zonas horarias incorrectas. Ignora y descarta automáticamente cualquier hueco que caiga fuera del horario indicado. Nunca menciones, ofrezcas ni confirmes un hueco fuera de ese horario, aunque la herramienta lo devuelva.

## CÓMO HABLAR DE FECHAS Y HORAS
Nunca uses números para expresar horas. Habla siempre de forma natural y coloquial en español. Los días los dices con palabras, como "martes dieciocho" o "miércoles diecinueve". Las horas las dices siempre en palabras: "a las tres de la tarde", "a las diez de la mañana", "a la una del mediodía". Cuando la hora es en punto, no digas los minutos. Cuando son y media, dices "y media". La una siempre es "la una", nunca "un". Para la franja horaria usa: de la mañana para horas entre las cero y las once y cincuenta y nueve, del mediodía para las doce, de la tarde para horas entre las doce y media y las siete y cincuenta y nueve, y de la noche para las ocho en adelante.

## ESCENARIO 1 — EL USUARIO PIDE UNA FECHA Y HORA CONCRETAS
Ejecuta \`check_availability\` con esos datos exactos.
- Si está libre: confírmale de forma natural que está disponible y pasa a recoger los datos para la reserva antes de ejecutar \`book_appointment\`.
- Si no está libre: ejecuta \`check_availability\` dos veces más — una para buscar otro hueco ese mismo día, otra para buscar esa misma hora al día siguiente. Preséntale ambas alternativas y espera que elija.
- Si ninguna encaja: pregúntale si quieres buscar en otro rango y aplica el Escenario 3.

## ESCENARIO 2 — EL USUARIO SOLO DA UNA FECHA SIN HORA
Pregúntale si prefiere mañana o tarde. Ejecuta \`check_availability\` para ese día filtrando por la franja elegida. Selecciona los dos huecos más cercanos y preséntaselos. Cuando confirme, recoge los datos y ejecuta \`book_appointment\`.

Si no hay huecos ese día, busca el siguiente con \`check_availability\` e informa del cambio de día antes de ofrecer opciones.

## ESCENARIO 3 — EL USUARIO DA UN RANGO O NO TIENE FECHA FIJA
Pregunta primero si prefiere mañana o tarde (si no lo ha dicho). Ejecuta \`check_availability\` sobre el rango completo. Filtra por horario comercial y franja elegida. Selecciona los dos huecos más próximos priorizando diversidad horaria (si el primero es de mañana, el segundo de tarde, y viceversa).

Preséntaselos así: "Tenemos disponibilidad el [hueco 1] y el [hueco 2]. ¿Cuál te viene mejor?"

Si el usuario pide más opciones ("¿no tenéis otra cosa?", "¿y otro día?", "¿algo más tarde?"...), presenta todos los huecos disponibles agrupados por día.

## ESCENARIO 4 — EL USUARIO QUIERE CANCELAR O CAMBIAR UNA CITA
Indícale que para cancelaciones o modificaciones debe contactar directamente con el equipo, ya que no tienes herramienta para esa acción. Ofrécete a reservar una nueva cita si lo necesita.

## ESCENARIO 5 — LA HERRAMIENTA NO DEVUELVE RESULTADOS O DA ERROR
Si \`check_availability\` no devuelve huecos: "En ese período no tenemos huecos disponibles. ¿Quieres que busque en otra franja o en otra semana?"
Si hay error técnico, discúlpate brevemente y pide que repita los datos. No uses palabras como "error" o "fallo del sistema". Usa frases como "no me ha llegado bien esa información, ¿me lo repites?"

## RECOGIDA DE DATOS ANTES DE RESERVAR
Una vez confirmado el hueco, recoge los datos en este orden, de uno en uno y esperando respuesta antes de preguntar lo siguiente:
1. Nombre completo: "¿Me dices tu nombre completo para la reserva?"
2. Email: "¿Y tu correo electrónico?"
3. Motivo de la cita: "¿Cuál es el motivo de la visita?"

El teléfono del usuario se envía automáticamente como {{user_number}}, no lo preguntes.

## CONFIRMACIÓN FINAL ANTES DE RESERVAR
Antes de ejecutar \`book_appointment\`, confirma todos los datos en voz alta:
"Entonces te reservo el [día] a las [hora], a nombre de [nombre completo], con el correo [email] y el motivo [motivo]. ¿Es todo correcto?"
Solo ejecuta \`book_appointment\` cuando el usuario confirme afirmativamente.

## REGLA GENERAL
Consulta siempre la disponibilidad real antes de ofrecer cualquier hueco. Nunca inventes ni supongas disponibilidad. Habla siempre de forma cercana, natural y en español coloquial.`);
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
            ? `## Consulta de Base de Conocimientos\nTienes acceso a una base de conocimientos documentada que puedes consultar para responder dudas de los usuarios.\n\n` +
            `Bases de conocimiento disponibles:\n` + wizardData.kbFiles.map(f => `- ${f.retell_name || f.name}`).join('\n') +
            (wizardData.kbUsageInstructions ? `\n\nInstrucciones sobre cuándo o cómo consultarlos:\n- ${wizardData.kbUsageInstructions}` : '')
            : '';

        const kbSection = kbInnerContent
            ? `\n\n<!-- AUTO_KB_START -->\n${kbInnerContent}\n<!-- AUTO_KB_END -->\n`
            : '';

        const companySection = `\n\n<!-- AUTO_COMPANY_START -->\n# Información de Contacto de ${company}\n${wizardData.companyDescription ? `- Actividad: ${wizardData.companyDescription}\n` : ''}- Dirección: ${wizardData.companyAddress || 'No especificada'}\n- Teléfono para contacto (leído dígito a dígito): ${formatPhoneForTTS(wizardData.companyPhone || '') || 'No especificado'}\n- Web: ${formatUrlForTTS(wizardData.companyWebsite || '') || 'No especificada'}\n\n# Horario comercial:\n${formattedHours}\n<!-- AUTO_COMPANY_END -->\n`;

        let finalPrompt = '';
        const currentPrompt = wizardData.prompt || '';

        // Si ya hay un prompt y no es el por defecto, intentamos "Smart Update"
        // EXCEPTO si forceRebuild=true (botón Regenerar): en ese caso reconstruimos desde cero
        if (!forceRebuild && currentPrompt && currentPrompt !== 'Eres un asistente útil.') {
            finalPrompt = currentPrompt;

            // Retrocompatibilidad agresiva: Limpiar la basura residual del prompt (bloques duplicados o huérfanos sin marcadores)
            for (let i = 0; i < 3; i++) {
                finalPrompt = finalPrompt.replace(/\n*### Datos a Extraer[\s\S]*?(?=### Despedida|# Reglas de Terminación|<!--|$)/gi, '');
                finalPrompt = finalPrompt.replace(/\n*# Uso de herramientas[\s\S]*?(?=### Despedida|# Reglas de Terminación|<!--|# Información de Contacto|$)/gi, '');
                finalPrompt = finalPrompt.replace(/\n*# Información de Contacto[\s\S]*?(?=(?:# Reglas de Terminación|<!--|### Despedida|# Información de Contacto|- Información:|$))/gi, '');
                finalPrompt = finalPrompt.replace(/\n*(?:### Horarios comerciales:|# Horario comercial:)[\s\S]*?(?=(?:# Reglas de Terminación|<!--|### Despedida|# Información de Contacto|- Información:|$))/gi, '');
                finalPrompt = finalPrompt.replace(/\n*(?:- Información:|Instrucciones adicionales:).*[\s\S]*?(?=(?:# Reglas de Terminación|<!--|### Despedida|# Información de Contacto|- Información:|Instrucciones adicionales:|$))/gi, '');
            }

            const toolsRegex = /<!-- AUTO_TOOLS_START -->[\s\S]*?<!-- AUTO_TOOLS_END -->/;
            if (toolsRegex.test(finalPrompt)) {
                finalPrompt = finalPrompt.replace(toolsRegex, '___TEMP_TOOLS___');
                finalPrompt = finalPrompt.replace(/[\n]*<!-- AUTO_TOOLS_START -->[\s\S]*?<!-- AUTO_TOOLS_END -->/g, '');
                finalPrompt = finalPrompt.replace('___TEMP_TOOLS___', () => toolsSection.trim());
            } else if (toolsSection) {
                if (finalPrompt.includes('### Despedida')) {
                    finalPrompt = finalPrompt.replace('### Despedida', `${toolsSection.trim()}\n\n### Despedida`);
                } else {
                    finalPrompt += `\n\n${toolsSection.trim()}`;
                }
            }

            const kbRegex = /<!-- AUTO_KB_START -->[\s\S]*?<!-- AUTO_KB_END -->/;
            if (kbRegex.test(finalPrompt)) {
                finalPrompt = finalPrompt.replace(kbRegex, '___TEMP_KB___');
                finalPrompt = finalPrompt.replace(/[\n]*<!-- AUTO_KB_START -->[\s\S]*?<!-- AUTO_KB_END -->/g, '');
                finalPrompt = finalPrompt.replace('___TEMP_KB___', () => kbSection.trim());
            } else if (kbSection) {
                finalPrompt += `\n\n${kbSection.trim()}`;
            }

            const companyRegex = /<!-- AUTO_COMPANY_START -->[\s\S]*?<!-- AUTO_COMPANY_END -->/;
            if (companyRegex.test(finalPrompt)) {
                finalPrompt = finalPrompt.replace(companyRegex, '___TEMP_COMPANY___');
                finalPrompt = finalPrompt.replace(/[\n]*<!-- AUTO_COMPANY_START -->[\s\S]*?<!-- AUTO_COMPANY_END -->/g, '');
                finalPrompt = finalPrompt.replace('___TEMP_COMPANY___', () => companySection.trim());
            } else {
                // Si no hay marcadores de empresa, los inyectamos al final
                finalPrompt += `\n\n${companySection.trim()}`;
            }

            // Gestionar notas personalizadas
            const notesSection = wizardData.customNotes ? `\n\n<!-- AUTO_NOTES_START -->\n# Notas\n${wizardData.customNotes}\n<!-- AUTO_NOTES_END -->\n` : '';
            const notesRegex = /<!-- AUTO_NOTES_START -->[\s\S]*?<!-- AUTO_NOTES_END -->/;
            if (notesRegex.test(finalPrompt)) {
                finalPrompt = finalPrompt.replace(notesRegex, '___TEMP_NOTES___');
                finalPrompt = finalPrompt.replace(/[\n]*<!-- AUTO_NOTES_START -->[\s\S]*?<!-- AUTO_NOTES_END -->/g, '');
                finalPrompt = finalPrompt.replace('___TEMP_NOTES___', () => notesSection.trim());
            } else if (notesSection) {
                finalPrompt += `\n\n${notesSection.trim()}`;
            }
        } else {
            const roleObjective = wizardData.agentType === 'transferencia'
                ? `conectarlo con el departamento adecuado de ${company} y gestionar transferencias eficientes.`
                : wizardData.agentType === 'agendamiento'
                    ? `gestionar citas y reuniones con los asesores de ${company} de forma eficiente.`
                    : `cualificar a los contactos que llaman a ${company} en cliente actual o potencial, y resolver sus dudas iniciales.`;

            finalPrompt = `
## Rol y Objetivo
Eres ${name} y tu objetivo es ${roleObjective}

## Personalidad
- ${personalityStr}
- ${toneStr}
- Eres paciente y consistente, especialmente cuando el contacto no tiene claro qué necesita.

## Contexto
- Eres un asistente de IA, no un humano.
- Evita SIEMPRE ofrecer asesoramiento técnico complejo fuera de tu base de conocimientos.
- Tienes acceso a información sobre los servicios de ${company} para responder preguntas.
- Hora actual: {{current_time_Europe/Madrid}}
- Fecha: ${today}
- Idioma de la conversación: Habla siempre en ${langStr}.
- Nombre del contacto: {{user_name}}
- Teléfono de contacto: {{numero_telefono}}
- Email: {{email}}

## Instrucciones
### Estilos de comunicación
- Haz solo una pregunta a la vez y espera respuesta. REGLA DE ORO: No encadenes preguntas.
- Mantén las interacciones breves con oraciones cortas.
- Presta atención a la información que el contacto ya ha compartido. No repitas preguntas sobre datos ya dados.
- Al ofrecer opciones (ej. horarios), limita las opciones a 2 máximo.
- Escribe los símbolos como palabras: "tres euros" no "3€", "arroba" no "@".
- Lee las fechas de forma natural: "lunes quince de abril a las seis y media de la tarde".
- Si recibes un mensaje obviamente incompleto o ruidos, responde con un breve "uhm" o espera.

### Control de Entonación y Puntuación (IMPORTANTE)
- Mantén un tono profesional y estable en todo momento.
- Evita el uso excesivo de signos de exclamación.
- NO uses puntos suspensivos innecesarios.
- Las variaciones de confirmación ("Perfecto", "Genial", "Estupendo") deben sonar naturales, no forzadas.

### Reglas de comunicación
- Máximo 30 segundos por respuesta.
- Varía las respuestas entusiastas para evitar sonar repetitivo.
- Maneja preguntas sobre tu naturaleza con transparencia: "Soy un agente de voz creado con inteligencia artificial" y redirige al objetivo.

${toolsSection.trim() ? `## Herramientas\n${toolsSection.trim()}` : ''}

## Etapas de la Llamada

### 1. Saludo y Cualificación
- Saluda cordialmente, identifícate y entiende el motivo de la llamada.
- Determina si el contacto ya es cliente o busca información nueva.

### 2. Resolución o Routing
${wizardData.agentType === 'transferencia'
                    ? '- Identifica el departamento destino y realiza la transferencia usando las herramientas disponibles.'
                    : '- Resuelve dudas usando la Base de Conocimientos si está disponible.\n- Ofrece agendar una cita si detectas interés o necesidad comercial.'}

### 3. Agendamiento (si aplica)
- Consulta disponibilidad real.
- Ofrece 2 opciones horarias.
- Si acepta, solicita teléfono y email (pide deletreo del email para mayor precisión).

### 4. Cierre
- Pregunta: "¿Hay algo más en lo que pueda ayudarte?"
- Despídete usando el nombre del contacto si lo tienes.
- Ejecuta la función \`end_call\` inmediatamente después de la despedida.

${kbSection.trim() ? `\n${kbSection.trim()}` : ''}
${companySection.trim() ? `\n${companySection.trim()}` : ''}
${wizardData.customNotes ? `\n<!-- AUTO_NOTES_START -->\n# Notas\n${wizardData.customNotes}\n<!-- AUTO_NOTES_END -->\n` : ''}

# Reglas de Terminación
Finaliza siempre con la herramienta 'end_call' tras despedirte.`.replace(/\n{4,}/g, '\n\n\n').replace(/\n{3,}/g, '\n\n').trim();
        }
        return finalPrompt;
    }, [
        wizardData.agentName, wizardData.companyName, wizardData.agentType, wizardData.language,
        wizardData.prompt, wizardData.businessHours,
        wizardData.personality, wizardData.tone, wizardData.customNotes,
        wizardData.companyAddress, wizardData.companyPhone, wizardData.companyWebsite, wizardData.companyDescription,
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
        // forceRebuild=true: siempre reconstruye el prompt desde cero, sin Smart Update
        const finalPrompt = getUpdatedPrompt(true);
        setTimeout(() => {
            updateField('prompt', finalPrompt);
            setIsGenerating(false);
            setHasGeneratedPrompt(true);
        }, 1500);
    };

    const handleConfirmRegenerate = () => {
        setShowConfirmRegenerate(true);
    };

    const handleExecuteRegenerate = () => {
        setShowConfirmRegenerate(false);
        generateAllInstructions();
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
                <WizardStepHeader
                    title="Resumen y confirmación"
                    subtitle="Revisa la configuración final de tu agente antes de crearlo o guardarlo."
                    tooltipContent={
                        <>
                            <strong>Paso final.</strong> Aquí puedes ver un resumen de todas las decisiones tomadas y una previsualización del prompt generado.
                        </>
                    }
                />

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
                    </SummaryCard>
                </div>

                {/* NOTAS PERSONALIZADAS */}
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1a2428', margin: 0 }}>
                            <i className="bi bi-pencil-square me-2" /> Notas adicionales del prompt
                        </h4>
                        <div className="custom-tooltip">
                            <i className="bi bi-question-circle-fill tooltip-icon" style={{ fontSize: '14px' }}></i>
                            <div className="tooltip-content shadow" style={{ width: '280px' }}>
                                <strong>Instrucciones personalizadas</strong><br />
                                Todo lo que escribas aquí se añadirá al final del prompt en una sección llamada &quot;# Notas&quot;.
                                <br /><br />
                                Ideal para reglas específicas, comportamientos únicos o datos que no están en los otros pasos.
                            </div>
                        </div>
                    </div>
                    <textarea
                        className="form-control"
                        rows={4}
                        placeholder="Ej: Si el usuario dice 'chocolate', responde con un chiste sobre cacao..."
                        value={wizardData.customNotes}
                        onChange={(e) => updateField('customNotes', e.target.value)}
                        style={{
                            minHeight: '100px',
                            background: '#fff',
                            border: '1px solid #ced4da',
                            borderRadius: '12px',
                            padding: '16px',
                            fontSize: '14px',
                            resize: 'vertical',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
                        }}
                    />
                    <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                        <i className="bi bi-info-circle me-1" /> Estas notas se mantendrán incluso si regeneras el prompt o cambias otras configuraciones.
                    </p>
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
                            {showConfirmRegenerate ? (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>¿Borrar cambios?</span>
                                    <button onClick={() => setShowConfirmRegenerate(false)} style={{ ...S.editBtn, padding: '4px 8px' }}>No</button>
                                    <button onClick={handleExecuteRegenerate} style={{ ...S.editBtn, borderColor: '#ef4444', color: '#ef4444', padding: '4px 8px' }}>Sí, borrar</button>
                                </div>
                            ) : (
                                <button onClick={handleConfirmRegenerate} disabled={isGenerating}
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
