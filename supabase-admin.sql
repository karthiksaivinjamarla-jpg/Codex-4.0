-- CODEX 4.0 ADMIN SETUP
-- Run this in Supabase SQL Editor.
-- After signing in with your Google admin account, insert that account's auth.users id below.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "Admins can view their own admin record" on public.admin_users;
create policy "Admins can view their own admin record"
on public.admin_users
for select
to authenticated
using (user_id = (select auth.uid()));

-- Registration access for admins.
drop policy if exists "Admins can view all registrations" on public.registrations;
create policy "Admins can view all registrations"
on public.registrations
for select
to authenticated
using (
  exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
      and a.is_active = true
  )
);

drop policy if exists "Admins can update registration status" on public.registrations;
create policy "Admins can update registration status"
on public.registrations
for update
to authenticated
using (
  exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
      and a.is_active = true
  )
)
with check (
  exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
      and a.is_active = true
  )
);

-- Admins can open payment receipts through signed URLs.
drop policy if exists "Admins can view all registration receipts" on storage.objects;
create policy "Admins can view all registration receipts"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'registration-receipts'
  and exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
      and a.is_active = true
  )
);

-- BOOTSTRAP EXAMPLE:
-- Replace both values with the Google account you want to make an admin.
-- The user_id must be copied from Supabase Authentication > Users.
--
-- insert into public.admin_users (user_id, email)
-- values ('YOUR-AUTH-USER-UUID', 'your-admin-email@example.com')
-- on conflict (user_id) do update
-- set email = excluded.email, is_active = true;
