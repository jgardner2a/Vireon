-- Vireon core renter schema (single source of truth)
-- Apply in Supabase SQL editor before using the app.

create extension if not exists "pgcrypto";

-- Profiles (tenant scope; auth email session maps here)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  properties_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  address text not null,
  created_at timestamptz not null default now()
);

create index if not exists properties_profile_id_idx on public.properties(profile_id);

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  title text not null,
  description text not null,
  status text not null default 'Open',
  created_at timestamptz not null default now()
);

create index if not exists issues_profile_id_idx on public.issues(profile_id);
create index if not exists issues_property_id_idx on public.issues(property_id);

create table if not exists public.gallery_folders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  folder_type text not null default 'user' check (folder_type in ('system', 'user')),
  created_at timestamptz not null default now()
);

create index if not exists gallery_folders_property_id_idx on public.gallery_folders(property_id);

create table if not exists public.gallery_media (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  folder_id uuid not null references public.gallery_folders(id) on delete cascade,
  name text not null,
  mime_type text not null,
  media_type text not null check (media_type in ('image', 'video')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists gallery_media_folder_id_idx on public.gallery_media(folder_id);
create index if not exists gallery_media_property_id_idx on public.gallery_media(property_id);

create table if not exists public.evidence_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null check (source_type in ('media', 'folder', 'document')),
  source_id uuid not null,
  target_type text not null check (target_type in ('issue', 'incident', 'maintenance', 'lease')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (profile_id, source_type, source_id)
);

create index if not exists evidence_links_target_idx
  on public.evidence_links(profile_id, target_type, target_id);

create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  unique (property_id)
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  title text not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  file_name text,
  mime_type text,
  storage_path text,
  created_at timestamptz not null default now()
);

-- RLS: enable and scope by profile (service role bypasses; anon uses policies)
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.issues enable row level security;
alter table public.gallery_folders enable row level security;
alter table public.gallery_media enable row level security;
alter table public.evidence_links enable row level security;
alter table public.leases enable row level security;
alter table public.incidents enable row level security;
alter table public.documents enable row level security;

-- Development-friendly policies (tighten with Supabase Auth JWT claims in production)
create policy "profiles_select_own" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (true);
create policy "profiles_update" on public.profiles for update using (true);

create policy "properties_all" on public.properties for all using (true) with check (true);
create policy "issues_all" on public.issues for all using (true) with check (true);
create policy "gallery_folders_all" on public.gallery_folders for all using (true) with check (true);
create policy "gallery_media_all" on public.gallery_media for all using (true) with check (true);
create policy "evidence_links_all" on public.evidence_links for all using (true) with check (true);
create policy "leases_all" on public.leases for all using (true) with check (true);
create policy "incidents_all" on public.incidents for all using (true) with check (true);
create policy "documents_all" on public.documents for all using (true) with check (true);
