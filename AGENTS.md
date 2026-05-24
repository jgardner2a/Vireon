# Vireon (auth-only build)

Minimal Next.js app: Supabase Auth (sign up / sign in / sign out) and a protected Dashboard shell.

## Do not touch the database

- Backend is wiped and **not** being rebuilt yet.
- **No** Supabase migrations, RLS policies, tables, or `supabase.from()` data access.
- **Only** maintain auth (`supabase.auth.*`) and the UI shell unless explicitly asked otherwise.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
