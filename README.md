# Vireon (auth-only)

Minimal Next.js app with Supabase Authentication.

## Features

- Sign up / sign in / sign out
- Protected `/dashboard` placeholder
- Global header and layout shell

## Scope

Auth only — no app database schema, migrations, or RLS in this repo. Supabase is used for **Authentication** only.

## Setup

1. Copy `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. `npm install`
3. `npm run dev`

## Routes

| Path | Description |
|------|-------------|
| `/` | Public home |
| `/login` | Sign in / create account |
| `/dashboard` | Protected stub (requires session) |
