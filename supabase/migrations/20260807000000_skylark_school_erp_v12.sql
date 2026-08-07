-- Tracks when a student/teacher's ID card was last printed or exported as PDF, so the
-- Identity & QR Cards page can show a "remaining cards" queue of people who don't have a
-- card yet, instead of re-printing everyone's card every time.
alter table public.students add column if not exists card_printed_at timestamptz;
alter table public.teachers add column if not exists card_printed_at timestamptz;
