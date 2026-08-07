-- Skylark School ERP v4.0 — auto-generated Student ID / Employee ID (no manual entry needed).
-- Run AFTER v3 migration.

create sequence if not exists public.student_id_seq;
create sequence if not exists public.teacher_id_seq;

create or replace function public.generate_student_id() returns trigger
language plpgsql as $$
begin
  if new.student_id is null or btrim(new.student_id) = '' then
    new.student_id := 'SKY-STU-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.student_id_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_generate_student_id on public.students;
create trigger trg_generate_student_id before insert on public.students
  for each row execute function public.generate_student_id();

create or replace function public.generate_teacher_id() returns trigger
language plpgsql as $$
begin
  if new.employee_id is null or btrim(new.employee_id) = '' then
    new.employee_id := 'SKY-TCH-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.teacher_id_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_generate_teacher_id on public.teachers;
create trigger trg_generate_teacher_id before insert on public.teachers
  for each row execute function public.generate_teacher_id();

-- Keep sequences ahead of any IDs already in use (safe to run even on a fresh DB).
select setval('public.student_id_seq', greatest(1, coalesce((
  select max(substring(student_id from '\d+$')::int) from public.students where student_id ~ '^SKY-STU-\d{4}-\d+$'
), 0)), true);
select setval('public.teacher_id_seq', greatest(1, coalesce((
  select max(substring(employee_id from '\d+$')::int) from public.teachers where employee_id ~ '^SKY-TCH-\d{4}-\d+$'
), 0)), true);
