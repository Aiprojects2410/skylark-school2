-- Skylark School ERP v2.0 — role expansion, dual login (email or School ID), leave workflow, notice targeting.
-- Run this AFTER 20260805000000_skylark_school_erp.sql

-- 1) Expand role enum to match product spec (super_admin, principal added)
alter type public.app_role add value if not exists 'super_admin';
alter type public.app_role add value if not exists 'principal';

-- 2) Add email + school_id (human-friendly login id, e.g. SKY-STU-2026-0001) to profiles.
--    email is synced from auth.users so the client can resolve School ID -> email without
--    ever exposing the auth.users table directly.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists school_id text;
create unique index if not exists profiles_school_id_key on public.profiles (school_id) where school_id is not null;
create unique index if not exists profiles_email_key on public.profiles (email) where email is not null;

-- 3) Replace handle_new_user so new signups populate email + school_id (school_id passed via
--    raw_user_meta_data ->> 'school_id' at signup time, e.g. by an admin-created account).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, email, school_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'student'),
    new.email,
    new.raw_user_meta_data ->> 'school_id'
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public;

-- 4) RPC: resolve a School ID (e.g. SKY-TCH-2026-0001) to the account email, for the login form.
--    security definer + minimal surface: only returns an email string, never the row itself,
--    and only when a matching profile exists. Safe to expose to anon (needed pre-login).
create or replace function public.resolve_school_id_to_email(school_id_text text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select email from public.profiles where school_id = school_id_text limit 1
$$;
revoke all on function public.resolve_school_id_to_email(text) from public;
grant execute on function public.resolve_school_id_to_email(text) to anon, authenticated;

-- 5) is_staff() should also treat super_admin / principal as staff.
create or replace function public.is_staff() returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') in ('super_admin','admin','principal','teacher'), false)
$$;

-- 6) Leave management (Phase 4)
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  applicant_role public.app_role not null,
  start_date date not null,
  end_date date not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);
alter table public.leave_requests enable row level security;
create policy "own or staff read leave" on public.leave_requests for select to authenticated
  using (applicant_id = (select auth.uid()) or (select public.is_staff()));
create policy "self create leave" on public.leave_requests for insert to authenticated
  with check (applicant_id = (select auth.uid()));
create policy "staff review leave" on public.leave_requests for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- 7) Notice targeting by role (Phase 4) — null target_roles means visible to everyone.
alter table public.notices add column if not exists target_roles public.app_role[];
drop policy if exists "authenticated read notices" on public.notices;
create policy "authenticated read targeted notices" on public.notices for select to authenticated
  using (
    target_roles is null
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = any(public.notices.target_roles)
    )
    or (select public.is_staff())
  );

-- 8) Attendance QR scan log (Phase 3) — every scan event, even duplicates, for an audit trail.
create table if not exists public.attendance_scan_log (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete set null,
  scanned_code text not null,
  scanned_by uuid references public.profiles(id) on delete set null,
  scan_result text not null check (scan_result in ('marked_present','already_marked','not_found')),
  created_at timestamptz not null default now()
);
alter table public.attendance_scan_log enable row level security;
create policy "staff manage scan log" on public.attendance_scan_log for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

grant select, insert, update, delete on public.leave_requests to authenticated;
grant select, insert, update, delete on public.attendance_scan_log to authenticated;
