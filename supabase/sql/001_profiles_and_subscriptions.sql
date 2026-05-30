-- Vireon: profiles + subscriptions schema
-- Run in Supabase Dashboard → SQL Editor (review before running on production).
--
-- WARNING: DROP TABLE public.profiles removes all existing profile rows.
-- Existing auth users are backfilled at the end with plan = 'free'.

-- ---------------------------------------------------------------------------
-- 1. Drop subscriptions first (depends on profiles), then recreate profiles
-- ---------------------------------------------------------------------------

drop table if exists public.subscriptions;

drop table if exists public.profiles cascade;

-- ---------------------------------------------------------------------------
-- 2. profiles — entitlements (what the app checks for limits)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  storage_bytes_used bigint not null default 0 check (storage_bytes_used >= 0),
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_plan_idx on public.profiles (plan);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

-- ---------------------------------------------------------------------------
-- 3. subscriptions — billing state (Pro only; Free users have no row)
-- ---------------------------------------------------------------------------

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan text not null default 'pro' check (plan = 'pro'),
  status text not null check (
    status in (
      'active',
      'trialing',
      'past_due',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'unpaid'
    )
  ),
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_status_idx on public.subscriptions (status);

create or replace function public.set_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_subscriptions_updated_at();

-- One active Pro subscription row per user (partial unique index)
create unique index subscriptions_one_active_pro_per_user
on public.subscriptions (user_id)
where status in ('active', 'trialing', 'past_due');

-- ---------------------------------------------------------------------------
-- 4. Auto-create Free profile on sign-up
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, plan)
  values (new.id, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

-- ---------------------------------------------------------------------------
-- 5. Backfill profiles for existing auth users
-- ---------------------------------------------------------------------------

insert into public.profiles (id, plan)
select id, 'free'
from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

-- profiles: users read own row; insert own row (client fallback); delete own row
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using (id = auth.uid());

-- profiles UPDATE intentionally omitted for authenticated users.
-- Plan changes go through service role (Stripe webhooks / admin API).
-- Client code uses SELECT + INSERT (not upsert) so UPDATE policy is not required.

-- Optional: allow authenticated upsert fallback (uncomment if you switch back to upsert)
-- create policy "profiles_update_own"
-- on public.profiles
-- for update
-- to authenticated
-- using (id = auth.uid())
-- with check (id = auth.uid());

-- subscriptions: users read own billing row only
create policy "subscriptions_select_own"
on public.subscriptions
for select
to authenticated
using (user_id = auth.uid());

-- subscriptions INSERT/UPDATE/DELETE: service role only (no policies for authenticated)

-- ---------------------------------------------------------------------------
-- 7. API grants (required for supabase-js / PostgREST reads from the app)
-- ---------------------------------------------------------------------------

grant select, insert, delete on table public.profiles to authenticated;
grant select on table public.subscriptions to authenticated;

notify pgrst, 'reload schema';
