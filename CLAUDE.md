# La Fábrica de Agentes — Contexto para Claude Code

Este fichero es leído automáticamente por Claude Code al inicio de cada sesión.

---

## Proyecto

Plataforma SaaS multi-tenant para crear agentes de voz IA con Retell AI. Clientes de Netelip crean agentes de voz a través de un wizard de 6 pasos. El proyecto está en Next.js 14 (App Router), Supabase y Vercel Pro.

## Fichero más crítico

`src/lib/retell/toolMapper.ts` — construye el prompt final, las herramientas y el análisis post-llamada. Cualquier cambio en el comportamiento del agente pasa por aquí. Contiene:
- `buildRetellTools()` — herramientas Retell (endcall, transfer, Cal.com, extracciones)
- `buildPostCallAnalysis()` — variables post-llamada
- `injectToolInstructions()` — ensambla el prompt final con guión, idioma, pronunciación, herramientas, KB y notas. **Siempre limpia secciones antiguas antes de regenerar.**

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
| `guardrail_config` | harassment / self_harm / violence / jailbreaking |
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

## Números de teléfono

`phone_numbers` se asocia directamente a `workspaces` mediante `workspace_id` (no a través de la tabla `clinics`, que es legacy y ya no se usa en el código). Las credenciales SIP (`sip_password`) se almacenan en texto plano — son necesarias en runtime para `enrichSipCredentials`.

Los números SIP se registran en Retell con `transport: 'UDP'` forzado (requerimiento Netelip). El parámetro va en el **nivel raíz** del payload de import (`transport: 'UDP'`), no dentro de `sip_outbound_trunk_config` (que el SDK ignora).

## Voces ElevenLabs (importante)

Las voces Carolina, MariCarmen y Sara Martin deben **importarse** a cada workspace de Retell antes de poder usarse. Usar el botón de onda (importar voces) en el panel Admin → Workspaces. Internamente llama a `src/lib/retell/importDefaultVoices.ts` que:
1. Llama a `POST /search-community-voice` en Retell para obtener `public_user_id`
2. Llama a `POST /add-community-voice` con `voice_provider: elevenlabs`

La ruta `/api/retell/voices/import-defaults` tiene `maxDuration = 60` (requiere Vercel Pro).

## Cal.com

Tres endpoints custom en Retell (no el `book_appointment_cal` nativo de Retell):
- `/api/retell/calcom/book` — crea reserva, valida ISO, normaliza teléfono (+34)
- `/api/retell/calcom/check` — busca cita activa por teléfono
- `/api/retell/calcom/cancel` — cancela por `booking_uid` (preferido) o teléfono

Los parámetros de herramientas custom de Retell llegan en `body.args`, no en `body` directamente.

**Versiones de la API Cal.com v2** (crítico — versión incorrecta devuelve 404):
- Slots disponibles: `GET /v2/slots?eventTypeId=...` con `cal-api-version: 2024-09-04`
- Bookings (crear/consultar/cancelar): `cal-api-version: 2026-02-25`

## Webhook Inbound

`/api/retell/webhook/inbound` inyecta variables dinámicas antes de que el agente conteste:
- `disponibilidad_mas_temprana` — próximo hueco Cal.com en lenguaje natural
- `consultar_disponibilidad` — instrucción condicional

**Requiere `OPENAI_API_KEY`** en Vercel. Sin ella, devuelve `_debug: missing_openai_key`.
Se activa automáticamente al asignar un número con Cal.com habilitado (`enableCalBooking=true` + `calApiKey` + `calEventId`).

Valores `_debug` en Retell logs para diagnosticar:
- `cal_not_configured:enabled=...,key=...,event=...` — falta algún campo en la config del agente
- `calcom_error:404 eventId:X — ...` — el eventId no existe en esa cuenta Cal.com
- `missing_openai_key` — falta `OPENAI_API_KEY` en Vercel
- `agent_not_found` — el `retell_agent_id` no está en la tabla `agents` de Supabase

## Variables de entorno críticas

Ver `.env.example`. Las más importantes:
- `SUPABASE_SERVICE_ROLE_KEY` — acceso admin a Supabase (server-side only)
- `OPENAI_API_KEY` — webhook inbound
- `NEXT_PUBLIC_SITE_URL` — para construir URLs de webhook en Retell
- `CRON_SECRET` — protege endpoints de cron de alertas

## Tests y salud del proyecto

Framework: **Vitest** — `npm test` (sin API keys ni conexión externa).

- **71 tests** en `src/lib/retell/__tests__/` — todos pasan
- **8 tests** en `src/app/api/retell/agent/__tests__/route.test.ts` — todos pasan (POST/PATCH del fichero más crítico)
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
