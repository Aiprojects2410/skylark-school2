-- Skylark School ERP v1.0 schema. Run in Supabase SQL Editor or via CLI migration.
create extension if not exists "pgcrypto";
create type public.app_role as enum ('admin','teacher','student','parent');
create type public.attendance_status as enum ('present','absent','leave');
create type public.fee_status as enum ('paid','partial','pending','overdue');

create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text not null, role public.app_role not null default 'student', phone text, avatar_url text, created_at timestamptz not null default now());
create table public.teachers (id uuid primary key default gen_random_uuid(), profile_id uuid unique references public.profiles(id) on delete set null, employee_id text unique not null, qualification text, phone text, email text unique, created_at timestamptz not null default now());
create table public.classes (id uuid primary key default gen_random_uuid(), name text unique not null, academic_year text not null, class_teacher_id uuid references public.teachers(id) on delete set null, created_at timestamptz not null default now());
create table public.sections (id uuid primary key default gen_random_uuid(), class_id uuid not null references public.classes(id) on delete cascade, name text not null, unique(class_id,name));
create table public.subjects (id uuid primary key default gen_random_uuid(), name text unique not null, code text unique not null);
create table public.teacher_assignments (id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.teachers(id) on delete cascade, subject_id uuid not null references public.subjects(id) on delete restrict, class_id uuid not null references public.classes(id) on delete cascade, section_id uuid references public.sections(id) on delete cascade, unique(teacher_id,subject_id,class_id,section_id));
create table public.students (id uuid primary key default gen_random_uuid(), student_id text unique not null, admission_number text unique, full_name text not null, photo_url text, date_of_birth date, gender text check (gender in ('male','female','other')), class_id uuid references public.classes(id) on delete set null, section_id uuid references public.sections(id) on delete set null, parent_id uuid references public.profiles(id) on delete set null, parent_name text, parent_phone text, email text, address text, admission_date date default current_date, status text not null default 'active' check(status in ('active','inactive','graduated')), created_at timestamptz not null default now());
create table public.attendance (id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade, attendance_date date not null, status public.attendance_status not null, marked_by uuid references public.profiles(id) on delete set null, note text, created_at timestamptz not null default now(), unique(student_id,attendance_date));
create table public.fee_invoices (id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade, academic_year text not null, total_amount numeric(12,2) not null check(total_amount>=0), due_date date, status public.fee_status not null default 'pending', created_at timestamptz not null default now());
create table public.fee_payments (id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.fee_invoices(id) on delete cascade, receipt_number text unique not null, amount numeric(12,2) not null check(amount>0), payment_date date not null default current_date, payment_method text, notes text, received_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now());
create table public.notices (id uuid primary key default gen_random_uuid(), title text not null, body text not null, category text not null default 'general', published_at timestamptz not null default now(), expires_at timestamptz, created_by uuid references public.profiles(id) on delete set null);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
revoke execute on function public.handle_new_user() from public;

create index students_class_id_idx on public.students(class_id); create index attendance_student_date_idx on public.attendance(student_id, attendance_date); create index fee_invoices_student_id_idx on public.fee_invoices(student_id);
-- Role is read from app_metadata, which only trusted server-side admin APIs can change.
-- Do not use user_metadata for authorization: users can edit it themselves.
create or replace function public.is_staff() returns boolean language sql stable security invoker set search_path = '' as $$ select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','teacher'), false) $$;
grant execute on function public.is_staff() to authenticated;
alter table public.profiles enable row level security; alter table public.teachers enable row level security; alter table public.classes enable row level security; alter table public.sections enable row level security; alter table public.subjects enable row level security; alter table public.teacher_assignments enable row level security; alter table public.students enable row level security; alter table public.attendance enable row level security; alter table public.fee_invoices enable row level security; alter table public.fee_payments enable row level security; alter table public.notices enable row level security;
-- Staff can manage operational data. Parents/students are intentionally restricted until linked access UI is added.
create policy "staff manage profiles" on public.profiles for all to authenticated using ((select public.is_staff()) or id=(select auth.uid())) with check ((select public.is_staff()) or id=(select auth.uid()));
create policy "staff manage teachers" on public.teachers for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff manage classes" on public.classes for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff manage sections" on public.sections for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff manage subjects" on public.subjects for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff manage assignments" on public.teacher_assignments for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff manage students" on public.students for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff manage attendance" on public.attendance for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff manage invoices" on public.fee_invoices for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff manage payments" on public.fee_payments for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "authenticated read notices" on public.notices for select to authenticated using (true);
create policy "staff manage notices" on public.notices for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant usage on schema public to authenticated; grant select,insert,update,delete on all tables in schema public to authenticated;
