-- Vireon: track document file sizes for Pro storage accounting
-- Run in Supabase Dashboard → SQL Editor after prior billing scripts.

alter table public.documents
add column if not exists file_size bigint not null default 0
check (file_size >= 0);

comment on column public.documents.file_size is
  'Byte size of the file in the documents bucket; counts toward Pro storage limit.';
