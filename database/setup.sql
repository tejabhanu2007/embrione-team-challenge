-- The Embrione challenge database setup.
-- Run the whole script once in Supabase -> SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,
  position text not null,
  srn text not null,
  email text not null,
  linkedin_url text,
  github_url text,
  branch text not null,
  semester integer not null,
  bio text,
  photo_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Prevent accidental duplicate SRNs regardless of letter case.
create unique index if not exists members_srn_lower_unique on public.members (lower(srn));
create index if not exists members_status_created_at_idx on public.members (status, created_at desc);

alter table public.members enable row level security;

-- Public visitors can submit only pending member profiles.
drop policy if exists "Public can submit pending members" on public.members;
create policy "Public can submit pending members"
  on public.members for insert to anon, authenticated
  with check (status = 'pending');

-- Do not add a public SELECT policy on the base table: it contains emails and SRNs.
-- The public /api/team route uses the server key and returns only non-sensitive fields
-- for approved profiles. Do NOT create public UPDATE or DELETE policies either.
drop policy if exists "Public can read approved members" on public.members;

-- Make the public bucket. If it already exists, the duplicate-key exception is ignored.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-photos', 'member-photos', true, 2097152, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may upload a WebP object into this one bucket. The app creates random object names.
drop policy if exists "Public can upload member WebP photos" on storage.objects;
create policy "Public can upload member WebP photos"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'member-photos' and lower(storage.filename(name)) like '%.webp');

-- The bucket is public, so photos can be retrieved through their public URLs.

-- Seed profiles: dummy/demo data only. They are approved so /team is populated on first launch.
insert into public.members
  (name, domain, position, srn, email, linkedin_url, github_url, branch, semester, bio, photo_url, status)
values
  ('Aarav Demo', 'Web Development', 'Head', 'PESDEMO0001', 'aarav.demo@example.com', 'https://www.linkedin.com/', 'https://github.com/', 'CSE', 6, 'Building clean, accessible web experiences and helping the team ship reliable features.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=AaravDemo', 'approved'),
  ('Mira Sample', 'Design', 'Vice-Head', 'PESDEMO0002', 'mira.sample@example.com', 'https://www.linkedin.com/', 'https://github.com/', 'AIML', 5, 'Exploring visual systems, thoughtful interaction design, and consistent product experiences.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=MiraSample', 'approved'),
  ('Kabir Example', 'Logistics', 'Core Member', 'PESDEMO0003', 'kabir.example@example.com', 'https://www.linkedin.com/', 'https://github.com/', 'ECE', 4, 'Enjoys solving operational problems and making events run smoothly behind the scenes.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=KabirExample', 'approved'),
  ('Anaya Test', 'Operations', 'Core Member', 'PESDEMO0004', 'anaya.test@example.com', 'https://www.linkedin.com/', 'https://github.com/', 'CSE', 3, 'Focused on clear communication, team coordination, and turning plans into action.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=AnayaTest', 'approved'),
  ('Vihaan Placeholder', 'Social Media', 'Member', 'PESDEMO0005', 'vihaan.placeholder@example.com', 'https://www.linkedin.com/', 'https://github.com/', 'EEE', 2, 'Creating short-form updates and finding useful ways to share what the community builds.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=VihaanPlaceholder', 'approved'),
  ('Isha Fiction', 'Event Management', 'Member', 'PESDEMO0006', 'isha.fiction@example.com', 'https://www.linkedin.com/', 'https://github.com/', 'Biotech', 4, 'Likes bringing people together and making student events welcoming and memorable.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=IshaFiction', 'approved')
on conflict do nothing;
