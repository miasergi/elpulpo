# 🐙 El Pulpo

Predicciones de fútbol con amigos. Crea grupos, predice los resultados del **Mundial 2026** y compite por el ranking. Un homenaje a Paul, el pulpo que lo predijo todo en 2010.

Construido con **Next.js 16 · React 19 · Tailwind v4 · Supabase**. PWA instalable, mobile-first.

---

## ✨ Funcionalidades

- **Predicciones** de marcador exacto con puntuación configurable (exacto / diferencia de goles / 1X2).
- **Grupos privados** con código de invitación, chat en tiempo real y ranking en vivo.
- **Bonus del torneo**: campeón, subcampeón, máximo goleador…
- **Auth** por email/contraseña y Google.
- **Datos del Mundial 2026** sincronizados automáticamente desde API-Football, con panel de administración para correcciones manuales.
- **Notificaciones push** y soporte PWA (instalable en el móvil).

---

## 🚀 Puesta en marcha (local)

### 1. Crea un proyecto en Supabase

1. Entra en [supabase.com](https://supabase.com) → **New project** (plan gratis).
2. En **SQL Editor**, ejecuta en orden:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_standings_and_rls.sql`
   - `supabase/seed.sql` (datos de ejemplo del Mundial 2026)
3. En **Authentication → Providers**, activa **Email** y, si quieres, **Google** (necesitarás un OAuth client de Google Cloud; añade `https://TU-PROYECTO.supabase.co/auth/v1/callback` como redirect URI).
4. En **Project Settings → API** copia la `Project URL`, la `anon key` y la `service_role key`.

### 2. Configura las variables de entorno

```bash
cp .env.example .env.local
```

Rellena `.env.local`:

| Variable | Dónde |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem |
| `SUPABASE_SERVICE_ROLE_KEY` | idem (¡secreta!) |
| `ADMIN_EMAILS` | Tu email, para acceder a `/admin` (separa varios con comas) |
| `API_FOOTBALL_KEY` | [api-football.com](https://www.api-football.com/) (opcional al inicio) |
| `CRON_SECRET` | Cualquier cadena larga aleatoria |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` (opcional, para push) |

> Añade `ADMIN_EMAILS=tu@email.com` a `.env.local` para ver el panel `/admin`.

### 3. Arranca

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000), regístrate, crea un grupo y empieza a predecir. 🎉

---

## ⚽ Datos del Mundial 2026

- **Automático**: con `API_FOOTBALL_KEY` configurada, entra en `/admin` y pulsa **Sincronizar ahora**, o deja que el cron lo haga (ver despliegue).
- **Manual**: en `/admin` puedes editar marcadores y estado de cada partido a mano.

El plan gratuito de API-Football limita las peticiones; el sync es idempotente (upsert por `external_id`), así que puedes ejecutarlo cuando quieras.

---

## ☁️ Despliegue (Vercel)

1. Importa el repo en [Vercel](https://vercel.com).
2. Añade las mismas variables de entorno en **Settings → Environment Variables**.
3. El `vercel.json` ya configura un **cron cada 10 min** que llama a `/api/sync` (Vercel inyecta el header `Authorization: Bearer $CRON_SECRET` automáticamente — recuerda definir `CRON_SECRET`).
4. En Supabase → Authentication → URL Configuration, añade tu dominio de producción a **Redirect URLs**.

---

## 🗂️ Estructura

```
src/
  app/
    (auth)/         · login y registro
    app/            · zona privada (dashboard, partidos, grupos, perfil, bonus)
    admin/          · panel de administración
    api/            · sync de fixtures y endpoints admin
    auth/           · callback OAuth y logout
  components/       · UI, marca, partidos, grupos, perfil, admin
  lib/              · supabase, queries, scoring, api-football, sync
supabase/
  migrations/       · esquema + RLS
  seed.sql          · datos de ejemplo
```

---

Hecho con 🐙 para echar unas risas con los amigos.
