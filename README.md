# Vireon

Property workspace for renters: one active home at a time, with maintenance logs, notes, communications, a photo gallery, and private document storage.

Built with **Next.js** (App Router) and **Supabase** (Auth, Postgres, Storage). The app runs in the browser with the anon key; **row-level security and storage policies** in your Supabase project protect data.

## Features

- Sign up / sign in / sign out
- Multiple properties per user; active property via `user_state`
- **My Home** — property details and typed documents (lease, insurance, etc.)
- **Gallery** — home photos; optional link to evidence logs
- **Maintenance**, **Notes**, **Communications** — evidence logs with image attachments (stored in Gallery + `attachments`)
- Dashboard metrics and property history

## Setup

1. Create `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

2. `npm install`
3. `npm run dev`

Schema, RLS, and storage policies are managed in **Supabase**, not in this repository. See `AGENTS.md` for what agents should and should not change.

## Routes

| Path | Description |
|------|-------------|
| `/` | Public home |
| `/login` | Sign in / create account |
| `/dashboard` | Overview (requires session) |
| `/dashboard/my-home` | Active property and documents |
| `/dashboard/gallery` | Photo gallery |
| `/dashboard/maintenance` | Maintenance logs |
| `/dashboard/notes` | Notes |
| `/dashboard/communications` | Communications |
| `/dashboard/vault` | Placeholder |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run lint:home-contract` | Dev check for direct `user_state` reads |

## Architecture (three domains)

1. **Gallery** — `uploads` bucket + `gallery` / `folders` (photos; optional link to logs).
2. **Evidence logs** — maintenance, notes, communications + `attachments`; log images also live in `gallery`.
3. **Documents** — `documents` bucket + `documents` table (My Home only; not in Gallery).

Details and agent rules: **`AGENTS.md`**.
