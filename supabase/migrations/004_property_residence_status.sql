-- Persistent CURRENT / PREVIOUS residence model (one CURRENT per profile).

alter table public.properties
  add column if not exists residence_status text not null default 'current'
  check (residence_status in ('current', 'previous'));

comment on column public.properties.residence_status is
  'current = active rental home; previous = rental history. Exactly one current per profile.';

-- Backfill: keep earliest property per profile as CURRENT, demote the rest.
with ranked as (
  select
    id,
    profile_id,
    row_number() over (
      partition by profile_id
      order by created_at asc, id asc
    ) as rn
  from public.properties
)
update public.properties p
set residence_status = case when ranked.rn = 1 then 'current' else 'previous' end
from ranked
where p.id = ranked.id;

create unique index if not exists properties_one_current_per_profile_idx
  on public.properties (profile_id)
  where (residence_status = 'current');
