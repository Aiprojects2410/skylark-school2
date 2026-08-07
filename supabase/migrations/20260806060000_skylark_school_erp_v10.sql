-- Skylark School ERP v10.0 — teachers need their own full_name (previously only came from a
-- linked profile, which didn't exist until a login was created — so new teachers showed no name
-- and there was no way to create a teacher login at all).

alter table public.teachers
  add column if not exists full_name text not null default 'Unnamed Teacher',
  add column if not exists login_enabled boolean not null default true;

alter table public.teachers alter column full_name drop default;
