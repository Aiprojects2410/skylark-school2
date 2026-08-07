-- Skylark School ERP v6.0 — CRITICAL FIX: is_staff() was checking auth.jwt() -> app_metadata,
-- but roles have only ever been set on public.profiles.role via SQL — app_metadata was never
-- populated. This made is_staff() return false for EVERY user, silently hiding classes,
-- teachers, identity cards, reports, settings, and anything else gated by "staff manage" RLS
-- policies. Fix: is_staff() now reads public.profiles.role directly (security definer so it
-- can bypass the profiles RLS policy safely, read-only, single column).

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid())
      in ('super_admin', 'admin', 'principal', 'teacher'),
    false
  )
$$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;
