-- Vireon: API grants for billing tables
-- Run in Supabase Dashboard → SQL Editor if profile reads fail from the app
-- but manual SQL queries work in the SQL editor.
--
-- authenticated: browser session (Settings, dashboard plan)
-- service_role: server API routes (e.g. consume-export)

grant select, insert, delete on table public.profiles to authenticated;
grant select on table public.subscriptions to authenticated;

grant select, update on table public.profiles to service_role;
grant select on table public.subscriptions to service_role;

-- Reload PostgREST schema cache (helps after DDL/grant changes)
notify pgrst, 'reload schema';