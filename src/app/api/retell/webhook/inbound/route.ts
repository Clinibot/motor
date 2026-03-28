import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
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
    try {
        const payload = await request.json();
        const call_inbound = payload.call_inbound;

        if (!call_inbound || !call_inbound.agent_id) {
            return NextResponse.json({ error: 'Missing agent_id in call_inbound payload' }, { status: 400 });
        }

        const agent_id = call_inbound.agent_id;
        const supabaseAdmin = getSupabaseAdmin();

        if (!supabaseAdmin) {
            console.error('Webhook ERROR: Supabase environment variables are missing');
            return NextResponse.json(
                { call_inbound: { override_agent_id: agent_id } }
            );
        }

        // Get internal agent details
        const { data: agentData, error } = await supabaseAdmin
            .from('agents')
            .select('id, configuration')
            .eq('retell_agent_id', agent_id)
            .single();

        if (error || !agentData || !agentData.configuration) {
            console.warn(`Webhook received for unknown or unconfigured retell_agent_id: ${agent_id}`);
            return NextResponse.json({ call_inbound: { override_agent_id: agent_id } });
        }

        const config = agentData.configuration;

        // If Cal.com is not fully configured, just return the agent_id
        if (!config.enableCalBooking || !config.calApiKey || !config.calEventId) {
            return NextResponse.json({ call_inbound: { override_agent_id: agent_id } });
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

        const calResponse = await fetch(`https://api.cal.com/v2/slots?eventTypeId=${calEventId}&start=${startIso}&end=${endIso}&timeZone=Europe/Madrid`, {
            headers: {
                'cal-api-version': '2024-09-04',
                'Authorization': `Bearer ${calApiKey}`
            }
        });

        if (!calResponse.ok) {
            console.error(`Error fetching Cal.com: ${calResponse.status}`, await calResponse.text());
            return NextResponse.json({ call_inbound: { override_agent_id: agent_id } });
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

#Inicio
Hoy es ${nowFormatted}

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

<task>
Usando los datos de citas proporcionados al inicio, crea el output optimizado para voz siguiendo todas las reglas anteriores. Comienza tu respuesta directamente con la disponibilidad del primer día. Devuelve ÚNICAMENTE el texto, sin comillas, sin explicaciones.
</task>`;

        // Call OpenAI for both prompts in parallel
        const openAiKey = process.env.OPENAI_API_KEY;
        if (!openAiKey) {
            console.error("Missing OPENAI_API_KEY environment variable");
            return NextResponse.json({ call_inbound: { override_agent_id: agent_id } });
        }

        const [earliestResponse, fullResponse] = await Promise.all([
            fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openAiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini', // Fallback to mini for performance/latency or user specified 4o
                    messages: [{ role: 'user', content: earliestPrompt }],
                    temperature: 0.1
                })
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
                })
            })
        ]);

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

    } catch (err: any) {
        console.error("Error handling call_inbound webhook:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
