#  Guía del Desarrollador: Cómo añadir nuevas alertas

Este documento explica paso a paso la arquitectura del sistema de **Alertas por Email (Resend)** para que cualquier desarrollador pueda extenderlo fácilmente y añadir nuevas métricas o disparadores en el futuro.

##  Arquitectura actual

El sistema de alertas se basa en **3 pilares principales**:
1. **Frontend (`AlertSettings.tsx`)**: La interfaz donde el usuario activa sus preferencias y define umbrales.
2. **Base de Datos (`alert_settings` en Supabase)**: Tabla que almacena de forma persistente qué alertas están encendidas y qué umbral numérico aplica a cada una.
3. **Backend (`/api/alerts/...`)**: Compuesto por:
    - **Ruta de ajustes:** `/api/alerts/settings/route.ts` (Lee y actualiza la BD).
    - **Trigger en caliente:** `/api/alerts/check-thresholds/route.ts` (Recibe un aviso tras cada llamada finalizada de Retell y evalúa si dispara la alerta usando los umbrales de BD).
    - **Cron diario:** `/api/alerts/send-daily/route.ts` (Se ejecuta automáticamente vía Edge Function a las 08:00 UTC con el resumen consolidado).

---

##  Pasos para añadir una NUEVA ALERTA

Imaginemos que quieres crear una alerta llamada **"Discurso muy largo del agente"** (que salte si el bot habla más del 80% del tiempo de la llamada). Debes tocar los siguientes archivos en este orden:

### 1. Actualizar la Base de Datos (Supabase SQL)
Lo primero es crear las columnas en la tabla `alert_settings` para guardar el estado (booleano) y el umbral (numérico) de tu nueva alerta.

Ejecuta este comando SQL en la consola de tu proyecto Supabase:
```sql
ALTER TABLE alert_settings 
ADD COLUMN bot_speaking_time_enabled BOOLEAN DEFAULT false,
ADD COLUMN bot_speaking_time_threshold INTEGER DEFAULT 80;
```

### 2. Actualizar el Componente de Interfaz (`src/components/AlertSettings.tsx`)
Añade la nueva alerta a la lista de tarjetas para que se renderice automáticamente en el Dashboard.

1. **Añade las claves al interfaz de TypeScript:**
   ```typescript
   interface AlertSettingsData {
     // ...
     bot_speaking_time_enabled: boolean;
     bot_speaking_time_threshold: number;
   }
   ```
2. **Amplía el objeto `DEFAULT`** con los valores iniciales.
3. **Añádela al array `alertCards`** más abajo en el archivo:
   ```typescript
   const alertCards = [
     // ...
     {
       icon: '⏱️',
       title: 'El bot habla demasiado',
       description: 'Avísame si el bot domina más del umbral configurado de la llamada.',
       enabledKey: 'bot_speaking_time_enabled' as keyof AlertSettingsData,
       thresholdKey: 'bot_speaking_time_threshold' as keyof AlertSettingsData,
       thresholdLabel: 'Alertar si el bot habla más del',
       thresholdUnit: '%',
       thresholdMin: 10,
       thresholdMax: 90,
     }
   ];
   ```

### 3. Crear la plantilla del Email (`src/lib/resend.ts`)
Aquí programamos el asunto y cuerpo del nuevo correo electrónico.

Abre el archivo y diseña la función exportada que se encargará del envío usando la plantilla estándar:
```typescript
export async function sendBotSpeakingTimeAlert(to: string, callId: string, speakingTime: number, threshold: number) {
  const content = `
    <h2>⏱️ Tu agente está monopolizando la conversación</h2>
    <p>Hemos detectado una llamada (ID: ${callId}) donde tu bot ha acaparado el <strong>${speakingTime}%</strong> del tiempo de voz.</p>
    <p>Habías configurado un límite de aviso del ${threshold}%. ¡Revisa su prompt!</p>
  `;
  return sendAlertEmail(to, 'Alerta de Tiempo de Voz ⏱️', content);
}
```

### 4. Integrar la Lógica Evaluativa (`src/app/api/alerts/check-thresholds/route.ts`)
Por último, debes "enseñar" al webhook cuándo usar la plantilla anterior comparando los datos crudos de la llamada con la BD.

Abre el chequeador en caliente (se ejecuta al final de cada *call_analyzed*) y añade un nuevo bloque `if` debajo de las evaluaciones existentes:

```typescript
// 4. EL BOT HABLA DEMASIADO (NUEVA ALERTA DE EJEMPLO)
if (settings.bot_speaking_time_enabled && settings.bot_speaking_time_threshold !== null) {
  // Extraes la métrica real (si tu IA / Retell te la propociona en la llamada)
  const actualSpeakingTime = call.call_analysis?.custom_variables?.bot_speaking_time || 0;

  if (actualSpeakingTime > settings.bot_speaking_time_threshold) {
    console.log(`Disparando alerta: Bot habló ${actualSpeakingTime}% (límite: ${settings.bot_speaking_time_threshold}%)`);
    await sendBotSpeakingTimeAlert(
      settings.alert_email,
      call.retell_call_id,
      actualSpeakingTime,
      settings.bot_speaking_time_threshold
    );
  }
}
```

¡Y listo! Ya habrías añadido una nueva alerta al ecosistema global.

### ¿Y si la alerta pertenece al Cron Diario?
Si tu nueva alerta no reacciona llamada por llamada, sino que es un parámetro globlal de resumen (como la suma de minutos hablados ese día), entonces en lugar de tocar el verificador de umbral, añadirías el cálculo y la variable en la consulta SQL y la función del archivo `/api/alerts/send-daily/route.ts`. 

Al añadir más variables a la interfaz `DailySummaryData`, recuerda actualizar la constante `htmlTemplate` dentro de `src/lib/resend.ts` para renderizarlas en una nueva fila de la "tabla" del email del cliente.
