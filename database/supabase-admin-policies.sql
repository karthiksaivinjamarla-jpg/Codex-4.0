-- CODEX 4.0 ADMIN RLS SETUP
-- Run this once in Supabase SQL Editor.
-- This does NOT change or delete registration data.

-- Allow an authenticated admin to verify only their own admin_users row.
drop policy if exists "Admins can view their own admin record" on public.admin_users;
create policy "Admins can view their own admin record"
on public.admin_users
for select
to authenticated
using (auth.uid() = user_id);

-- Allow admins to view every registration.
drop policy if exists "Admins can view all registrations" on public.registrations;
create policy "Admins can view all registrations"
on public.registrations
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

-- Allow admins to change registration status.
drop policy if exists "Admins can update registrations" on public.registrations;
create policy "Admins can update registrations"
on public.registrations
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);
