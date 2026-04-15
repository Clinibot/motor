# La Fábrica de Agentes — Contexto para Claude Code

Este fichero es leído automáticamente por Claude Code al inicio de cada sesión.

---

## Proyecto

Plataforma SaaS multi-tenant para crear agentes de voz IA con Retell AI. Clientes de Netelip crean agentes de voz a través de un wizard de 6 pasos. El proyecto está en Next.js 14 (App Router), Supabase y Vercel Pro.

**Arquitectura de tenancy**: cada usuario tiene su propio workspace (`1 usuario = 1 workspace`). Cada workspace tiene su propia Retell API Key en `workspaces.retell_api_key`. No hay usuarios compartiendo workspace.

## Fichero más crítico

`src/lib/retell/toolMapper.ts` — construye el prompt final, las herramientas y el análisis post-llamada. Cualquier cambio en el comportamiento del agente pasa por aquí. Contiene:
- `buildRetellTools()` — herramientas Retell (endcall, transfer, Cal.com, extracciones)
- `buildPostCallAnalysis()` — variables post-llamada
- `injectToolInstructions()` — ensambla el prompt final en el formato del cliente: `# Idioma` + `## Instrucciones` (estilos, entonación, reglas, pronunciación, herramientas, cualificación) + `## Etapas` (saludo, cualificación, acción, cierre) + KB + notas. Sin bold, sin emojis, sin backticks en prosa. Siempre limpia secciones antiguas antes de regenerar (cut markers: `## Instrucciones`, `## Etapas`, y marcadores legacy).
  - **`### Herramientas`** incluye instrucciones detalladas para `book_appointment` (con `{{slots_iso}}` como fuente autoritativa de horarios), `check_appointment`, `cancel_appointment`, transferencias y herramientas custom.
  - **`### Calendario`** se inyecta automáticamente cuando Cal.com está desactivado (`!hasCal`), advirtiendo al agente de que no puede gestionar citas. Desaparece al activar Cal.com (la sección entera se regenera en cada PATCH/POST).
  - **`# Base de Conocimiento`**: siempre muestra el nombre del archivo KB (sin extensión) como bullet list, incluso cuando hay `kbUsageInstructions`. Si hay instrucciones custom, se les añade al final "consulta siempre [nombre]" para que Retell sepa qué documento resolver.

## Arquitectura de la API de agentes

`src/app/api/retell/agent/route.ts` — crea (POST) y actualiza (PATCH) agentes en Retell.

**Función compartida `buildRetellAgentParams`** (nivel módulo) — construye los parámetros Retell para ambos handlers. Solo difieren tres cosas entre POST y PATCH:
- `llmId`: `llmResponse.llm_id` (POST) vs `llmId` (PATCH)
- `agentName` fallback: `"New Agent"` vs `"Updated Agent"`
- `emptyAnalysisFallback`: `undefined` (POST) vs `[]` (PATCH)

**Al añadir un nuevo parámetro por defecto a todos los agentes, solo hay que tocarlo en `buildRetellAgentParams`.** No hay dos builders separados.

### Parámetros fijos aplicados a todos los agentes (crear y actualizar)

| Parámetro | Valor |
|---|---|
| `stt_mode` | `'accurate'` |
| `denoising_mode` | `'noise-cancellation'` |
| `post_call_analysis_model` | `'gemini-3.0-flash'` |
| `fallback_voice_ids` | `['cartesia-Nico']` |
| `enable_llm_turbo_mode` | `true` |
| `data_storage_setting` | `'everything_except_pii'` |
| `data_storage_retention_days` | `null` (keep forever) |
| `pii_config` | `{ mode: 'post_call' }` |
| `guardrail_config` | Todos los output topics de Retell + platform_integrity_jailbreaking (input) |
| `voice_temperature` | `payload.voiceTemperature` (default `0.8`), nunca para voces `openai-*` |
| `voice_speed` | `payload.voiceSpeed`, nunca para voces `openai-*` |
| `boosted_keywords` | Lista netelip/SIP/email del store |

## Estado del wizard

`src/store/wizardStore.ts` — Zustand store. Contiene:
- `CURATED_VOICES_V2` — lista de voces disponibles con `voice_id`, `language`, `gender`, `provider`
- `resetWizard()` — debe llamarse antes de navegar al wizard para crear un agente nuevo
- Al seleccionar una voz, `selectVoice()` en Step3_Voice.tsx auto-asigna `language` (es-ES, en-US, ca-ES)

**Nota deuda técnica**: `resetWizard()` duplica manualmente el estado inicial. Si se añade un campo nuevo al store, hay que añadirlo también en `resetWizard()` o no se limpiará al crear un agente nuevo.

