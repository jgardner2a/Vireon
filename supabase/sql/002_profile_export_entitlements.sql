-- Vireon: export entitlements on profiles
-- Run in Supabase Dashboard → SQL Editor after 001_profiles_and_subscriptions.sql

alter table public.profiles
add column if not exists export_credits integer not null default 0
check (export_credits >= 0);

alter table public.profiles
add column if not exists pro_included_export_used boolean not null default false;

comment on column public.profiles.export_credits is
  'One-time Evidence Package purchases (Stripe) increment this balance.';

comment on column public.profiles.pro_included_export_used is
  'Pro annual subscription includes one export per billing period; reset via Stripe webhook.';
