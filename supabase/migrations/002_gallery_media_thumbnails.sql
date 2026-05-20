-- Thumbnail metadata for gallery_media (optional; existing rows remain valid).
alter table public.gallery_media
  add column if not exists thumbnail_path text,
  add column if not exists has_thumbnail boolean not null default false;

create index if not exists gallery_media_has_thumbnail_idx
  on public.gallery_media (has_thumbnail);