## Reglas de idioma en el prompt

En `injectToolInstructions()`, si `language` empieza por `ca` → norma de hablar en catalán; `en` → en inglés; cualquier otro → en español. Las secciones `# Idioma` y `# Language` se limpian en cada regeneración para evitar duplicados.

## Multi-tenancy

Cada workspace tiene su propia **Retell API Key** almacenada en `supabase: workspaces.retell_api_key`. Las rutas API siempre obtienen la API Key del workspace del usuario autenticado, no de variables de entorno.

La asignación de workspace es atómica via RPC `assign_free_workspace` (FOR UPDATE SKIP LOCKED). Ver `src/lib/supabase/workspace.ts`.

## Números de teléfono

`phone_numbers` se asocia directamente a `workspaces` mediante `workspace_id` (no a través de la tabla `clinics`, que es legacy y ya no se usa en el código). Las credenciales SIP (`sip_password`) se almacenan en texto plano — son necesarias en runtime para `enrichSipCredentials`.

Los números SIP se registran en Retell con `transport: 'UDP'` forzado (requerimiento Netelip). El parámetro va en el **nivel raíz** del payload de import (`transport: 'UDP'`), no dentro de `sip_outbound_trunk_config` (que el SDK ignora).

**Versión del agente en el número (importante)**: Retell crea una nueva versión del agente en cada PATCH. El número de teléfono queda pinado a la versión en que se asignó, y no sigue automáticamente a la última versión. Para forzar el pin a la versión más reciente, el bloque de sincronización de teléfonos en PATCH envía **siempre** `inbound_agent_id: retellAgentId` junto con `inbound_webhook_url`. Sin esto el número se queda en V1 aunque el agente esté en V3.

## Voces ElevenLabs (importante)

Las voces Carolina, MariCarmen y Sara Martin deben **importarse** a cada workspace de Retell antes de poder usarse. Usar el botón de onda (importar voces) en el panel Admin → Workspaces. Internamente llama a `src/lib/retell/importDefaultVoices.ts` que:
1. Llama a `POST /search-community-voice` en Retell para obtener `public_user_id`
2. Llama a `POST /add-community-voice` con `voice_provider: elevenlabs`

Las rutas de voces lentas tienen `maxDuration = 60` (requiere Vercel Pro).

## Cal.com

Tres endpoints custom en Retell (no el `book_appointment_cal` nativo de Retell):
- `/api/retell/calcom/book` — crea reserva, valida ISO, normaliza teléfono (+34)
- `/api/retell/calcom/check` — busca cita activa por teléfono
- `/api/retell/calcom/cancel` — cancela por `booking_uid` (preferido) o teléfono

Los parámetros de herramientas custom de Retell llegan en `body.args`, no en `body` directamente.

**Cal.com API key y secret van SIEMPRE en headers**, nunca en la URL:
- `x-cal-api-key` — la API key de Cal.com del workspace
- `x-factory-secret` — el secret de la fábrica (si `FACTORY_CALCOM_SECRET` está configurado)

Esto se construye en `src/lib/retell/toolMapper.ts` al generar las herramientas del agente.

**Versiones de la API Cal.com v2** (crítico — versión incorrecta devuelve 404):
- Slots disponibles: `GET /v2/slots?eventTypeId=...` con `cal-api-version: 2024-09-04`
- Bookings (crear/consultar/cancelar): `cal-api-version: 2026-02-25`

## Webhook Inbound

`/api/retell/webhook/inbound` inyecta variables dinámicas antes de que el agente conteste:
- `disponibilidad_mas_temprana` — próximo hueco Cal.com en lenguaje natural (generado por OpenAI)
- `consultar_disponibilidad` — descripción de todos los rangos disponibles (generado por OpenAI)
- `slots_iso` — strings ISO exactos de todos los slots disponibles, agrupados por fecha (`"2026-04-15: 2026-04-15T09:30:00.000+02:00, 2026-04-15T10:00:00.000+02:00"`). El agente **extrae** de aquí el `start_time` al reservar — nunca lo calcula. Esto evita que Cal.com devuelva 400 por horarios inventados.

**Requiere `OPENAI_API_KEY`** en Vercel. Sin ella, devuelve `_debug: missing_openai_key`.
Se activa automáticamente al asignar un número con Cal.com habilitado (`enableCalBooking=true` + `calApiKey` + `calEventId`).

