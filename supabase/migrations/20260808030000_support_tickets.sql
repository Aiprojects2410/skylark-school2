-- Support / feedback ticket system
create extension if not exists pgcrypto;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique not null default ('SKY-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null default 'Issue reported from portal',
  description text not null,
  category text not null default 'technical' check (category in ('technical','bug','feature','data','other')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  page_path text,
  screenshot_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_user_id_idx on public.support_tickets(user_id);
create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists support_tickets_created_at_idx on public.support_tickets(created_at desc);
create index if not exists support_ticket_messages_ticket_id_idx on public.support_ticket_messages(ticket_id, created_at);

create or replace function public.set_support_ticket_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status in ('resolved','closed') and old.status not in ('resolved','closed') then
    new.resolved_at = now();
  elsif new.status not in ('resolved','closed') then
    new.resolved_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists support_ticket_updated_at on public.support_tickets;
create trigger support_ticket_updated_at
before update on public.support_tickets
for each row execute function public.set_support_ticket_updated_at();

create or replace function public.set_support_ticket_message_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select role into new.sender_role from public.profiles where id = new.sender_id;
  return new;
end;
$$;

drop trigger if exists support_ticket_message_role on public.support_ticket_messages;
create trigger support_ticket_message_role
before insert on public.support_ticket_messages
for each row execute function public.set_support_ticket_message_role();

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

drop policy if exists "Users can view own tickets" on public.support_tickets;
create policy "Users can view own tickets" on public.support_tickets for select to authenticated
using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','admin','principal')));

drop policy if exists "Users can create own tickets" on public.support_tickets;
create policy "Users can create own tickets" on public.support_tickets for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Admins can update tickets" on public.support_tickets;
create policy "Admins can update tickets" on public.support_tickets for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','admin','principal')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','admin','principal')));

drop policy if exists "Users can view messages on own tickets" on public.support_ticket_messages;
create policy "Users can view messages on own tickets" on public.support_ticket_messages for select to authenticated
using (exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','admin','principal')))));

drop policy if exists "Users can reply to accessible tickets" on public.support_ticket_messages;
create policy "Users can reply to accessible tickets" on public.support_ticket_messages for insert to authenticated
with check (sender_id = auth.uid() and exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','admin','principal')))));

insert into storage.buckets (id, name, public) values ('support-attachments', 'support-attachments', false)
on conflict (id) do nothing;

drop policy if exists "Support attachments upload" on storage.objects;
create policy "Support attachments upload" on storage.objects for insert to authenticated
with check (bucket_id = 'support-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Support attachments view" on storage.objects;
create policy "Support attachments view" on storage.objects for select to authenticated
using (bucket_id = 'support-attachments' and ((storage.foldername(name))[1] = auth.uid()::text or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','admin','principal'))));
