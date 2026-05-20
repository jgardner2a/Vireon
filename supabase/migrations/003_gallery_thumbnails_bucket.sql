-- Storage bucket for WebP gallery thumbnails (separate from `gallery` originals).
insert into storage.buckets (id, name, public)
values ('gallery-thumbnails', 'gallery-thumbnails', true)
on conflict (id) do nothing;
