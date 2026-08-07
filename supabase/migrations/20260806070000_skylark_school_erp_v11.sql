-- Skylark School ERP v11.0 — CRITICAL FIX: profiles.school_id already existed in this database
-- as a uuid column (pre-dating our migrations, not something we control), so every attempt to
-- write a human-readable code like 'SKY-STU-2026-0002' into it failed with
-- "invalid input syntax for type uuid". This silently broke: login creation (student & teacher),
-- School-ID login on the sign-in page, and Settings showing the code. Fix: use a dedicated
-- text column, login_code, instead of reusing school_id.

alter table public.profiles add column if not exists login_code text;
create unique index if not exists profiles_login_code_key on public.profiles (login_code) where login_code is not null;

-- handle_new_user(): populate login_code from metadata instead of school_id.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, email, login_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'student'),
    new.email,
    new.raw_user_meta_data ->> 'login_code'
  );
  return new;
end;
$$;

-- resolve_school_id_to_email(): same name/signature (frontend already calls this), now reads
-- login_code internally instead of the incompatible school_id column.
create or replace function public.resolve_school_id_to_email(school_id_text text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select email from public.profiles where login_code = school_id_text limit 1
$$;
