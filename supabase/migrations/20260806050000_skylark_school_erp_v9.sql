-- Skylark School ERP v9.0 — extended student identity fields + login enable/disable flag.
-- Aadhaar/PEN/APAAR are sensitive: kept on the students row (already staff-only via RLS),
-- but never selected by the frontend for non-staff roles (enforced in services/students.js).

alter table public.students
  add column if not exists gender text check (gender in ('male','female','other')),
  add column if not exists date_of_birth date,
  add column if not exists blood_group text,
  add column if not exists father_name text,
  add column if not exists mother_name text,
  add column if not exists pen_number text,
  add column if not exists apaar_id text,
  add column if not exists aadhaar_number text,
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists login_enabled boolean not null default true;

create index if not exists students_pen_number_idx on public.students (pen_number) where pen_number is not null;
create index if not exists students_apaar_id_idx on public.students (apaar_id) where apaar_id is not null;
create unique index if not exists students_auth_user_id_key on public.students (auth_user_id) where auth_user_id is not null;

-- Student can read (only) their own row now that students can log in directly.
drop policy if exists "student reads own row" on public.students;
create policy "student reads own row" on public.students for select to authenticated
  using (auth_user_id = (select auth.uid()));
-- Aadhaar masking helper — full number only for super_admin/admin/principal; others see masked.
create or replace function public.mask_aadhaar(full_number text) returns text
language sql immutable as $$
  select case when full_number is null or length(full_number) < 4 then full_number
    else repeat('X', length(full_number) - 4) || right(full_number, 4) end
$$;
