"use client";

import React, { useState } from 'react';
import { useWizardStore } from '../../../store/wizardStore';
import { WizardStepHeader } from '../WizardStepHeader';
import { createClient } from '../../../lib/supabase/client';

const PROMPT_NOTE_EXAMPLES = [
    "No menciones precios concretos. Si el usuario los solicita, indícale que recibirá un presupuesto personalizado.",
    "Si el usuario se muestra agresivo o usa lenguaje inapropiado, avisa una vez y finaliza la llamada si continúa.",
    "El horario de atención es de lunes a viernes de 9h a 18h. Los sábados no hay servicio.",
    "Si el usuario dice que está conduciendo, ofrécele llamarle en otro momento en lugar de continuar.",
    "Si el usuario ya es cliente, no le ofrezcas el descuento de bienvenida.",
    "Nunca confirmes ni desmientas información sobre pedidos sin haber verificado antes el número de referencia.",
    "Si el usuario pregunta por la competencia, redirige la conversación hacia las ventajas del servicio sin hacer comparativas.",
    "Si el usuario solicita hablar con un humano, indícale que alguien le llamará en un plazo máximo de 24 horas."
];

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
        // Eliminar solo los marcadores HTML (mantener el contenido que encierran)
        // El wizard es la fuente de verdad: lo que se ve = lo que va a Retell
        .replace(/<!--\s*AUTO_[A-Z_]+_(?:START|END)\s*-->/g, '')
        // Normalizar espacios en blanco (máximo 2 saltos de línea)
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

