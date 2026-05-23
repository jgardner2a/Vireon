-- Property membership: users connect to properties through property_members.
-- properties.user_id remains for legacy transition (do not drop yet).

alter table public.properties
  add column if not exists user_id uuid references auth.users (id) on delete set null;

comment on column public.properties.user_id is
  'LEGACY ownership column. New code must scope via property_members.user_id.';

create table if not exists public.property_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, property_id)
);

create index if not exists property_members_user_id_idx
  on public.property_members (user_id);

create index if not exists property_members_property_id_idx
  on public.property_members (property_id);

create unique index if not exists property_members_one_current_per_user_idx
  on public.property_members (user_id)
  where (is_current = true);

comment on table public.property_members is
  'Membership-based property access. Source of truth for user ↔ property (replaces direct properties.user_id).';

-- Backfill memberships from legacy property rows (user_id or profile_id as auth user id).
insert into public.property_members (user_id, property_id, is_current)
select
  coalesce(p.user_id, p.profile_id) as user_id,
  p.id as property_id,
  (p.residence_status = 'current') as is_current
from public.properties p
where coalesce(p.user_id, p.profile_id) is not null
on conflict (user_id, property_id) do nothing;

-- Atomic current-property switch (membership path).
create or replace function public.set_current_property_member(
  p_user_id uuid,
  p_property_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if p_user_id is null or p_property_id is null then
    raise exception 'user_id and property_id are required';
  end if;

  update public.property_members
  set is_current = false
  where user_id = p_user_id;

  update public.property_members
  set is_current = true
  where user_id = p_user_id
    and property_id = p_property_id;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'property membership not found for user % and property %', p_user_id, p_property_id;
  end if;
end;
$$;

alter table public.property_members enable row level security;

create policy "property_members_all" on public.property_members
  for all
  using (true)
  with check (true);
