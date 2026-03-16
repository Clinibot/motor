# Guía de Mantenimiento: Cómo añadir o modificar Modelos de IA (LLM)

¡Hola! He preparado esta guía sencilla para que cualquier programador que mantenga la plataforma sepa exactamente qué tocar si necesitamos añadir un nuevo modelo de inteligencia artificial (como un nuevo GPT, Claude o Gemini) a nuestra fábrica de agentes.

He estructurado los pasos de forma clara, dividiendo lo que hay que hacer en la parte visual (Frontend) y en la parte lógica (Backend).

---

## 1. Parte Visual: El Menú Desplegable (Frontend)

Lo primero es hacer que el nuevo modelo aparezca en el paso 2 del asistente (donde elegimos el "cerebro" del agente).

*   **Archivo a modificar:** `src/components/wizard/steps/Step2_LLM.tsx`
*   **Qué hacer:** Busca la etiqueta `<select>` que contiene los modelos (alrededor de la línea 70). Solo tienes que añadir una nueva línea `<option>` con el valor técnico y el nombre que verá el usuario.

```tsx
// Ejemplo: Añadir GPT-6 cuando salga
<select ...>
    <option value="gpt-4.1">GPT-4.1</option>
    <option value="gemini-3.0-flash">Gemini 3.0 Flash (Recomendado)</option>
    {/* Añade el nuevo aquí */}
    <option value="gpt-6">GPT-6.0 (Nuevo)</option> 
</select>
```

> [!IMPORTANT]
> El atributo `value` (por ejemplo `"gpt-6"`) debe coincidir exactamente con el nombre de modelo que soporte la API de Retell.

---

## 2. El Estado de la Aplicación (Store)

Si quieres cambiar el modelo que viene seleccionado por defecto cuando alguien abre el asistente por primera vez.

*   **Archivo a modificar:** `src/store/wizardStore.ts`
*   **Qué hacer:** Busca la función `resetWizard` o la inicialización del estado (`useWizardStore`).
*   Cambia el valor de la propiedad `model`.

```typescript
// Cambiar el modelo por defecto
model: 'gemini-3.0-flash', // Cámbialo por el nuevo ID si quieres que sea el predeterminado
```

---

## 3. La Lógica del Servidor (Backend)

Nuestra plataforma está diseñada para ser flexible, por lo que el backend ya recibe el modelo que el usuario elige en el frontend. No suele hacer falta tocar nada aquí a menos que el modelo necesite una configuración especial.

*   **Archivo a modificar:** `src/app/api/retell/agent/route.ts`
*   **Qué hacer:** Revisa las funciones `POST` (crear) y `PATCH` (editar). Verás que extraemos el modelo de la selección que yo hice en el asistente:

```typescript
// Línea 155 aprox (POST) y 302 aprox (PATCH)
const retellModel = payload.model || "gpt-4.1"; // Si por algún motivo no llega, usa este de respaldo
```

---

## 4. Verificación

Una vez hecho el cambio, para asegurarte de que todo funciona:
1. Abre el asistente en modo desarrollo.
2. Ve al **Paso 2**.
3. Selecciona tu nuevo modelo.
4. Completa el asistente y crea el agente.
5. Verifica en el dashboard de Retell que el agente se ha creado con el modelo correcto.

¡Y ya está! Es así de sencillo mantener nuestra fábrica actualizada.
