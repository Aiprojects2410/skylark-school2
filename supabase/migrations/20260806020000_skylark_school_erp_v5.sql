-- Skylark School ERP v5.0 — seed classes (Nursery to 12th) with sections A/B/C, auto admission number.
-- Run AFTER v4 migration.

-- 1) Seed classes (skip any that already exist by name).
insert into public.classes (name, academic_year)
select name, '2026-27' from (values
  ('Nursery'), ('LKG'), ('UKG'),
  ('Class 1'), ('Class 2'), ('Class 3'), ('Class 4'), ('Class 5'),
  ('Class 6'), ('Class 7'), ('Class 8'), ('Class 9'), ('Class 10'), ('Class 11'), ('Class 12')
) as seed(name)
where not exists (select 1 from public.classes c where c.name = seed.name);

-- 2) Seed sections A, B, C for every class that doesn't have sections yet.
insert into public.sections (class_id, name)
select c.id, s.name
from public.classes c
cross join (values ('A'), ('B'), ('C')) as s(name)
where not exists (select 1 from public.sections sec where sec.class_id = c.id and sec.name = s.name);

-- 3) Auto-generate Admission Number the same way as Student ID.
create sequence if not exists public.admission_number_seq;

create or replace function public.generate_admission_number() returns trigger
language plpgsql as $$
begin
  if new.admission_number is null or btrim(new.admission_number) = '' then
    new.admission_number := 'ADM-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.admission_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_generate_admission_number on public.students;
create trigger trg_generate_admission_number before insert on public.students
  for each row execute function public.generate_admission_number();

select setval('public.admission_number_seq', greatest(1, coalesce((
  select max(substring(admission_number from '\d+$')::int) from public.students where admission_number ~ '^ADM-\d{4}-\d+$'
), 0)), true);
