-- Skylark School ERP v8.0 — enable Realtime on attendance so the Attendance module's
-- section view updates live as QR scans come in, without a page refresh.
alter publication supabase_realtime add table public.attendance;
