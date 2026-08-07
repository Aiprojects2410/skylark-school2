# v3 update — secure QR, storage, parent module, homework, timetable, teacher self-attendance

## What changed

1. SECURITY FIX — QR codes now encode an opaque `qr_token` (UUID), never the readable
   student_id/employee_id or any personal data. Scans are verified server-side only via the
   `verify_and_mark_attendance()` security-definer SQL function — the client never claims who
   a scanned code belongs to. "Regenerate QR" button instantly invalidates the old physical card.

2. Teacher self-attendance — new "My Attendance" page (teacher role only), stays inside the main
   site as required, scans the teacher's own card to check in. Uses `teacher_attendance` table,
   separate from student `attendance`.

3. Parent module — "My Children" page: parents see linked children (via `parent_students` table),
   their fee status and recent notices. Admin links a parent to a student by inserting into
   `parent_students` (UI for this can be added on request; for now it's a straightforward insert).

4. Homework — assign/view homework by class & subject, due dates.

5. Timetable — weekly grid, staff can populate `timetable_slots`.

6. Photo upload — students & teachers now have a real photo upload field (Supabase Storage,
   `avatars` bucket, public read / staff write). ID cards show the real photo instead of initials.

7. "Created by Ahad Khan" footer on every page (login + all dashboard pages).

## IMPORTANT — run this before pushing

1. pnpm install   (no new deps this round, just new files)
2. Apply the new migration in Supabase SQL Editor:
   supabase/migrations/20260806000000_skylark_school_erp_v3.sql
   This adds: qr_token columns, verify_and_mark_attendance() + regenerate_qr_token() RPCs,
   teacher_attendance table, parent_students table, homework + homework_submissions,
   timetable_slots, and 3 storage buckets (avatars, documents, branding) with RLS policies.
3. Existing students/teachers get a random qr_token automatically (column default) — no manual
   backfill needed. Old QR cards printed with student_id will stop working; reprint from
   Identity & QR page after migration.
4. To link a parent to a child (until an admin UI is added), run in SQL Editor:
   insert into public.parent_students (parent_id, student_id) values ('<parent-profile-uuid>', '<student-uuid>');
5. pnpm dev / pnpm build to verify, then commit & push as usual.
