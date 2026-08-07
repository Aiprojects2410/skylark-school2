# What changed in this update

## New features added
- React Router based routing (was page-state before) — proper URLs, browser back/forward works
- Full auth system: AuthContext, ProtectedRoute, RoleProtectedRoute
- Dual login: sign in with email OR School ID (e.g. SKY-STU-2026-0001)
- Role-based redirects: super_admin, admin/principal, teacher, student -> their own dashboard route
- Sidebar + Navbar layout: dark mode, notifications dropdown, search bar, avatar menu, logout
- Error pages: 401, 403, 404, 500
- Teachers directory (full CRUD)
- Classes & sections page
- Attendance: daily grid, saves to Supabase, date picker
- QR Scanner: live camera scan (BarcodeDetector API) + manual entry fallback, logs every scan
- Identity & QR ID cards: printable cards for students/teachers with real embedded QR codes
- Fees management: invoices, payment status, receipt modal
- Notice board: create/read notices, target specific roles
- Leave management: apply + admin approval workflow
- Reports page (scaffold)
- Settings page

## IMPORTANT — steps to run this

1. Install the two new dependencies (I couldn't run npm install in my sandbox — no internet access there):
   pnpm install
   (this will pick up react-router-dom and qrcode which I added to package.json)

2. Apply the new database migration in Supabase:
   - Open Supabase Dashboard -> SQL Editor
   - Run the contents of: supabase/migrations/20260805010000_skylark_school_erp_v2.sql
   - This adds: super_admin/principal roles, school_id/email login columns,
     the resolve_school_id_to_email() RPC, leave_requests table, attendance_scan_log table,
     and role-targeted notices.

3. For School ID login to work for a user, that user's `school_id` needs to be set on their
   profiles row (or passed as user_metadata.school_id at signup time). Example:
     update public.profiles set school_id = 'SKY-ADM-2026-0001' where email = 'you@school.edu';

4. Build & test locally:
   pnpm dev
   pnpm build   (production build check)

5. Then commit & push as usual:
   git add .
   git commit -m "Phase 1-5: routing, auth, roles, attendance, QR ID cards, fees, notices, leave"
   git push
