# Guía de despliegue — La Fábrica de Agentes

Sigue los pasos **en este orden exacto**. Si te saltas alguno o lo haces en otro orden, el proyecto no funcionará correctamente.

---

## Requisitos previos

- Cuenta en [GitHub](https://github.com) con acceso al repositorio
- Cuenta en [Supabase](https://supabase.com) (plan Free o superior)
- Cuenta en [Vercel](https://vercel.com) conectada a tu GitHub — **plan Pro obligatorio** (ver sección Vercel Functions más abajo)
- Cuenta en [OpenAI](https://platform.openai.com) para la API Key (necesaria para el webhook inbound de disponibilidad)

---

## Paso 1 — Supabase: crear el proyecto

1. En [supabase.com/dashboard](https://supabase.com/dashboard), crea un nuevo proyecto.
2. Anota estos tres valores (los necesitarás en el Paso 3):
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (mantenla privada — nunca en el frontend)

---

## Paso 2 — Supabase: ejecutar las migraciones SQL

Ve a **SQL Editor** en tu proyecto de Supabase y ejecuta los siguientes ficheros **en este orden**. Están en la carpeta `migrations/` del repositorio.

| Orden | Fichero | Qué hace |
|---|---|---|
| 1 | `20260411_assign_free_workspace_rpc.sql` | RPC atómica para asignar workspaces |
| 2 | `20260411_idempotency_keys.sql` | Tabla para evitar reservas duplicadas |
| 3 | `20260411_rate_limit.sql` | Tabla + RPC de rate limiting |
| 4 | `20260411_rls_data_tables.sql` | Activa RLS en tablas de datos |
| 5 | `20260411_rls_authenticated_select_policies.sql` | Políticas SELECT para el dashboard |
| 6 | `20260411_cleanup_function.sql` | Función de limpieza de expirados |
| 7 | `20260411_webhook_logs_index_and_cleanup.sql` | Índice en webhook_logs |

> **Importante**: el paso 4 debe ejecutarse antes del 5. Si el 5 falla porque las tablas no existen, es que te has saltado el 4.

---

## Paso 3 — Vercel: importar el repositorio

1. En [vercel.com/new](https://vercel.com/new), importa el repositorio de GitHub.
2. Vercel detectará automáticamente que es un proyecto **Next.js**. No cambies ninguna configuración de build.
3. **Antes de hacer el primer deploy**, ve a **Settings → Environment Variables** y añade todas las variables de la tabla siguiente:

| Variable | Obligatoria | Dónde se obtiene |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Supabase → Project Settings → API (servicio, privada) |
| `NEXT_PUBLIC_SITE_URL` | Sí | La URL de tu deploy en Vercel, ej. `https://fabrica.tudominio.com`. Si usas dominio personalizado, ponlo aquí. Si aún no lo tienes, pon la URL `*.vercel.app` que Vercel asigna. |
| `OPENAI_API_KEY` | Sí (Cal.com) | platform.openai.com → API Keys |
| `CRON_SECRET` | Sí | Genera una cadena aleatoria segura, ej. con `openssl rand -base64 32`. **Guárdala**, la necesitarás si depuras el cron. |
| `FACTORY_CALCOM_SECRET` | Opcional | Cadena aleatoria para proteger endpoints Cal.com |
| `RESEND_API_KEY` | Opcional | resend.com → API Keys (para emails de alerta) |

> **Atención con `NEXT_PUBLIC_SITE_URL`**: esta variable construye las URLs de webhook que se envían a Retell. Si está vacía o incorrecta, los webhooks post-llamada no llegarán nunca. Compruébala antes de crear el primer agente.

4. Una vez configuradas las variables, haz el deploy.

---

## Paso 4 — Verificar que el deploy funciona

Abre en el navegador:

```
https://tu-dominio.vercel.app/api/health
```

Debe devolver:

```json
{ "status": "ok" }
```

Si devuelve `"status": "degraded"`, revisa los logs de Vercel — casi siempre es una variable de entorno incorrecta o el Supabase no responde.

---

## Paso 5 — Verificar el cron job

El cron de limpieza (`GET /api/cron/cleanup`) se configura automáticamente en Vercel desde `vercel.json` (se ejecuta cada hora). Para verificar que funciona:

1. En Vercel → tu proyecto → **Cron Jobs**, deberías ver `/api/cron/cleanup` con schedule `0 * * * *`.
2. Si no aparece, asegúrate de que el plan de Vercel soporta cron jobs (requiere plan Pro o superior en algunos casos).

---

## Paso 6 — Primer acceso y configuración inicial

1. Accede a la app y regístrate con el email de administrador.
2. Ve al **panel Admin → Workspaces** y crea el primer workspace para el cliente.
3. En el workspace, introduce la **Retell API Key** del cliente (se obtiene en [app.retell.ai](https://app.retell.ai) → API Keys).
4. Si el cliente usa voces ElevenLabs (Carolina, MariCarmen, Sara Martin), usa el botón de importar voces en Admin → Workspaces para importarlas al workspace de Retell del cliente.
5. Ya puede entrar el cliente y crear su primer agente desde el wizard.

---

## Qué NO hacer

- **No ejecutes las migraciones SQL en orden distinto** — la migración de RLS policies (paso 5) depende de que las tablas existan (paso 4).
- **No pongas la `service_role key` de Supabase en ninguna variable `NEXT_PUBLIC_*`** — esa clave bypasa toda la seguridad. Solo en `SUPABASE_SERVICE_ROLE_KEY`.
- **No cambies `NEXT_PUBLIC_SITE_URL` después de crear agentes** — las URLs de webhook almacenadas en Retell quedarán obsoletas. Si la cambias, tendrás que re-guardar todos los agentes desde el wizard para que se actualicen.
- **No borres las tablas de Supabase** manualmente — usa siempre las migraciones para cambios de esquema.
- **No modifiques `vercel.json`** sin entender el impacto — el cron job de limpieza necesita ese fichero exactamente como está.

---

## Vercel Functions — por qué se necesita plan Pro

Las rutas `/api/...` de Next.js se despliegan automáticamente como **Vercel Serverless Functions** — no hay nada que configurar manualmente. Sin embargo, hay 6 rutas críticas que declaran `maxDuration = 60`:

| Ruta | Por qué necesita 60s |
|---|---|
| `POST /api/retell/agent` | Crea agente + LLM + sincroniza teléfonos en Retell |
| `PATCH /api/retell/agent` | Actualiza agente + LLM + sincroniza teléfonos en Retell |
| `POST /api/retell/webhook/inbound` | Llama a Cal.com + 2 llamadas paralelas a OpenAI |
| `POST /api/retell/knowledge-base` | Upload de fichero a Retell KB |
| `POST /api/retell/voices/import` | Importa voces ElevenLabs a Retell |
| `POST /api/retell/voices/import-defaults` | Importa voces por defecto al workspace |

**En el plan Hobby de Vercel el límite es 10 segundos.** Estas rutas superan ese límite con frecuencia y devolverían un error 504 (Gateway Timeout) al cliente. El plan Pro eleva el límite a 60 segundos, que es lo que estas rutas declaran.

El **cron job** (`/api/cron/cleanup`) también requiere plan Pro o superior en Vercel para estar disponible.

> Resumen: con plan Hobby el proyecto arranca pero falla al crear/actualizar agentes, subir KB e importar voces. **Plan Pro es obligatorio para uso en producción.**

---

## Checklist de entrega

Antes de dar acceso al cliente, verifica:

- [ ] `GET /api/health` devuelve `{ "status": "ok" }`
- [ ] Las 7 migraciones SQL están ejecutadas en Supabase
- [ ] `NEXT_PUBLIC_SITE_URL` apunta a la URL correcta del deploy
- [ ] `OPENAI_API_KEY` está configurada (sin ella, el agente no tendrá disponibilidad de agenda al contestar)
- [ ] `CRON_SECRET` está configurada y el cron aparece en Vercel
- [ ] Al menos un workspace creado con la Retell API Key del cliente
- [ ] Se ha creado un agente de prueba y completado una llamada de test

---

## Diagrama de dependencias del stack

```
GitHub repo
    └── Vercel (Next.js 14, App Router)
            ├── Supabase (PostgreSQL + Auth + RLS)
            │       └── Tablas: workspaces, agents, calls, phone_numbers,
            │                   rate_limit_windows, idempotency_keys,
            │                   webhook_logs, alert_settings
            ├── Retell AI (voz, LLM, webhooks)
            │       └── API Key por workspace (en Supabase, no en .env)
            ├── Cal.com (agenda) — API Key por agente (en agents.configuration)
            └── OpenAI (disponibilidad en lenguaje natural — webhook inbound)
```