export const Step6_Summary: React.FC = () => {
    const wizardData = useWizardStore();
    const { setStep, prevStep, updateField } = wizardData;

    const [mounted, setMounted] = useState(false);
    React.useEffect(() => { setMounted(true); }, []);

    const [isCreating, setIsCreating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [placeholderIndex, setPlaceholderIndex] = useState(0);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        const inputElement = e.target;
        inputElement.value = '';

        if (wizardData.kbFiles.length + files.length > 3) {
            setUploadError('Máximo 3 archivos permitidos en la base de conocimientos.');
            return;
        }
        setUploadError(null);
        setIsUploading(true);
        const newFiles = [...wizardData.kbFiles];

        for (const f of files) {
            const formData = new FormData();
            formData.append('file', f);
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const { data: user } = await supabase.from('users').select('workspace_id').eq('id', session.user.id).single();
                    if (user && user.workspace_id) {
                        formData.append('workspace_id', user.workspace_id);
                    }
                }
                const res = await fetch('/api/retell/knowledge-base', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success && data.knowledge_base_id) {
                    newFiles.push({
                        id: data.knowledge_base_id,
                        name: data.name,
                        retell_name: data.retell_name,
                        size: data.size,
                        type: data.type
                    });
                } else {
                    setUploadError('Error al subir archivo ' + f.name + ': ' + data.error);
                }
            } catch {
                setUploadError('Error de conexión al subir archivo ' + f.name);
            }
        }
        updateField('kbFiles', newFiles);
        setIsUploading(false);
    };

    const removeFile = (index: number) => {
        const newFiles = [...wizardData.kbFiles];
        newFiles.splice(index, 1);
        updateField('kbFiles', newFiles);
    };

    React.useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % PROMPT_NOTE_EXAMPLES.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

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
            toolsContentArr.push(`## Gestión de Agenda y Citas
Tienes acceso a la información de disponibilidad inyectada en las variables dinámicas del sistema (provenientes de una búsqueda previa en el calendario):
- Disponibilidad rápida: {{disponibilidad_mas_temprana}}
- Disponibilidad extendida: {{consultar_disponibilidad}}

### Proceso de Agendamiento:
1. **Consulta / Oferta Inicial**: Cuando el contacto acepta agendar, di: "Tenemos disponibilidad el {{disponibilidad_mas_temprana}}. ¿Cuál te viene mejor?".
   > *Nota: Si las variables están vacías o no se muestran, pide al usuario qué día prefiere e intenta agendar a ciegas.*
2. **Más opciones**: Si el usuario pide más horarios o los ofrecidos no le valen, revisa la disponibilidad extendida y ofrécele opciones de allí: {{consultar_disponibilidad}}.
3. **Recogida de datos**: Una vez elegido el horario, di: "Estupendo. Para confirmar tu cita necesito un par de datos. ¿Cuál es tu nombre completo?" (Pide los datos de uno en uno).
4. **Email y Deletreo (CRÍTICO)**: 
   - Tras el nombre, pide el email.
   - Una vez escuchado el email, di: "Perfecto. Deletréamelo letra por letra para asegurarme de que lo tengo bien".
   - Escucha el deletreo completo.
5. **Ejecución de la reserva**: Inmediatamente después de confirmar los datos, di: "Perfecto, déjame confirmar tu cita, un momento por favor..." y ejecuta la herramienta \`book_appointment\`.
6. **Confirmación final**: Tras el éxito de la herramienta, confirma la fecha y hora final y menciona que recibirá un correo de confirmación.

### Reglas de formato de voz:
- Día: "martes dieciocho", "miércoles diecinueve".
- Horas: Di siempre las horas con PALABRAS (diez de la mañana, cuatro de la tarde). No uses formato 24h.
- Para la una: "la una" (jamás digas "un").`);
        }
        if (wizardData.enableTransfer && wizardData.transferDestinations.length > 0) {
            const transfers = wizardData.transferDestinations
                .map(d => `- Si el usuario ${d.description || 'quiere hablar con un compañero'}, ejecuta \`transfer_to_${d.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}\`.`)
                .join('\n');
            toolsContentArr.push(`## Transferencias\n${transfers}`);
        }

        if (wizardData.extractionVariables.length > 0) {
            const extractions = wizardData.extractionVariables
                .map(v => `- **${v.name}**: ${v.description}${v.required ? ' (OBLIGATORIO)' : ''}`)
                .join('\n');
            toolsContentArr.push(`## Recogida de Información (Cualificación)
Debes recoger los siguientes datos durante la conversación de forma natural:
${extractions}

### Reglas para la recogida:
- No hagas todas las preguntas seguidas. Integra las consultas en el flujo de la charla.
- Si un dato es OBLIGATORIO, no finalices la llamada sin haberlo intentado obtener al menos dos veces de forma educada.`);
        }

        const toolsInnerContent = toolsContentArr.join('\n\n');
        const toolsSection = toolsInnerContent
            ? `\n\n<!-- AUTO_TOOLS_START -->\n# Herramientas\n${toolsInnerContent}\n<!-- AUTO_TOOLS_END -->\n`
            : '';

        const kbInnerContent = wizardData.kbFiles.length > 0
            ? `Tienes acceso a una base de conocimientos documentada que puedes consultar para responder dudas de los usuarios.

### REGLAS CRÍTICAS DE BÚSQUEDA (BASE DE CONOCIMIENTOS):
- Si el usuario realiza una pregunta y la respuesta **no se encuentra de forma explícita** en la información proporcionada en la base de conocimientos, di amablemente que no dispones de esa información específica en este momento, pero que dejas nota de su consulta para que un compañero pueda contactarle y facilitársela. 
- **NUNCA inventes información** que no esté en los documentos. 
- Si la información es ambigua o parcial, aclara lo que sabes y ofrece pasar nota para el resto.

Bases de conocimiento disponibles:\n` + wizardData.kbFiles.map(f => `- ${f.retell_name || f.name}`).join('\n') +
            (wizardData.kbUsageInstructions ? `\n\nInstrucciones adicionales sobre cuándo o cómo consultarlos:\n- ${wizardData.kbUsageInstructions}` : '')
            : '';

        const kbSection = kbInnerContent
            ? `\n\n<!-- AUTO_KB_START -->\n# Base de Conocimientos\n${kbInnerContent}\n<!-- AUTO_KB_END -->\n`
            : '';

        const companySection = `\n\n<!-- AUTO_COMPANY_START -->\n# Información de la Empresa\n${wizardData.companyDescription ? `- Actividad: ${wizardData.companyDescription}\n` : ''}- Dirección: ${wizardData.companyAddress || 'No especificada'}\n- Teléfono para contacto (leído dígito a dígito): ${formatPhoneForTTS(wizardData.companyPhone || '') || 'No especificado'}\n- Web: ${formatUrlForTTS(wizardData.companyWebsite || '') || 'No especificada'}\n\n## Horario comercial\n${formattedHours}\n<!-- AUTO_COMPANY_END -->\n`;

        let finalPrompt = '';
        const currentPrompt = wizardData.prompt || '';

        // Si ya hay un prompt y no es el por defecto, intentamos "Smart Update"
        // EXCEPTO si forceRebuild=true: en ese caso reconstruimos desde cero
        if (!forceRebuild && currentPrompt && currentPrompt !== 'Eres un asistente útil.') {
            finalPrompt = currentPrompt;

            // Retrocompatibilidad: limpiar encabezados legacy (formatos anteriores sin marcadores AUTO)
            for (let i = 0; i < 3; i++) {
                finalPrompt = finalPrompt.replace(/\n*### Datos a Extraer[\s\S]*?(?=# |<!--|$)/gi, '');
                finalPrompt = finalPrompt.replace(/\n*(?:# Uso de herramientas|## Herramientas)[\s\S]*?(?=# |<!--|$)/gi, '');
                finalPrompt = finalPrompt.replace(/\n*(?:# Información de Contacto|# Información de la Empresa)[\s\S]*?(?=(?:# |<!--|$))/gi, '');
                finalPrompt = finalPrompt.replace(/\n*(?:### Horarios comerciales:|# Horario comercial:|## Horario comercial)[\s\S]*?(?=(?:# |<!--|$))/gi, '');
                finalPrompt = finalPrompt.replace(/\n*# Reglas de Terminación[\s\S]*$/gi, '');
            }

            const toolsRegex = /<!-- AUTO_TOOLS_START -->[\s\S]*?<!-- AUTO_TOOLS_END -->/;
            if (toolsRegex.test(finalPrompt)) {
                finalPrompt = finalPrompt.replace(toolsRegex, '___TEMP_TOOLS___');
                finalPrompt = finalPrompt.replace(/[\n]*<!-- AUTO_TOOLS_START -->[\s\S]*?<!-- AUTO_TOOLS_END -->/g, '');
                finalPrompt = finalPrompt.replace('___TEMP_TOOLS___', () => toolsSection.trim());
            } else if (toolsSection) {
                finalPrompt += `\n\n${toolsSection.trim()}`;
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
# Rol y Objetivo
Eres ${name} y tu objetivo es ${roleObjective}

# Estilo de Comunicación
- ${personalityStr}
- ${toneStr}
- Eres paciente y consistente, especialmente cuando el contacto no tiene claro qué necesita.
- Eres un asistente de IA, no un humano.
- Evita SIEMPRE ofrecer asesoramiento técnico complejo fuera de tu base de conocimientos.
- Tienes acceso a información sobre los servicios de ${company} para responder preguntas.
- Hora actual: {{current_time_Europe/Madrid}}
- Fecha: ${today}
- Idioma de la conversación: Habla siempre en ${langStr}.
- Nombre del contacto: {{user_name}}
- Teléfono de contacto: {{numero_telefono}}
- Email: {{email}}

## Reglas generales
- Haz solo una pregunta a la vez y espera respuesta. REGLA DE ORO: No encadenes preguntas (no digas "¿Cuál es tu nombre y en qué puedo ayudarte?"; en su lugar pregunta "¿Cuál es tu nombre?", espera la respuesta, y luego pregunta "¿En qué puedo ayudarte?").
- Mantén las interacciones breves con oraciones cortas.
- Esta es una conversación de voz con potencial retraso (2 mensajes cortados seguidos) y errores de transcripción (palabras equivocadas), así que adáptate en consecuencia. Considera el contexto para aclarar información ambigua o mal transcrita.
- Si recibes un mensaje obviamente incompleto, responde: "uhm".
- Presta atención a la información que el contacto ya ha compartido — si mencionan su nombre, empresa o motivo mientras responden otra pregunta, reconócelo y no vuelvas a preguntarlo.
- Al ofrecer opciones (ej. horarios de citas), limita las opciones a 2 máximo.
- Varía las respuestas entusiastas ("Genial", "Perfecto", "Estupendo") — evita repeticiones.
- Maneja preguntas sobre tu naturaleza con transparencia: si preguntan "¿Eres un robot?", responde "No soy un robot, soy un agente de voz creado con inteligencia artificial" y redirige al objetivo de la llamada.
- Usa palabras de relleno naturales ("umm", "entonces") de forma muy limitada — máximo una cada 4 interacciones.
- Máximo 30 segundos por respuesta.
- Usa el {{user_name}} frecuentemente una vez lo tengas capturado.

## Pronunciación de fechas y horas
Nunca uses números para expresar horas. Habla siempre de forma natural y coloquial en ${langStr}. Los días los dices con palabras, como "martes dieciocho" o "miércoles diecinueve". Las horas las dices siempre en palabras: "a las tres de la tarde", "a las diez de la mañana", "a la una del mediodía". Cuando la hora es en punto, no digas los minutos. Cuando son y media, dices "y media". La una siempre es "la una", nunca "un". Para la franja horaria usa: de la mañana para horas entre las cero y las once y cincuenta y nueve, del mediodía para las doce, de la tarde para horas entre las doce y media y las siete y cincuenta y nueve, y de la noche para las ocho en adelante.

## Pronunciación de símbolos y contactos
- Escribe los símbolos como palabras: "tres euros" no "3€", "arroba" no "@".
- Correos electrónicos: di "arroba" para "@" y "punto" para ".". Ejemplo: "contacto arroba empresa punto com".
- Teléfonos: lee los dígitos de uno en uno.
- No leas números, símbolos o formatos técnicos. Di siempre las palabras tal y como se pronuncian en una conversación natural.

## Control de entonación
- Mantén un tono profesional y estable en todo momento.
- Evita el uso excesivo de signos de exclamación (máximo uno cada 3 frases).
- NO uses puntos suspensivos innecesarios.
- Cuando expreses entusiasmo, usa palabras precisas pero mantén el mismo nivel de energía vocal.
- Las variaciones de confirmación ("Perfecto", "Genial", "Estupendo") deben sonar naturales, no forzadas.
- No subas ni bajes bruscamente el tono al cambiar de tema.

# Tareas

## 1. Saludo y Cualificación
- Saluda cordialmente, identifícate y entiende el motivo de la llamada.
- Haz las siguientes preguntas para determinar si el contacto es cliente de ${company} y hacia dónde dirigirlo. Haz una pregunta a la vez y adapta según lo que compartan:
    - Q1: "¿Eres ya cliente de ${company} o quieres información para empezar?"
    - Q2: "¿En qué puedo ayudarte?"${wizardData.enableCalBooking && wizardData.calApiKey ? `\n    - Q3 (solo NO clientes): "¿Te gustaría agendar una cita con un asesor para que te dé información más detallada?"` : ''}

## 2. Resolución o Routing
${wizardData.agentType === 'transferencia'
                    ? '- Identifica el departamento destino y realiza la transferencia usando las herramientas disponibles.'
                    : (() => {
                        const lines: string[] = [];
                        if (wizardData.kbFiles.length > 0) {
                            const kbNames = wizardData.kbFiles.map(f => f.retell_name || f.name).join(', ');
                            let kbLine = `- Resuelve dudas consultando la Base de Conocimientos (${kbNames}).`;
                            if (wizardData.kbUsageInstructions) {
                                kbLine += ` ${wizardData.kbUsageInstructions}`;
                            }
                            lines.push(kbLine);
                        } else {
                            lines.push('- Resuelve las dudas del contacto con la información que tengas disponible.');
                        }
                        if (wizardData.enableCalBooking && wizardData.calApiKey) {
                            lines.push('- Ofrece agendar una cita si detectas interés o necesidad comercial.');
                        } else {
                            lines.push('- Si el contacto pregunta por agendar una cita, indica que no tienes acceso a la agenda en este momento pero que tomarás nota de su interés.');
                        }
                        return lines.join('\n');
                    })()}

## 3. Cierre
- Pregunta: "¿Hay algo más en lo que pueda ayudarte?"
- Despídete usando el nombre del contacto si lo tienes.
- Ejecuta la función \`end_call\` inmediatamente después de la despedida.

${toolsSection.trim()}
${kbSection.trim()}
${companySection.trim()}
${wizardData.customNotes ? `\n<!-- AUTO_NOTES_START -->\n# Notas\n${wizardData.customNotes}\n<!-- AUTO_NOTES_END -->` : ''}`.replace(/\n{4,}/g, '\n\n\n').replace(/\n{3,}/g, '\n\n').trim();
        }
        return finalPrompt;
    }, [
        wizardData.prompt,
        wizardData.agentName, wizardData.companyName, wizardData.agentType, wizardData.language,
        wizardData.businessHours,
        wizardData.personality, wizardData.tone, wizardData.customNotes,
        wizardData.companyAddress, wizardData.companyPhone, wizardData.companyWebsite, wizardData.companyDescription,
        wizardData.enableCalBooking, wizardData.calApiKey, wizardData.enableTransfer,
        wizardData.transferDestinations, wizardData.kbFiles, wizardData.kbUsageInstructions,
        wizardData.extractionVariables
    ]);

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

    const handleCreateAgent = async () => {
        // Generar prompt final asegurando la información más actual (forceRebuild=false para "Smart Update" en caso de modo edición)
        const finalGeneratedPrompt = getUpdatedPrompt(false);
        // LIMPIEZA CRÍTICA: Eliminar secciones auto-generadas y espacios extra antes de enviar a Retell.
        const cleanedPrompt = cleanPromptForDeployment(finalGeneratedPrompt);

        const missing = [];
        if (!wizardData.agentName) missing.push('Nombre del agente');
        if (!wizardData.model) missing.push('Modelo LLM');
        if (!wizardData.voiceId) missing.push('Voz');

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
                        <SummaryRow label="Empresa" value={wizardData.companyName || '—'} />
                        <SummaryRow label="Actividad" value={wizardData.companyDescription || '—'} last />
                    </SummaryCard>

                    {/* Paso 2 */}
                    <SummaryCard icon="bi-cpu-fill" color="#267ab0" title="Paso 2: Cerebro LLM" step={2} onEdit={setStep}>
                        <SummaryRow label="Modelo de IA" value={wizardData.model || '—'} />
                        <SummaryRow label="Idioma" value={getLanguageName(wizardData.language)} />
                        <SummaryRow label="Tono" value={wizardData.tone || '—'} last />
                    </SummaryCard>

                    {/* Paso 3 */}
                    <SummaryCard icon="bi-mic-fill" color="#10b981" title="Paso 3: Voz" step={3} onEdit={setStep}>
                        <SummaryRow label="Voz seleccionada" value={wizardData.voiceName || '—'} last />
                    </SummaryCard>

                    {/* Paso 4 */}
                    <SummaryCard icon="bi-volume-up-fill" color="#267ab0" title="Paso 4: Audio" step={4} onEdit={setStep}>
                        <SummaryRow label="Volumen agente" value={(wizardData.volume * 100).toFixed(0) + '%'} />
                        <SummaryRow label="Ruido ambiente" value={wizardData.enableAmbientSound ? (wizardData.ambientSound || 'Activado') : 'Desactivado'} last />
                    </SummaryCard>

                    {/* Paso 5 Full Width */}
                    <SummaryCard icon="bi-box-seam-fill" color="#f59e0b" title="Paso 5: Tipo y Herramientas" step={5} onEdit={setStep} fullWidth>
                        <SummaryRow label="Tipo de agente" value={getAgentTypeName(wizardData.agentType)} />
                        <SummaryRow label="Reserva de citas" value={wizardData.enableCalBooking ? 'Activado' : 'Desactivado'} />
                        <SummaryRow label="Transferencias" value={wizardData.enableTransfer ? `Sí (${wizardData.transferDestinations.length} destinos)` : 'No'} />
                        <SummaryRow label="Variables extracción" value={`${wizardData.extractionVariables.length} variable(s)`} last />
                    </SummaryCard>
                </div>

                {/* KNOWLEDGE BASE */}
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1a2428', margin: 0 }}>
                            <i className="bi bi-book-half me-2" /> Base de conocimientos
                        </h4>
                        <div className="custom-tooltip">
                            <i className="bi bi-question-circle-fill tooltip-icon" style={{ fontSize: '14px' }}></i>
                            <div className="tooltip-content shadow" style={{ width: '280px' }}>
                                Sube documentos para que tu agente responda con información precisa.
                                Límite: 3 archivos, máx 10 MB cada uno (.md, .txt, .pdf, .docx).
                            </div>
                        </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                        {uploadError && (
                            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#ef4444', fontWeight: 600 }}>
                                <span><i className="bi bi-exclamation-circle-fill me-2" />{uploadError}</span>
                                <button onClick={() => setUploadError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '20px', lineHeight: 1 }}>×</button>
                            </div>
                        )}

                        <div>
                            <label htmlFor="kb-upload" style={{ cursor: isUploading ? 'default' : 'pointer', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: isUploading ? 0.5 : 1 }}>
                                {isUploading ? (
                                    <div className="py-3 text-center">
                                        <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                                        <div style={{ color: '#267ab0', fontWeight: 'bold' }}>Subiendo...</div>
                                    </div>
                                ) : (
                                    <div className="w-100 text-center py-3">
                                        <i className="bi bi-cloud-arrow-up" style={{ fontSize: '24px', color: '#64748b' }}></i>
                                        <div style={{ fontSize: '15px', color: '#1a2428', fontWeight: 600, marginTop: '8px' }}>
                                            Haz clic para subir archivos
                                        </div>
                                    </div>
                                )}
                            </label>
                            <input
                                type="file"
                                id="kb-upload"
                                style={{ display: 'none' }}
                                multiple
                                accept=".md,.txt,.pdf,.docx"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                            />
                        </div>

                        {wizardData.kbFiles.length > 0 && (
                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {wizardData.kbFiles.map((file, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                            <i className="bi bi-file-earmark-text text-primary"></i>
                                            <span style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>({file.size})</span>
                                        </div>
                                        <button type="button" onClick={() => removeFile(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Eliminar">
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-3">
                            <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Instrucciones de uso de la base</label>
                            <textarea
                                className="form-control"
                                rows={2}
                                style={{ borderRadius: '8px', fontSize: '13px' }}
                                placeholder="Ej: Consulta esta información solo para dudas técnicas sobre precios."
                                value={wizardData.kbUsageInstructions}
                                onChange={(e) => updateField('kbUsageInstructions', e.target.value)}
                            />
                        </div>
                    </div>
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
                        placeholder={`Ej: ${PROMPT_NOTE_EXAMPLES[placeholderIndex]}`}
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
                        <i className="bi bi-info-circle me-1" /> Estas notas se mantendrán incluso si cambias otras configuraciones.
                    </p>
                </div>

                {/* ACTION BUTTONS */}
                <div style={S.actionButtons}>
                    <button
                        onClick={handleCreateAgent}
                        disabled={isCreating}
                        style={{
                            ...S.btnCreateAgent,
                            background: editingAgentId ? '#267ab0' : '#10b981',
                            opacity: isCreating ? 0.6 : 1,
                            cursor: isCreating ? 'not-allowed' : 'pointer',
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
