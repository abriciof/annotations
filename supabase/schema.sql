create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null,
  color text not null default '#ff7a18',
  icon text not null default 'NotebookPen',
  semester text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subject_settings (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null unique references public.subjects (id) on delete cascade,
  schedule text,
  room text,
  professor text,
  notes text,
  exam_summary text,
  resource_links jsonb not null default '[]'::jsonb,
  important_dates jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  parent_id uuid references public.pages (id) on delete cascade,
  title text not null,
  slug text not null,
  sort_order integer not null default 0,
  content jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_subjects_updated_at on public.subjects;
create trigger set_subjects_updated_at before update on public.subjects for each row execute procedure public.set_updated_at();

drop trigger if exists set_subject_settings_updated_at on public.subject_settings;
create trigger set_subject_settings_updated_at before update on public.subject_settings for each row execute procedure public.set_updated_at();

drop trigger if exists set_pages_updated_at on public.pages;
create trigger set_pages_updated_at before update on public.pages for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.subject_settings enable row level security;
alter table public.pages enable row level security;
alter table public.attachments enable row level security;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;

drop policy if exists "profiles self access" on public.profiles;
drop policy if exists "profiles select own admin row" on public.profiles;
drop policy if exists "profiles insert own row" on public.profiles;
drop policy if exists "profiles update own admin row" on public.profiles;

create policy "profiles select own admin row" on public.profiles
for select
using (id = auth.uid() and public.is_admin_user());

create policy "profiles insert own row" on public.profiles
for insert
with check (
  id = auth.uid()
  and lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
);

create policy "profiles update own admin row" on public.profiles
for update
using (id = auth.uid() and public.is_admin_user())
with check (id = auth.uid());

drop policy if exists "subjects admin access" on public.subjects;
create policy "subjects admin access" on public.subjects
for all
using (user_id = auth.uid() and public.is_admin_user())
with check (user_id = auth.uid() and public.is_admin_user());

drop policy if exists "settings via subject owner" on public.subject_settings;
create policy "settings via subject owner" on public.subject_settings
for all
using (
  exists (
    select 1 from public.subjects
    where subjects.id = subject_settings.subject_id
      and subjects.user_id = auth.uid()
      and public.is_admin_user()
  )
)
with check (
  exists (
    select 1 from public.subjects
    where subjects.id = subject_settings.subject_id
      and subjects.user_id = auth.uid()
      and public.is_admin_user()
  )
);

drop policy if exists "pages via subject owner" on public.pages;
create policy "pages via subject owner" on public.pages
for all
using (
  exists (
    select 1 from public.subjects
    where subjects.id = pages.subject_id
      and subjects.user_id = auth.uid()
      and public.is_admin_user()
  )
)
with check (
  exists (
    select 1 from public.subjects
    where subjects.id = pages.subject_id
      and subjects.user_id = auth.uid()
      and public.is_admin_user()
  )
);

drop policy if exists "attachments via subject owner" on public.attachments;
create policy "attachments via subject owner" on public.attachments
for all
using (
  exists (
    select 1 from public.subjects
    where subjects.id = attachments.subject_id
      and subjects.user_id = auth.uid()
      and public.is_admin_user()
  )
)
with check (
  exists (
    select 1 from public.subjects
    where subjects.id = attachments.subject_id
      and subjects.user_id = auth.uid()
      and public.is_admin_user()
  )
);

insert into storage.buckets (id, name, public)
values ('study-assets', 'study-assets', false)
on conflict (id) do nothing;

drop policy if exists "admin storage access" on storage.objects;
create policy "admin storage access" on storage.objects
for all
using (
  bucket_id = 'study-assets'
  and auth.uid() is not null
  and exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_admin = true
  )
)
with check (
  bucket_id = 'study-assets'
  and auth.uid() is not null
  and exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_admin = true
  )
);

