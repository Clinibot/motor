import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyRetellWebhook } from '@/lib/retell/webhookAuth';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('[inbound-webhook] SUPABASE_SERVICE_ROLE_KEY is not set — cannot access agent configuration');
        return null;
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}

// Format the date for the prompts e.g. "lunes 20 de mayo de 2024"
function getFormattedNow() {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'Europe/Madrid' 
    };
    return now.toLocaleDateString('es-ES', options);
}

export async function POST(request: NextRequest) {
    let agent_id: string | undefined;
    try {
        const rawBody = await request.text();
        const valid = await verifyRetellWebhook(
            rawBody,
            request.headers.get('x-retell-signature'),
            process.env.RETELL_WEBHOOK_SECRET
        );
        if (!valid) {
            console.warn('[inbound-webhook] Invalid signature — request rejected');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const payload = JSON.parse(rawBody);
        const call_inbound = payload.call_inbound;

        console.log('[inbound-webhook] Called. agent_id:', call_inbound?.agent_id ?? '(missing)');

        if (!call_inbound || !call_inbound.agent_id) {
            return NextResponse.json({ error: 'Missing agent_id in call_inbound payload' }, { status: 400 });
        }

        agent_id = call_inbound.agent_id;
        const supabaseAdmin = getSupabaseAdmin();

        if (!supabaseAdmin) {
            console.error('[inbound-webhook] Supabase env vars missing');
            return NextResponse.json({ call_inbound: { override_agent_id: agent_id, dynamic_variables: { _debug: 'supabase_env_missing' } } });
        }

        // Get internal agent details
        const { data: agentData, error } = await supabaseAdmin
            .from('agents')
            .select('id, configuration')
            .eq('retell_agent_id', agent_id)
            .single();

        if (error || !agentData || !agentData.configuration) {
            console.warn(`[inbound-webhook] Agent not found in DB for retell_agent_id: ${agent_id}`, error);
            return NextResponse.json({ call_inbound: { override_agent_id: agent_id, dynamic_variables: { _debug: 'agent_not_found' } } });
        }

        const config = agentData.configuration;

        const calEnabled = config.enableCalBooking === true || config.enableCalBooking === 'true';
        const hasApiKey  = !!config.calApiKey;
        const hasEventId = !!config.calEventId;

        console.log(`[inbound-webhook] config check — enableCalBooking:${config.enableCalBooking}(${calEnabled}) calApiKey:${hasApiKey} calEventId:${config.calEventId}(${hasEventId})`);

        if (!calEnabled || !hasApiKey || !hasEventId) {
            return NextResponse.json({ call_inbound: { override_agent_id: agent_id, dynamic_variables: { _debug: `cal_not_configured:enabled=${calEnabled},key=${hasApiKey},event=${hasEventId}` } } });
        }

        // Configuration exists for Cal.com
        const calApiKey = config.calApiKey;
        const calEventId = config.calEventId;
        const searchDays = parseInt(config.calSearchDays || '6', 10);

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + searchDays);

        const startIso = encodeURIComponent(startDate.toISOString());
        const endIso = encodeURIComponent(endDate.toISOString());

        console.log(`Fetching Cal.com slots for Event ${calEventId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        const calTimezone = config.calTimezone || 'Europe/Madrid';
        const calResponse = await fetch(`https://api.cal.com/v2/slots?eventTypeId=${calEventId}&start=${startIso}&end=${endIso}&timeZone=${encodeURIComponent(calTimezone)}`, {
            headers: {
                'cal-api-version': '2024-09-04',
                'Authorization': `Bearer ${calApiKey}`
            }
        });

        if (!calResponse.ok) {
            const calErr = await calResponse.text();
            console.error(`[inbound-webhook] Cal.com slots fetch failed: ${calResponse.status} — eventId:${calEventId}`, calErr);
            const shortErr = calErr.slice(0, 120).replace(/\n/g, ' ');
            return NextResponse.json({ call_inbound: { override_agent_id: agent_id, dynamic_variables: { _debug: `calcom_error:${calResponse.status} eventId:${calEventId} — ${shortErr}` } } });
        }

        const calData = await calResponse.json();
        const slotsString = JSON.stringify(calData.data || {});

        const nowFormatted = getFormattedNow();

        // Prepare prompts for OpenAI
        const earliestPrompt = `Estos son los horarios disponibles actuales:
${slotsString}

#Objetivo
Tu tarea es transformar el conjunto de slots de citas disponibles en formato conversacional hablado en español. Debes proporcionar SOLO los 2 horarios más tempranos en diferentes momentos del día o en diferentes días (dependiendo de los slots disponibles).

Tu output debe SOLO reemplazar <fecha hora 1 y fecha hora 2> en la frase: "Tenemos disponibilidad el <fecha hora 1 y fecha hora 2>. ¿Cuál te viene mejor?"

#Reglas de selección
1. Selecciona siempre los 2 slots MÁS TEMPRANOS disponibles
2. Prioriza diversidad en el momento del día cuando sea posible:
   - Si el primer slot es por la mañana (antes de 12:00), intenta encontrar el slot más temprano de la tarde (12:00-19:59) como segunda opción
   - Si no hay slots de tarde el mismo día, selecciona el segundo slot más temprano sin importar la hora
3. Prefiere slots del mismo día cuando sea posible, pero si eso crea poca diversidad, selecciona de días diferentes
4. Nunca selecciones más de 2 slots - exactamente 2 opciones solamente

#Reglas de formato
1. Formatea cada fecha-hora como: [Día de la semana] [número del día] a las [hora en palabras]
   Ejemplo: "martes dieciocho a las diez de la mañana"
2. Convierte 24 horas a 12 horas con períodos en español:
   - 00:00 - 11:59 → "de la mañana"
   - 12:00 → "del mediodía"
   - 12:30 - 19:59 → "de la tarde"
   - 20:00 - 23:59 → "de la noche"
3. Usa palabras en español para las horas (nunca números):
   - Números: una, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez, once, doce
   - Para 1:00 usar "la una" (con artículo femenino)
4. Para 30 minutos usa "y media": "diez y media de la mañana"
5. Omite minutos cuando son cero: "tres de la tarde" no "tres cero cero"
6. Conecta las dos opciones con "y" o "y el" dependiendo del contexto:
   - Mismo día: "martes dieciocho a las diez de la mañana y a las tres de la tarde"
   - Días diferentes: "martes dieciocho a las diez de la mañana y miércoles diecinueve a las dos de la tarde"

#Ejemplos

Ejemplo de entrada 1:
{"2025-05-07":[{"start":"2025-05-07T09:00:00.000+02:00"},{"start":"2025-05-07T09:30:00.000+02:00"},{"start":"2025-05-07T10:00:00.000+02:00"}],"2025-05-08":[{"start":"2025-05-08T09:30:00.000+02:00"},{"start":"2025-05-08T15:30:00.000+02:00"}]}
Salida 1:
miércoles siete a las nueve de la mañana y jueves ocho a las nueve y media de la mañana

Ejemplo de entrada 2:
{"2025-05-30":[{"start":"2025-05-30T15:30:00.000+02:00"}],"2025-06-03":[{"start":"2025-06-03T09:30:00.000+02:00"},{"start":"2025-06-03T15:30:00.000+02:00"}]}
Salida 2:
viernes treinta a las tres y media de la tarde y martes tres a las nueve y media de la mañana

Ejemplo de entrada 3:
{"2025-04-30":[{"start":"2025-04-30T15:00:00.000+02:00"},{"start":"2025-04-30T15:30:00.000+02:00"}],"2025-05-01":[{"start":"2025-05-01T09:30:00.000+02:00"}]}
Salida 3:
miércoles treinta a las tres de la tarde y jueves primero a las nueve y media de la mañana

Ejemplo de entrada 4:
{"2025-05-20":[{"start":"2025-05-20T10:00:00.000+02:00"},{"start":"2025-05-20T15:30:00.000+02:00"}],"2025-05-21":[{"start":"2025-05-21T09:30:00.000+02:00"}]}
Salida 4:
martes veinte a las diez de la mañana y a las tres y media de la tarde

Ejemplo de entrada 5:
{"2025-05-20":[{"start":"2025-05-20T09:00:00.000+02:00"}],"2025-05-28":[{"start":"2025-05-28T11:30:00.000+02:00"},{"start":"2025-05-28T12:00:00.000+02:00"},{"start":"2025-05-28T13:30:00.000+02:00"},{"start":"2025-05-28T14:00:00.000+02:00"},{"start":"2025-05-28T14:30:00.000+02:00"},{"start":"2025-05-28T15:00:00.000+02:00"},{"start":"2025-05-28T16:30:00.000+02:00"}]}
Salida 5:
martes veinte a las nueve de la mañana y miércoles veintiocho a las once y media de la mañana

#Inicio
Hoy es ${nowFormatted}

Estos son los horarios disponibles actuales:
${slotsString}

Tu output debe SOLO reemplazar <fecha hora 1 y fecha hora 2> en la frase: "Tenemos disponibilidad el <fecha hora 1 y fecha hora 2>. ¿Cuál te viene mejor?"

Devuelve ÚNICAMENTE el texto que reemplaza <fecha hora 1 y fecha hora 2>, sin la frase completa, sin comillas, sin explicaciones adicionales.`;

        const fullAvailabilityPrompt = `<appointment_data>
Hoy es ${nowFormatted}

Estos son los horarios disponibles actuales:
${slotsString}
</appointment_data>

<instructions>
Transforma los datos JSON de citas anteriores en español natural y conversacional, adecuado para que un agente de voz lo pronuncie. Sigue estas reglas específicas:

<grouping_rules>
1. Agrupa franjas de tiempo consecutivas de 30 minutos creando rangos usando "entre las [hora inicio] y las [hora fin]"
2. El tiempo final del rango debe ser la hora del ÚLTIMO slot en el grupo consecutivo (no 30 minutos después)
3. Cualquier espacio o hueco rompe la secuencia consecutiva - crea un nuevo rango o slot aislado
4. Los slots individuales aislados usan el formato "a las [hora]" o "a la [hora]" (para la 1:00)
5. Múltiples slots aislados no consecutivos se conectan con "o"
</grouping_rules>

<formatting_rules>
1. Formatea cada fecha como: [Día de la semana] [número] de [mes]
   Ejemplo: "Jueves 14 de noviembre"
2. Convierte el formato de 24 horas a 12 horas en español:
   - 00:00 - 11:59 → "de la mañana"
   - 12:00 → "del mediodía"
   - 12:30 - 19:59 → "de la tarde"
   - 20:00 - 23:59 → "de la noche"
3. Escribe las horas usando palabras en español (nunca números):
   - Números en palabras: una, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez, once, doce
   - Para la 1:00 usar "la una" (con artículo): "a la una de la tarde"
4. Omite los minutos cuando son cero (en punto): "tres de la tarde" no "tres cero cero"
5. Para los minutos 30, usa "y media": "diez y media de la mañana"
6. Cuando un día tiene múltiples rangos o slots, conéctalos con ", y también"
7. Termina la disponibilidad de cada día con un punto (.) antes de pasar al siguiente día
</formatting_rules>

<speech_patterns>
- Para días con un solo slot: "solo tenemos disponibilidad a las [hora]"
- Para rangos continuos: "entre las [inicio] y las [fin]"
- Para múltiples rangos/slots: usa ", y también" para conectarlos
- Lista todos los rangos horarios explícitamente - nunca resumas o abrevies
</speech_patterns>
</instructions>

<examples>
<example>
<input>
{"2025-12-18":[{"start":"2025-12-18T11:00:00.000+01:00"},{"start":"2025-12-18T11:30:00.000+01:00"},{"start":"2025-12-18T12:00:00.000+01:00"},{"start":"2025-12-18T12:30:00.000+01:00"},{"start":"2025-12-18T13:00:00.000+01:00"}],"2025-12-19":[{"start":"2025-12-19T10:00:00.000+01:00"},{"start":"2025-12-19T10:30:00.000+01:00"},{"start":"2025-12-19T15:00:00.000+01:00"}],"2025-12-20":[{"start":"2025-12-20T11:30:00.000+01:00"}]}
</input>
<output>
Miércoles 18 de diciembre: entre las once de la mañana y la una de la tarde.
Jueves 19 de diciembre: a las diez o diez y media de la mañana, y también a las tres de la tarde.
Viernes 20 de diciembre: solo tenemos disponibilidad a las once y media de la mañana.
</output>
</example>

<example>
<input>
{"2025-11-14":[{"start":"2025-11-14T09:00:00.000+01:00"},{"start":"2025-11-14T09:30:00.000+01:00"},{"start":"2025-11-14T10:00:00.000+01:00"},{"start":"2025-11-14T14:00:00.000+01:00"},{"start":"2025-11-14T14:30:00.000+01:00"},{"start":"2025-11-14T15:00:00.000+01:00"},{"start":"2025-11-14T15:30:00.000+01:00"}],"2025-11-15":[{"start":"2025-11-15T13:00:00.000+01:00"}],"2025-11-16":[{"start":"2025-11-16T08:30:00.000+01:00"},{"start":"2025-11-16T11:00:00.000+01:00"},{"start":"2025-11-16T16:00:00.000+01:00"},{"start":"2025-11-16T16:30:00.000+01:00"}]}
</input>
<output>
Jueves 14 de noviembre: entre las nueve y las diez de la mañana, y también entre las dos y las tres y media de la tarde.
Viernes 15 de noviembre: solo tenemos disponibilidad a la una de la tarde.
Sábado 16 de noviembre: a las ocho y media de la mañana, y también a las once de la mañana, y también a las cuatro o cuatro y media de la tarde.
</output>
</example>
</examples>

<task>
Hoy es ${nowFormatted}
Usando los datos de citas proporcionados al inicio, crea el output optimizado para voz siguiendo todas las reglas anteriores. Comienza tu respuesta directamente con la disponibilidad del primer día.
</task>`;

        // Call OpenAI for both prompts in parallel
        const openAiKey = process.env.OPENAI_API_KEY;
        if (!openAiKey) {
            console.error("[inbound-webhook] Missing OPENAI_API_KEY environment variable");
            return NextResponse.json({ call_inbound: { override_agent_id: agent_id, dynamic_variables: { _debug: 'missing_openai_key' } } });
        }

        const openAiController = new AbortController();
        const openAiTimeout = setTimeout(() => openAiController.abort(), 8000);

        let earliestResponse: Response;
        let fullResponse: Response;
        try {
            [earliestResponse, fullResponse] = await Promise.all([
                fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openAiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'user', content: earliestPrompt }],
                        temperature: 0.1
                    }),
                    signal: openAiController.signal
                }),
                fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openAiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'user', content: fullAvailabilityPrompt }],
                        temperature: 0.1
                    }),
                    signal: openAiController.signal
                })
            ]);
        } finally {
            clearTimeout(openAiTimeout);
        }

        let req1Text = "";
        let req2Text = "";

        if (earliestResponse.ok) {
            const data = await earliestResponse.json();
            req1Text = data.choices[0].message.content.trim();
        } else {
             console.error("Error from OpenAI 1:", await earliestResponse.text());
        }

        if (fullResponse.ok) {
            const data = await fullResponse.json();
            req2Text = data.choices[0].message.content.trim();
        } else {
             console.error("Error from OpenAI 2:", await fullResponse.text());
        }

        console.log(`[inbound-webhook] Returning variables for agent ${agent_id}. disponibilidad_mas_temprana: "${req1Text.slice(0,80)}..."`);

        // Return the dynamic variables injected payload
        return NextResponse.json({
            call_inbound: {
                override_agent_id: agent_id,
                dynamic_variables: {
                    disponibilidad_mas_temprana: req1Text,
                    consultar_disponibilidad: req2Text
                }
            }
        });

    } catch (err: unknown) {
        console.error("[inbound-webhook] Unhandled error:", err);
        // Return 200 with empty variables so Retell doesn't retry and the agent still starts
        if (agent_id) {
            return NextResponse.json({
                call_inbound: {
                    override_agent_id: agent_id,
                    dynamic_variables: { _debug: 'internal_error' }
                }
            });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
