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
                finalPrompt = finalPrompt.replace('___TEMP_TOOLS___', toolsSection.trim());
            } else if (toolsSection) {
                finalPrompt += `\n\n${toolsSection.trim()}`;
            }

            const kbRegex = /<!-- AUTO_KB_START -->[\s\S]*?<!-- AUTO_KB_END -->/;
            if (kbRegex.test(finalPrompt)) {
                finalPrompt = finalPrompt.replace(kbRegex, '___TEMP_KB___');
                finalPrompt = finalPrompt.replace(/[\n]*<!-- AUTO_KB_START -->[\s\S]*?<!-- AUTO_KB_END -->/g, '');
                finalPrompt = finalPrompt.replace('___TEMP_KB___', kbSection.trim());
            } else if (kbSection) {
                finalPrompt += `\n\n${kbSection.trim()}`;
            }

            const companyRegex = /<!-- AUTO_COMPANY_START -->[\s\S]*?<!-- AUTO_COMPANY_END -->/;
            if (companyRegex.test(finalPrompt)) {
                finalPrompt = finalPrompt.replace(companyRegex, '___TEMP_COMPANY___');
                finalPrompt = finalPrompt.replace(/[\n]*<!-- AUTO_COMPANY_START -->[\s\S]*?<!-- AUTO_COMPANY_END -->/g, '');
                finalPrompt = finalPrompt.replace('___TEMP_COMPANY___', companySection.trim());
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
                finalPrompt = finalPrompt.replace('___TEMP_NOTES___', notesSection.trim());
            } else if (notesSection) {
                finalPrompt += `\n\n${notesSection.trim()}`;
            }
        } else {
            const roleObjective = wizardData.agentType === 'transferencia'
                ? `conectarlo con el departamento adecuado de ${company} y gestionar transferencias eficientes.`
                : wizardData.agentType === 'agendamiento'
                    ? `gestionar citas y reuniones con los asesores de ${company} de forma eficiente.`
                    : `cualificar a los contactos que llaman a ${company} en cliente actual o potencial, y resolver sus dudas iniciales.`;

            let qualificationQuestions = `    - Q1: "¿Eres ya cliente de ${company} o quieres información para empezar?"\n    - Q2: "¿En qué puedo ayudarte?"`;
            let qIndex = 3;
            if (wizardData.leadQuestions && wizardData.leadQuestions.length > 0) {
                wizardData.leadQuestions.forEach(q => {
                    if (q.question.trim()) {
                        qualificationQuestions += `\n    - Q${qIndex}: "${q.question.trim()}" (Dato a recoger: ${q.key})`;
                        qIndex++;
                    }
                });
            }
            if (wizardData.enableCalBooking && wizardData.calApiKey) {
                qualificationQuestions += `\n    - Q${qIndex} (solo NO clientes): "¿Te gustaría agendar una cita con un asesor para que te dé información más detallada?"`;
            }

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
${qualificationQuestions}

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
        wizardData.extractionVariables, wizardData.leadQuestions
    ]);



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
                    subtitle="Revisa toda la configuración de tu agente. Puedes editar cualquier campo directamente o volver al paso correspondiente."
                />

                {/* BANNER ÉXITO CONFIGURACIÓN */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <i className="bi bi-check-circle-fill" style={{ fontSize: '24px', color: '#10b981', flexShrink: 0 }} />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#166534' }}>Configuración completada</div>
                        <div style={{ fontSize: '13px', color: '#16a34a', marginTop: '2px' }}>Todos los pasos están bien. Revisa el resumen y activa el agente cuando estés listo.</div>
                    </div>
                </div>

                {/* ERROR */}
                {showError && (
                    <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: 500 }}>
                            <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '8px' }} />
                            {errorMessage}
                        </span>
                        <button onClick={() => setShowError(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#ef4444', lineHeight: 1 }}>×</button>
                    </div>
                )}

                {/* ─── STEP CARDS ─── */}
                {([
                    {
                        step: 1, icon: 'bi-info-circle', color: '#267ab0', label: 'Información básica', stepLabel: 'Paso 1',
                        content: (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Nombre del agente</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a2428' }}>{wizardData.agentName || '—'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Nombre de la empresa</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a2428' }}>{wizardData.companyName || '—'}</div>
                                </div>
                                {wizardData.companyDescription && (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Descripción de la empresa</div>
                                        <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>{wizardData.companyDescription}</div>
                                    </div>
                                )}
                            </div>
                        )
                    },
                    {
                        step: 2, icon: 'bi-cpu', color: '#8b5cf6', label: 'Modelo de IA y comportamiento', stepLabel: 'Paso 2',
                        content: (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Modelo IA</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a2428' }}>{wizardData.model === 'gemini-2.0-flash' ? 'Gemini 3.0 Flash' : wizardData.model === 'gpt-4.1' ? 'GPT-4.1' : wizardData.model || '—'}</span>
                                        {wizardData.model === 'gemini-2.0-flash' && <span style={{ background: '#f0fdf4', color: '#16a34a', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>Recomendado</span>}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Quién habla primero</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a2428' }}>{wizardData.beginMessage ? 'El agente habla primero' : 'El usuario habla primero'}</div>
                                </div>
                                {wizardData.personality.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Personalidad</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {wizardData.personality.map((p: string) => (
                                                <span key={p} style={{ background: '#267ab0', color: 'white', fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px' }}>{p}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Tono</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a2428' }}>{wizardData.tone || '—'}</div>
                                </div>
                                {wizardData.beginMessage && (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Mensaje de inicio</div>
                                        <div style={{ fontSize: '13px', color: '#475569', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #267ab0', lineHeight: '1.6' }}>{wizardData.beginMessage}</div>
                                    </div>
                                )}
                            </div>
                        )
                    },
                    {
                        step: 3, icon: 'bi-mic', color: '#10b981', label: 'Voz seleccionada', stepLabel: 'Paso 3',
                        content: (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#267ab0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '16px', flexShrink: 0 }}>
                                    {(wizardData.voiceName || 'V').charAt(0)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a2428' }}>{wizardData.voiceName || '—'}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Voz seleccionada · ElevenLabs</div>
                                </div>
                                <i className="bi bi-volume-up" style={{ color: '#267ab0', fontSize: '18px' }}></i>
                            </div>
                        )
                    },
                    {
                        step: 4, icon: 'bi-sliders', color: '#f59e0b', label: 'Configuración de audio', stepLabel: 'Paso 4',
                        content: (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Volumen del agente</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${(wizardData.volume * 100).toFixed(0)}%`, background: '#267ab0', borderRadius: '6px' }}></div>
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a2428' }}>{(wizardData.volume * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Sonido ambiente</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a2428' }}>
                                        {wizardData.enableAmbientSound ? (wizardData.ambientSound || 'Activado') : '— Ninguno'}
                                    </div>
                                </div>
                            </div>
                        )
                    },
                ] as Array<{ step: number; icon: string; color: string; label: string; stepLabel: string; content: React.ReactNode }>).map(({ step, icon, color, label, stepLabel, content }) => (
                    <div key={step} style={{ background: 'white', border: '1px solid #edf2f7', borderRadius: '14px', marginBottom: '16px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #edf2f7' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className={`bi ${icon}`} style={{ color, fontSize: '16px' }}></i>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a2428' }}>{label}</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{stepLabel}</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStep(step)}
                                style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', color: '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <i className="bi bi-pencil"></i> ir al paso {step}
                            </button>
                        </div>
                        <div style={{ padding: '16px 20px' }}>{content}</div>
                    </div>
                ))}

                {/* ─── HERRAMIENTAS ACTIVAS ─── */}
                <div style={{ background: 'white', border: '1px solid #edf2f7', borderRadius: '14px', marginBottom: '16px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #edf2f7' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bi bi-tools" style={{ color: '#f59e0b', fontSize: '16px' }}></i>
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a2428' }}>Herramientas activas</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Paso 5</div>
                            </div>
                        </div>
                        <button type="button" onClick={() => setStep(5)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', color: '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="bi bi-pencil"></i> ir al paso 5
                        </button>
                    </div>
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            { icon: 'bi-funnel-fill', color: '#267ab0', name: 'Cualificación de lead', desc: 'Nombre, email, motivo de la llamada', active: true },
                            { icon: 'bi-telephone-forward', color: '#8b5cf6', name: 'Transferencia de llamadas', desc: `${wizardData.transferDestinations.length} destino(s) configurado(s)`, active: wizardData.enableTransfer },
                            { icon: 'bi-calendar-event', color: '#10b981', name: 'Reservar cita (Cal.com)', desc: 'Sin configurar', active: wizardData.enableCalBooking },
                        ].map(tool => (
                            <div key={tool.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px' }}>
                                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: `${tool.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <i className={`bi ${tool.icon}`} style={{ color: tool.color, fontSize: '15px' }}></i>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a2428' }}>{tool.name}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{tool.desc}</div>
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: tool.active ? '#f0fdf4' : '#f1f5f9', color: tool.active ? '#16a34a' : '#94a3b8' }}>
                                    {tool.active ? 'Activo' : 'Desactivado'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── BASE DE CONOCIMIENTO ─── */}
                <div style={{ background: 'white', border: '1px solid #edf2f7', borderRadius: '14px', marginBottom: '16px', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #edf2f7', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="bi bi-book" style={{ color: '#267ab0', fontSize: '16px' }}></i>
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a2428' }}>Base de conocimiento</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Sube documentos con información sobre tu empresa. El agente los usará para responder preguntas con mayor precisión.</div>
                        </div>
                    </div>
                    <div style={{ padding: '20px' }}>
                        {uploadError && (
                            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#ef4444', fontWeight: 600 }}>
                                <span><i className="bi bi-exclamation-circle-fill me-2" />{uploadError}</span>
                                <button onClick={() => setUploadError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '20px', lineHeight: 1 }}>×</button>
                            </div>
                        )}
                        <label htmlFor="kb-upload" style={{ cursor: isUploading ? 'default' : 'pointer', display: 'block' }}>
                            <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '32px', textAlign: 'center', background: '#f8fafc', opacity: isUploading ? 0.5 : 1 }}>
                                {isUploading ? (
                                    <div>
                                        <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                                        <div style={{ color: '#267ab0', fontWeight: 700 }}>Subiendo...</div>
                                    </div>
                                ) : (
                                    <>
                                        <i className="bi bi-cloud-arrow-up" style={{ fontSize: '32px', color: '#94a3b8', display: 'block', marginBottom: '10px' }}></i>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a2428', marginBottom: '4px' }}>Arrastra archivos aquí o haz clic para subir</div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>PDF, TXT, MD · Máx. 25 MB por archivo</div>
                                    </>
                                )}
                            </div>
                        </label>
                        <input type="file" id="kb-upload" style={{ display: 'none' }} multiple accept=".md,.txt,.pdf,.docx" onChange={handleFileUpload} disabled={isUploading} />
                        {wizardData.kbFiles.length > 0 && (
                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {wizardData.kbFiles.map((file, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <i className="bi bi-file-earmark-text" style={{ color: '#267ab0' }}></i>
                                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{file.name}</span>
                                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>({file.size})</span>
                                        </div>
                                        <button type="button" onClick={() => removeFile(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ marginTop: '16px', background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#1e40af', lineHeight: '1.6' }}>
                            <i className="bi bi-info-circle-fill" style={{ marginRight: '6px' }}></i>
                            Al subir archivos XLSX, haremos el procesado de la información (el estado de que se haya actualizado se indicará con una marca de estado). <strong>Recuerda documentar correctamente tus documentos para que el agente los pueda procesar.</strong>
                        </div>
                    </div>
                </div>

                {/* ─── NOTAS ADICIONALES ─── */}
                <div style={{ background: 'white', border: '1px solid #edf2f7', borderRadius: '14px', marginBottom: '24px', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #edf2f7', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="bi bi-pencil-square" style={{ color: '#267ab0' }}></i>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a2428' }}>Notas adicionales <span style={{ fontWeight: 400, fontSize: '12px', color: '#94a3b8' }}>(opcional)</span></div>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                        <textarea
                            className="form-control"
                            rows={3}
                            placeholder={`Ej: ${PROMPT_NOTE_EXAMPLES[placeholderIndex]}`}
                            value={wizardData.customNotes}
                            onChange={(e) => updateField('customNotes', e.target.value)}
                            style={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', resize: 'vertical', padding: '12px 14px' }}
                        />
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                            <i className="bi bi-info-circle me-1"></i>Estas notas se añadirán al final del prompt para personalizar el comportamiento del agente.
                        </div>
                    </div>
                </div>

                {/* ─── TU AGENTE ESTARÁ LISTO PARA ─── */}
                <div style={{ background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: '14px', padding: '20px 24px', marginBottom: '28px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a2428', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="bi bi-lightning-fill" style={{ color: '#f59e0b' }}></i> Tu agente estará listo para:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {([
                            { icon: 'bi-telephone-fill', label: 'Atender llamadas entrantes en nombre de ' + (wizardData.companyName || 'netelip'), show: true },
                            { icon: 'bi-funnel-fill', label: 'Cualificar contactos y recoger datos', show: true },
                            { icon: 'bi-arrow-left-right', label: 'Transferir al equipo cuando sea necesario', show: wizardData.enableTransfer },
                            { icon: 'bi-shield-check', label: 'Identificarse como IA y avisar de la grabación (LOPD)', show: true },
                        ] as Array<{ icon: string; label: string; show: boolean }>).filter(i => i.show).map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <i className={`bi ${item.icon}`} style={{ color: '#267ab0', marginTop: '2px', flexShrink: 0 }}></i>
                                <span style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── BIG CTA ─── */}
                <button
                    onClick={handleCreateAgent}
                    disabled={isCreating}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: editingAgentId ? '#267ab0' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: 700,
                        cursor: isCreating ? 'not-allowed' : 'pointer',
                        opacity: isCreating ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        transition: 'all 0.2s',
                        marginBottom: '10px'
                    }}
                >
                    {isCreating ? (
                        <><span className="spinner-border spinner-border-sm" /> {editingAgentId ? 'Guardando cambios...' : 'Creando agente...'}</>
                    ) : (
                        <><i className={editingAgentId ? 'bi bi-floppy' : 'bi bi-robot'} style={{ fontSize: '18px' }} />
                            {editingAgentId ? 'Guardar Cambios' : 'Crear agente IA'}</>
                    )}
                </button>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginBottom: '28px' }}>
                    Puedes editar y volver al agente desde &quot;Mis agentes&quot; en cualquier momento.
                </div>

                {/* ANTERIOR */}
                <div style={{ paddingTop: '20px', borderTop: '1px solid #edf2f7' }}>
                    <button
                        onClick={prevStep}
                        disabled={isCreating}
                        style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <i className="bi bi-arrow-left"></i> Anterior
                    </button>
                </div>
            </div>
        </div>
    );
};