Valores `_debug` en Retell logs para diagnosticar:
- `cal_not_configured:enabled=...,key=...,event=...` — falta algún campo en la config del agente
- `calcom_error:404 eventId:X — ...` — el eventId no existe en esa cuenta Cal.com
- `missing_openai_key` — falta `OPENAI_API_KEY` en Vercel
- `agent_not_found` — el `retell_agent_id` no está en la tabla `agents` de Supabase

### Verificación de firma en el webhook inbound — NO TOCAR

**Retell NO envía `x-retell-signature` en webhooks pre-call (inbound) de la misma forma que en post-call.** La verificación con `Retell.verify()` siempre falla en este endpoint aunque la API key sea correcta.

**Regla fija**: el webhook inbound **nunca bloquea** por fallo de firma. Si el header llega, se intenta verificar y se loguea el resultado, pero la llamada **siempre continúa** hacia Cal.com y OpenAI. Sin esto, `disponibilidad_mas_temprana` y `consultar_disponibilidad` nunca se inyectan y el agente trabaja sin información de disponibilidad.

El post-call webhook (`/api/retell/webhook`) también usa verificación best-effort: loguea el fallo pero nunca devuelve 401 (igual que el inbound). Ver sección "Notas de arquitectura" para el contexto completo.

Ver [src/app/api/retell/webhook/inbound/route.ts](src/app/api/retell/webhook/inbound/route.ts) — comentario `Best-effort signature verification`.

## Variables de entorno críticas

Ver `.env.example`. Las más importantes:

| Variable | Obligatoria | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Sí | Clave pública Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Sí | Clave admin Supabase (solo server-side) |
| `NEXT_PUBLIC_SITE_URL` | ⚠️ Recomendada | URL canónica de la app. Si no se configura, `env.ts` usa `VERCEL_URL` como fallback automático (Vercel lo inyecta en cada deploy). Solo necesaria si quieres URL personalizada o en local. |
| `OPENAI_API_KEY` | ⚠️ Cal.com | Webhook inbound para disponibilidad natural |
| `CRON_SECRET` | ✅ Configurado | Protege `/api/cron/cleanup` y `/api/alerts/check-thresholds` |
| `FACTORY_CALCOM_SECRET` | Opcional | Guard extra en endpoints Cal.com |
| `RESEND_API_KEY` | Opcional | Envío de emails de alerta |

**`NEXT_PUBLIC_SITE_URL` y fallback automático**: `env.ts` usa `VERCEL_URL` (inyectada automáticamente por Vercel en cada deploy) si `NEXT_PUBLIC_SITE_URL` no está configurada. En local sin `.env.local`, cae a string vacío — los webhooks no tendrán URL válida, pero la app arranca.

## Seguridad y rate limiting

### Rate limiting (via RPC `increment_rate_limit` en Supabase)

Todos los endpoints sensibles tienen rate limiting. La tabla `rate_limit_windows` se limpia automáticamente cada hora via cron.

| Endpoint | Límite | Ventana | Clave |
|---|---|---|---|
| `POST /api/retell/agent` | 20 req | 1 hora | `agent:create:{workspaceId}` |
| `PATCH /api/retell/agent` | 20 req | 1 hora | `agent:update:{workspaceId}` |
| `POST /api/retell/calcom/book` | 30 req | 1 min | `calcom:book:{apiKey[0:16]}` |
| `POST /api/retell/calcom/check` | 60 req | 1 min | `calcom:check:{apiKey[0:16]}` |
| `POST /api/retell/calcom/cancel` | 20 req | 1 min | `calcom:cancel:{apiKey[0:16]}` |
| `POST /api/retell/phone-number/assign` | 30 req | 1 hora | `phone:assign:{workspaceId}` |
| `POST /api/retell/phone-number/delete` | 10 req | 1 hora | `phone:delete:{workspaceId}` |
| `GET /api/retell/voices` | 60 req | 1 min | `voices:list:{workspaceId}` |
| `POST /api/retell/knowledge-base` | 10 req | 1 hora | `kb:upload:{workspaceId}` |
| `POST /api/retell/web-call` | 30 req | 1 min | `webcall:{workspaceId}` |
| `POST /api/retell/webhook` | 300 req | 1 min | `webhook:{workspaceId}` |
| `POST /api/alerts/check-thresholds` | 1 req | 1 min | `alert:check:{workspaceId}` |
| `POST /api/retell/sync-agents` | 5 req | 1 hora | `sync:agents:{workspaceId}` |
| `POST /api/retell/voices/clone` | 5 req | 1 hora | `voice:clone:{workspaceId}` |

### Idempotencia distribuida (tabla `idempotency_keys`)

