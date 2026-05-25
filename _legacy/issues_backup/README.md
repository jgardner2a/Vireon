# Legacy Issues module (archived)

**Replaced by:** Maintenance Logs (`lib/maintenance/`, `/dashboard/maintenance`, table `maintenance_logs`)

Archived on repository cleanup. Do not import from active app code.

## Contents

- `lib/` — former `lib/issues/` (config, types, Supabase `issues` table client)
- `app/dashboard/issues/issues.css` — former Issues page styles

## Active app behavior

- `/dashboard/maintenance` — Maintenance Logs (sole feature route)
- Sidebar — **Maintenance** → `/dashboard/maintenance`
- `/dashboard/issues` — removed (no redirect)

Restore files from this folder only if rolling back the migration.
