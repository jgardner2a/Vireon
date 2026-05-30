-- Vireon: atomic export entitlement consumption (server-side)
-- Run in Supabase Dashboard → SQL Editor AFTER 002_profile_export_entitlements.sql
--
-- These functions are called by the app via service role (admin client).
-- They replace read-modify-write in the API with a single atomic UPDATE.

-- ---------------------------------------------------------------------------
-- 1. Decrement one purchased export credit (returns new balance, or NULL)
-- ---------------------------------------------------------------------------

create or replace function public.consume_export_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_credits integer;
begin
  update public.profiles
  set export_credits = export_credits - 1
  where id = p_user_id
    and export_credits > 0
  returning export_credits into new_credits;

  if not found then
    return null;
  end if;

  return new_credits;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Mark Pro included annual export as used (returns true if row updated)
-- ---------------------------------------------------------------------------

create or replace function public.consume_pro_included_export(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set pro_included_export_used = true
  where id = p_user_id
    and plan = 'pro'
    and pro_included_export_used = false;

  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Lock down execution to service role only
-- ---------------------------------------------------------------------------

revoke all on function public.consume_export_credit(uuid) from public;
revoke all on function public.consume_pro_included_export(uuid) from public;

grant execute on function public.consume_export_credit(uuid) to service_role;
grant execute on function public.consume_pro_included_export(uuid) to service_role;

notify pgrst, 'reload schema';