Protege reservas y cancelaciones Cal.com de doble-ejecución por parte de Retell. La clave es única por combinación evento+hora+identidad. La tabla se limpia cada hora via cron.

### RLS activado en tablas de datos

`agents`, `calls`, `phone_numbers`, `alert_settings`, `alert_notifications` tienen RLS habilitado con dos capas de políticas:

- **`service_role`** (rutas API, webhooks — `createSupabaseAdmin()`): bypasa RLS automáticamente. Sin impacto.
- **`authenticated`** (dashboard, páginas UI — `createClient()` del navegador): tiene política `authenticated_workspace_select` que permite SELECT solo sobre filas del propio workspace.
- **`anon`**: sin políticas → acceso denegado por defecto.

**IMPORTANTE**: el dashboard y varias páginas UI usan `createClient()` (rol `authenticated`), NO el admin client. Si se añaden tablas nuevas con RLS hay que crear también la política SELECT para `authenticated`, o el dashboard no mostrará datos.

## Migraciones SQL (ejecutar en Supabase Dashboard → SQL Editor)

| Fichero | Estado | Descripción |
|---|---|---|
| `20260411_assign_free_workspace_rpc.sql` | ✅ Ejecutado | RPC atómica para asignar workspace |
| `20260411_idempotency_keys.sql` | ✅ Ejecutado | Tabla idempotency_keys |
| `20260411_rate_limit.sql` | ✅ Ejecutado | Tabla rate_limit_windows + RPC |
| `20260411_rls_data_tables.sql` | ✅ Ejecutado | Activar RLS en tablas de datos |
| `20260411_rls_authenticated_select_policies.sql` | ✅ Ejecutado | Políticas SELECT para rol authenticated (dashboard) |
| `20260411_cleanup_function.sql` | ✅ Ejecutado | Función cleanup_expired_records() |
| `20260411_webhook_logs_index_and_cleanup.sql` | ✅ Ejecutado | Índice en webhook_logs + incluir en cleanup (30 días) |

## Cron jobs (Vercel — `vercel.json`)

| Endpoint | Frecuencia | Descripción |
|---|---|---|
| `GET /api/cron/cleanup` | Cada hora | Limpia filas expiradas de rate_limit_windows e idempotency_keys |

El cron envía automáticamente `Authorization: Bearer <CRON_SECRET>`. Requiere `CRON_SECRET` configurado en Vercel.

## Tests y salud del proyecto

Framework: **Vitest** — `npm test` (sin API keys ni conexión externa).

- **71 tests** en `src/lib/retell/__tests__/` — todos pasan (incluye `toolMapper.ts`, `parseBool`, `detectCalToolLoss`, KB, prompt structure)
- **8 tests** en `src/app/api/retell/agent/__tests__/route.test.ts` — todos pasan (POST/PATCH del fichero más crítico)
- **14 tests** en `src/app/api/retell/webhook/__tests__/route.test.ts` — todos pasan
- **Tests de Cal.com** en `src/app/api/retell/calcom/__tests__/` — book y cancel cubiertos
- **17 tests** en `src/app/api/retell/webhook/inbound/__tests__/route.test.ts` — todos pasan (incluye `slots_iso`, OpenAI failure, sig best-effort)
- **Total: 142 tests en 7 ficheros** — todos pasan
- Cobertura `toolMapper.ts`: 95.94% líneas · 100% funciones · 76.19% ramas
- Cobertura `webhookAuth.ts`: 100% en todo

Funciones exportadas y testeadas en `toolMapper.ts`:
- `parseBool(val)` — normaliza `true`/`"true"` → `true`; `false`/`"false"`/`undefined`/números → `false`
- `detectCalToolLoss(config, builtTools)` — devuelve `true` si config tenía Cal.com pero el rebuild la perdió (usado en assign route para abortar antes de sobrescribir Retell)

**Health check**: `GET /api/health` — verifica env vars críticas + ping a Supabase. Devuelve `200 { status: "ok" }` o `503 { status: "degraded" }`.

Antes de tocar `toolMapper.ts`, ejecutar `npm test` para no romper cobertura.

## Patrones a respetar

