-- Skylark School ERP v3.0 — secure QR identity, storage, parent module, homework, timetable, teacher self-attendance.
-- Run AFTER v2 migration.

-- 0) Teacher photo (students already has photo_url; teachers didn't).
alter table public.teachers add column if not exists photo_url text;

-- 1) SECURE QR TOKENS — never expose readable IDs in a scannable QR. Each person gets an opaque,
--    regenerable token. The physical card encodes qr_token, never student_id/employee_id.
alter table public.students add column if not exists qr_token uuid not null default gen_random_uuid();
alter table public.teachers add column if not exists qr_token uuid not null default gen_random_uuid();
create unique index if not exists students_qr_token_key on public.students (qr_token);
create unique index if not exists teachers_qr_token_key on public.teachers (qr_token);

-- Regenerate a token (deactivates the old physical card instantly).
create or replace function public.regenerate_qr_token(person_table text, person_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_token uuid := gen_random_uuid();
begin
  if not (select public.is_staff()) then raise exception 'Only staff can regenerate QR tokens'; end if;
  if person_table = 'students' then update public.students set qr_token = new_token where id = person_id;
  elsif person_table = 'teachers' then update public.teachers set qr_token = new_token where id = person_id;
  else raise exception 'Invalid table'; end if;
  return new_token;
end; $$;
revoke all on function public.regenerate_qr_token(text, uuid) from public;
grant execute on function public.regenerate_qr_token(text, uuid) to authenticated;

-- Server-side scan verification: token in -> attendance marked, WITHOUT ever trusting the client's
-- claim of who the token belongs to. Prevents duplicate marks for the same day.
create or replace function public.verify_and_mark_attendance(token uuid, marked_by uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s record; t record; today date := current_date; already boolean;
begin
  if not (select public.is_staff()) then raise exception 'Only staff can scan attendance'; end if;

  select id, full_name into s from public.students where qr_token = token;
  if found then
    select exists(select 1 from public.attendance where student_id = s.id and attendance_date = today) into already;
    if already then
      insert into public.attendance_scan_log (student_id, scanned_code, scanned_by, scan_result) values (s.id, token::text, marked_by, 'already_marked');
      return jsonb_build_object('result','already_marked','name', s.full_name, 'role','student');
    end if;
    insert into public.attendance (student_id, attendance_date, status) values (s.id, today, 'present');
    insert into public.attendance_scan_log (student_id, scanned_code, scanned_by, scan_result) values (s.id, token::text, marked_by, 'marked_present');
    return jsonb_build_object('result','marked_present','name', s.full_name, 'role','student');
  end if;

  select id, profile_id into t from public.teachers where qr_token = token;
  if found then
    select exists(select 1 from public.teacher_attendance where teacher_id = t.id and attendance_date = today) into already;
    if already then return jsonb_build_object('result','already_marked','role','teacher'); end if;
    insert into public.teacher_attendance (teacher_id, attendance_date, status) values (t.id, today, 'present');
    return jsonb_build_object('result','marked_present','role','teacher');
  end if;

  insert into public.attendance_scan_log (scanned_code, scanned_by, scan_result) values (token::text, marked_by, 'not_found');
  return jsonb_build_object('result','not_found');
end; $$;
revoke all on function public.verify_and_mark_attendance(uuid, uuid) from public;
grant execute on function public.verify_and_mark_attendance(uuid, uuid) to authenticated;

-- 2) TEACHER SELF-ATTENDANCE (separate table from student attendance, stays inside main site).
create table if not exists public.teacher_attendance (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  attendance_date date not null default current_date,
  status text not null default 'present' check (status in ('present','absent','late','half_day')),
  marked_at timestamptz not null default now(),
  unique (teacher_id, attendance_date)
);
alter table public.teacher_attendance enable row level security;
create policy "own or staff read teacher attendance" on public.teacher_attendance for select to authenticated
  using (teacher_id in (select id from public.teachers where profile_id = (select auth.uid())) or (select public.is_staff()));
create policy "staff write teacher attendance" on public.teacher_attendance for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
grant select, insert, update, delete on public.teacher_attendance to authenticated;

-- Attendance status types expanded to match spec (present/absent/late/half_day).
-- attendance_status is a real Postgres ENUM, not a check constraint — new values must be added
-- to the enum itself, and ALTER TYPE ... ADD VALUE cannot run inside the same transaction as
-- code that uses the new value, so this must be its own statement.
alter type public.attendance_status add value if not exists 'late';
alter type public.attendance_status add value if not exists 'half_day';

-- 3) PARENT <-> STUDENT MAPPING (many-to-many: guardians can have multiple children).
create table if not exists public.parent_students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  relationship text default 'guardian',
  created_at timestamptz not null default now(),
  unique (parent_id, student_id)
);
alter table public.parent_students enable row level security;
create policy "parent reads own mapping, staff reads all" on public.parent_students for select to authenticated
  using (parent_id = (select auth.uid()) or (select public.is_staff()));
create policy "staff manage parent mapping" on public.parent_students for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
grant select, insert, update, delete on public.parent_students to authenticated;

-- 4) HOMEWORK
create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  section_id uuid references public.sections(id) on delete cascade,
  subject text not null,
  title text not null,
  description text,
  attachment_url text,
  due_date date not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.homework enable row level security;
create policy "authenticated read homework" on public.homework for select to authenticated using (true);
create policy "staff manage homework" on public.homework for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create table if not exists public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  attachment_url text,
  submitted_at timestamptz,
  status text not null default 'pending' check (status in ('pending','submitted','reviewed')),
  teacher_feedback text,
  unique (homework_id, student_id)
);
alter table public.homework_submissions enable row level security;
create policy "read own or staff homework submission" on public.homework_submissions for select to authenticated
  using ((select public.is_staff()) or student_id in (
    select s.id from public.students s join public.parent_students ps on ps.student_id = s.id where ps.parent_id = (select auth.uid())
  ));
create policy "staff manage submissions" on public.homework_submissions for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
grant select, insert, update, delete on public.homework to authenticated;
grant select, insert, update, delete on public.homework_submissions to authenticated;

-- 5) TIMETABLE
create table if not exists public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  section_id uuid references public.sections(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  subject text not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);
alter table public.timetable_slots enable row level security;
create policy "authenticated read timetable" on public.timetable_slots for select to authenticated using (true);
create policy "staff manage timetable" on public.timetable_slots for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
grant select, insert, update, delete on public.timetable_slots to authenticated;

-- 6) STORAGE BUCKETS — photos & documents (private; access via signed URLs / RLS).
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('branding', 'branding', true) on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "staff upload avatars" on storage.objects;
create policy "staff upload avatars" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (select public.is_staff()));
drop policy if exists "staff update avatars" on storage.objects;
create policy "staff update avatars" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (select public.is_staff()));
drop policy if exists "staff delete avatars" on storage.objects;
create policy "staff delete avatars" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (select public.is_staff()));

drop policy if exists "staff manage documents" on storage.objects;
create policy "staff manage documents" on storage.objects for all to authenticated
  using (bucket_id = 'documents' and (select public.is_staff())) with check (bucket_id = 'documents' and (select public.is_staff()));

drop policy if exists "branding public read" on storage.objects;
create policy "branding public read" on storage.objects for select using (bucket_id = 'branding');
drop policy if exists "staff manage branding" on storage.objects;
create policy "staff manage branding" on storage.objects for all to authenticated
  using (bucket_id = 'branding' and (select public.is_staff())) with check (bucket_id = 'branding' and (select public.is_staff()));
