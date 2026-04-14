# La Fábrica de Agentes — Netelip

Plataforma SaaS multi-tenant para crear, configurar y gestionar agentes de voz con IA mediante [Retell AI](https://retellai.com). Permite a clientes de Netelip crear agentes de voz en minutos sin conocimientos técnicos.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Base de datos | Supabase (PostgreSQL + Auth) |
| Agentes de voz | Retell AI SDK v5 |
| LLM | Gemini (configurado por agente) |
| Voces | ElevenLabs, OpenAI TTS, Cartesia (vía Retell) |
| Calendario | Cal.com v2 API |
| Email | Resend |
| Deploy | Vercel (plan Pro) |

---

## Arquitectura general

```
Usuario
  │
  ▼
Dashboard (Next.js)
  │
  ├── Wizard (6 pasos) ──────────────────► API /retell/agent (POST/PATCH)
  │     Step1: Info básica                     │
  │     Step2: Modelo LLM                      ├── Retell: llm.create/update
  │     Step3: Voz                             ├── Retell: agent.create/update
  │     Step4: Audio                           └── Supabase: agents table
  │     Step5: Herramientas (Cal.com, etc.)
  │     Step6: Resumen + deploy
  │
  ├── Números de teléfono ────────────────► API /retell/phone-number/assign
  │
  └── Admin (superadmin only) ──────────── API /admin/workspaces


Llamada entrante (Retell → Webhook)
  │
  ├── /api/retell/webhook/inbound ────────► Inyecta variables dinámicas
  │     (disponibilidad_mas_temprana,          (requiere OPENAI_API_KEY)
  │      consultar_disponibilidad)
  │
  └── /api/retell/webhook ────────────────► Post-call analysis, alertas


Cal.com (herramientas custom en Retell)
  ├── /api/retell/calcom/book   ──► Crea reserva
  ├── /api/retell/calcom/check  ──► Busca reserva activa por teléfono
  └── /api/retell/calcom/cancel ──► Cancela reserva (por uid o teléfono)
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   └── workspaces/      # CRUD workspaces (superadmin)
│   │   ├── alerts/              # Sistema de alertas por email
│   │   └── retell/
│   │       ├── agent/           # Crear/actualizar agentes en Retell
│   │       ├── calcom/          # Integración Cal.com (book/check/cancel)
│   │       ├── knowledge-base/  # Gestión base de conocimiento
│   │       ├── phone-number/    # Asignación/desasignación de números
│   │       ├── sync-agents/     # Sincronización masiva de agentes
│   │       ├── voices/          # Listado, clonación e importación de voces
│   │       └── webhook/         # Webhooks Retell (post-call + inbound)
│   ├── dashboard/               # Páginas del cliente
│   ├── admin/                   # Panel superadmin
│   └── wizard/                  # Wizard de creación de agentes
│
├── components/
│   └── wizard/steps/            # Step1 a Step6 del wizard
│
├── lib/
│   └── retell/
│       ├── toolMapper.ts        # ⭐ CORE: construye prompt, tools y análisis
│       ├── importDefaultVoices.ts # Importa voces ElevenLabs al workspace
│       ├── types.ts             # AgentPayload, TransferDestination, etc.
│       └── sip-enrichment.ts    # Enriquece credenciales SIP para transferencias
│
└── store/
    └── wizardStore.ts           # Estado global del wizard (Zustand)
                                 # Contiene CURATED_VOICES_V2 (lista de voces)
```

---

## El fichero más importante: `toolMapper.ts`

`src/lib/retell/toolMapper.ts` es el **corazón del sistema**. Se ejecuta server-side en cada creación/actualización de agente y hace tres cosas:

1. **`buildRetellTools(payload)`** — Traduce la configuración del wizard al formato de herramientas que espera la API de Retell (end_call, transfer, Cal.com book/check/cancel, extracciones, etc.)

2. **`buildPostCallAnalysis(payload)`** — Genera el array de variables de análisis post-llamada para Retell.

3. **`injectToolInstructions(basePrompt, payload)`** — Toma el prompt base del usuario y añade automáticamente:
   - Guión de la llamada (PASO 1, cualificación, agenda, transferencias...)
   - Regla de idioma (español/inglés/catalán según la voz seleccionada)
   - Pronunciación de teléfonos, emails y fechas
   - Instrucciones de cada herramienta activa
   - Base de conocimiento
   - Notas adicionales

   > **Importante:** esta función también hace limpieza de secciones antiguas antes de regenerar, para evitar duplicados al editar un agente.

---

## Multi-tenancy (Workspaces)

Cada cliente tiene un **workspace** con su propia Retell API Key. La plataforma es completamente aislada por workspace:

- Cada workspace tiene su propia API Key de Retell → sus propios agentes, voces y números
- Los usuarios se asignan a un workspace en Supabase (tabla `users.workspace_id`)
- El superadmin (rol `superadmin`) gestiona todos los workspaces desde `/admin`

### Roles
| Rol | Acceso |
|-----|--------|
| `user` | Solo su workspace |
| `admin` | Su workspace + panel admin |
| `superadmin` | Todo + gestión de workspaces |

---

## Voces disponibles

Las voces están definidas en `src/store/wizardStore.ts` (constante `CURATED_VOICES_V2`).

### Español
| Voz | ID en Retell | Proveedor |
|-----|-------------|-----------|
| Carolina | `11labs-UOIqAnmS11Reiei1Ytkc` | ElevenLabs (importar) |
| MariCarmen | `11labs-YDDaC9XKjODs7hY78qEW` | ElevenLabs (importar) |
| Sara Martin | `11labs-gD1IexrzCvsXPHUuT0s3` | ElevenLabs (importar) |
| Santiago | `v2-santiago` | Retell nativo |

### Inglés
| Voz | ID en Retell | Proveedor |
|-----|-------------|-----------|
| Nico | `11labs-Nico` | ElevenLabs (preinstalada en Retell) |
| Willa | `11labs-Willa` | ElevenLabs (preinstalada en Retell) |

### Catalán
| Voz | ID en Retell | Proveedor |
|-----|-------------|-----------|
| Cimo | `openai-Cimo` | OpenAI |
| Alloy | `openai-Alloy` | OpenAI |

> **Nota:** Las voces ElevenLabs (Carolina, MariCarmen, Sara Martin) deben importarse a cada workspace desde el panel Admin → botón de onda en cada workspace.

---

## Webhook Inbound

`POST /api/retell/webhook/inbound` se configura como webhook de Retell para llamadas entrantes. Inyecta variables dinámicas antes de que el agente conteste:

- `disponibilidad_mas_temprana` — próximo hueco disponible en Cal.com
- `consultar_disponibilidad` — instrucción condicional para el agente

**Requiere** `OPENAI_API_KEY` en Vercel para formatear la fecha en lenguaje natural.

Para activarlo, asigna el número de teléfono con Cal.com habilitado — el sistema configura el webhook automáticamente.

---

## Integración Cal.com

Cuando se activa la herramienta de agenda en el wizard (Paso 5), el agente puede:

1. **`check_appointment`** — Busca citas activas del usuario por teléfono
2. **`book_appointment`** — Reserva una cita (endpoint custom `/api/retell/calcom/book`)
3. **`cancel_appointment`** — Cancela una cita (por `booking_uid` o teléfono)

El flujo recomendado en el agente es: `check_appointment` → confirmar con usuario → `cancel_appointment` con el `booking_uid` devuelto.

---

## Setup local

```bash
# 1. Clonar el repo
git clone https://github.com/netelip/fabrica_agentes.git
cd fabrica_agentes

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con los valores reales

# 4. Arrancar
npm run dev
```

---

## Deploy

El proyecto está desplegado en **Vercel** (plan Pro). Cada push a `main` dispara un deploy automático.

Variables de entorno configuradas en **Vercel Settings → Environment Variables** (ver `.env.example`).

### Funciones serverless en Vercel

Todas las rutas bajo `src/app/api/` son **Vercel Serverless Functions**. Algunas tienen configuración especial:

| Ruta | `maxDuration` | Motivo |
|------|--------------|--------|
| `/api/retell/voices/import-defaults` | 60s | La importación de voces ElevenLabs vía Retell search puede tardar 30-50s |

El resto de funciones usa el timeout por defecto de Vercel Pro (60s máximo disponible).

> **Importante:** el plan **Pro** es obligatorio. El plan Hobby tiene un límite de 10s por función que hace que la importación de voces falle siempre.

---

## Tests

El proyecto usa **Vitest** para tests unitarios. No requieren ninguna API key ni conexión a servicios externos.

### Ejecutar

```bash
npm test
```

### Modo watch (mientras desarrollas)

```bash
npm run test:watch
```

### Qué se testea

Los tests están en `src/lib/retell/__tests__/` y cubren las funciones más críticas del proyecto:

**`injectToolInstructions`** — la función que construye el prompt final del agente:
- Que siempre se incluyen las secciones obligatorias (pronunciación, idioma, guión)
- Que el prompt base del usuario se conserva
- **Idempotencia** — que si se regenera el prompt dos veces no se duplican secciones (crítico al editar un agente)
- Que el idioma cambia correctamente según la voz seleccionada (español / inglés / catalán)
- Que al cambiar de voz el idioma anterior se limpia y se reemplaza
- Que se incluyen las instrucciones de Cal.com cuando está activo (incluyendo cancelación)
- Que se incluye el paso de cualificación con las preguntas configuradas
- Que se incluyen las transferencias con los destinos correctos
- Que el guión incluye el paso de cierre cuando `end_call` está activo
- Que las herramientas personalizadas aparecen en el prompt
- Que Cal.com + transferencia simultáneos generan un guión con ambas opciones
- Que la base de conocimiento no se duplica al regenerar
- Que las notas adicionales aparecen en el prompt

**`buildRetellTools`** — la función que construye las herramientas que Retell envía al LLM:
- Que devuelve array vacío si no hay herramientas activas
- Que `end_call`, `book_appointment`, `check_appointment` se añaden correctamente
- Que `book_appointment` no se añade si el `calEventId` no es un número válido
- Que no se añade si falta la `calApiKey`
- Que las transferencias se generan con el nombre correcto
- Que acepta `"true"` como string (así llegan los booleanos desde Supabase JSON)
- **Cal.com edge cases**: `"false"` string no activa Cal.com, `calApiKey` vacío tampoco

**`parseBool`** — helper que normaliza booleanos de Supabase JSON:
- `true` (boolean) y `"true"` (string) → `true`
- `false`, `"false"`, `undefined`, `null`, `1` → `false`

**`detectCalToolLoss`** — detecta si un rebuild de tools borraría Cal.com accidentalmente:
- Detecta pérdida cuando la config tiene Cal.com pero los tools reconstruidos no la incluyen
- No genera falsos positivos cuando Cal.com no estaba configurada

**`buildPostCallAnalysis`** — la función que genera las variables de análisis post-llamada:
- Que siempre incluye las 3 variables predefinidas del sistema (`resumen_llamada`, `llamada_exitosa`, `sentimiento_usuario`)
- Que añade variables de extracción custom y normaliza el nombre a snake_case
- Que mapea correctamente los tipos: `texto`→`string`, `booleano`→`boolean`, `selector`→`enum`
- Que los tipos `enum` parsean las opciones desde la descripción (separadas por coma)
- Que los `enum` sin descripción usan un placeholder por defecto
- Que ignora variables incompletas (sin nombre o sin tipo)

**`verifyRetellWebhook`** — la función que verifica firmas HMAC-SHA256 de Retell:
- Que devuelve `true` en modo degradado si no hay secret configurado
- Que devuelve `false` si falta la cabecera `x-retell-signature`
- Que valida correctamente una firma HMAC-SHA256 válida
- Que rechaza firmas incorrectas
- Que la firma de un body no sirve para otro body distinto (protección anti-manipulación)

**`resolveVoiceId`** — la función que normaliza el ID de voz:
- Que devuelve el ID si es válido
- Que devuelve el fallback (`11labs-Adrian`) si el ID está vacío
- Que devuelve el fallback si el ID es el `provider_voice_id` de Carolina antes de importarse

### Cobertura

```bash
npm run test:coverage
```

Genera una tabla en terminal y un reporte HTML en `coverage/index.html`.

Los umbrales están configurados por fichero crítico (no por media global):

| Fichero | Líneas | Funciones | Ramas |
|---------|--------|-----------|-------|
| `toolMapper.ts` | ≥ 95% | 100% | ≥ 75% |
| `webhookAuth.ts` | 100% | 100% | 100% |

### Resultado actual

```
Test Files  2 passed (2)
     Tests  71 passed (71)
  Duration  ~225ms

toolMapper.ts    | 95.94% lines | 100% funcs | 76.19% branches
webhookAuth.ts   |       100%   |      100%  |          100%
```

---

## Supabase — Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `workspaces` | Workspaces de clientes (nombre, retell_api_key) |
| `users` | Usuarios con workspace_id y rol |
| `agents` | Agentes creados (retell_agent_id, retell_llm_id, configuration JSON) |
| `phone_numbers` | Números asignados a workspaces y agentes |
| `calls` | Registro de llamadas (post-call analysis) |
| `alert_settings` | Configuración de alertas por workspace |