- Los parámetros del wizard llegan al API como `AgentPayload` (`src/lib/retell/types.ts`)
- `AgentPayload` extiende `ToolsPayload` — se pasa directamente a `injectToolInstructions`
- `voice_speed` y `voice_temperature` se envían siempre para voces no-OpenAI (prefijo `openai-`). Las voces OpenAI no admiten estos parámetros.
- Al crear un agente, hay un fallback de voz: si `voiceId` no se encuentra en el workspace, se reintenta con `11labs-Adrian`
- `parseBool()` en toolMapper maneja tanto `boolean true` como `string "true"` de Supabase JSON — usarlo siempre al leer booleanos de `agents.configuration`, nunca comparar con `=== true` directamente
- El assign route (`/api/retell/phone-number/assign`) solo refresca tools en Retell si el agente tiene `enableTransfer=true`. Si lo hace, usa `detectCalToolLoss()` para abortar si el rebuild perdería Cal.com. No modificar esta lógica sin entender el riesgo de borrar Cal.com del agente en Retell.
- Las transferencias son siempre a número de teléfono humano (`destination_type: 'number'`). La opción de transferir entre agentes fue eliminada del wizard.
- **Nunca usar `=== true` directamente** al leer campos booleanos de `agents.configuration` — usar siempre `parseBool()` porque Supabase devuelve `"true"` como string en campos JSON.
- **`service_role` bypasa RLS** — toda la lógica de datos usa `createSupabaseAdmin()`. Si alguna vez se añade una query usando el cliente de sesión de usuario (`createLocalClient()`), verificar que la tabla tiene la política RLS adecuada para el rol `authenticated`.

## Notas de arquitectura importantes (aprendidas en producción)

- **`env.ts` no lanza excepción en build phase** (`NEXT_PHASE === 'phase-production-build'`): Next.js importa todos los módulos de rutas durante el build para leer exports estáticos. Si `env.ts` lanzara aquí, el build fallaría aunque las vars estén correctas en Vercel runtime.
- **Todas las rutas API necesitan `export const dynamic = 'force-dynamic'`**: sin esto Next.js intenta pre-renderizar estáticamente la ruta durante el build, lo que falla para rutas con auth.
- **No existe `RETELL_WEBHOOK_SECRET`**: Retell no tiene un "webhook secret" separado. La firma `x-retell-signature` se verifica con la **API Key del workspace** via `Retell.verify(rawBody, workspace.retell_api_key, signature)`. **La verificación es best-effort** — si falla (mismatch de HMAC, replay window, header ausente) se loguea un warning pero el webhook sigue procesándose. Un 401 haría que Retell reintente indefinidamente sin resolver nada. No añadir esta variable a `.env` ni al health check.
- **`NEXT_PUBLIC_SITE_URL` tiene fallback automático via `VERCEL_URL`**: `env.ts` calcula `NEXT_PUBLIC_SITE_URL` como `process.env.NEXT_PUBLIC_SITE_URL || (VERCEL_URL ? \`https://${VERCEL_URL}\` : '')`. En Vercel sin configuración manual, los webhooks siempre tendrán URL correcta.
- **Idempotencia en cancelaciones**: si Cal.com devuelve error real en `/api/retell/calcom/cancel`, la clave de idempotencia se libera (`releaseIdempotencyKey`) para que Retell pueda reintentar. Si el booking ya estaba cancelado, la clave NO se libera (la respuesta de "ya cancelado" es correcta).
- **Cal.com 400 por horario inventado**: el agente infería el `start_time` de la descripción en lenguaje natural (ej. "09:00" cuando el slot real era "09:30"), lo que causaba 400 en Cal.com. Solución: variable `{{slots_iso}}` con los strings ISO exactos del webhook inbound. El prompt prohíbe explícitamente calcular o deducir el datetime — solo puede extraerlo de `{{slots_iso}}`.
- **Componentes eliminados**: `NotificationsPanel.tsx` y `AlertSettings.tsx` fueron eliminados. `DashboardTopbar.tsx` ya no tiene el botón de campana. Si en el futuro se reimplementan notificaciones, partir de cero sin esos ficheros.
- **KB — nombres de archivo**: Retell resuelve el documento KB por nombre exacto (sin extensión). El nombre se obtiene como `f.name || f.id` y se le aplica `.replace(/\.(pdf|docx?|txt|md)$/i, '')`. Nunca mostrar la extensión en el prompt.
- **`undefined` vs `null` en PATCH a Retell (crítico)**: el SDK de Retell omite los campos con valor `undefined` del cuerpo del PATCH — Retell interpreta esto como "no cambies este campo" y mantiene el valor anterior. Para **limpiar** un campo (ponerlo a vacío/desactivarlo) hay que enviar `null` explícitamente. Afecta a: `ambient_sound`, `ambient_sound_volume`, `fallback_voice_ids` (se envía `[]`), y cualquier otro campo opcional que el usuario pueda desactivar. Síntoma: el usuario desactiva una opción en el wizard, guarda, pero en Retell el valor antiguo persiste.
