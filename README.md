# Skylark School ERP

A responsive React + Vite foundation for Skylark School: dashboard, role-aware authentication, students, teachers, classes, attendance, fees, notices, reports and school settings.

## Run locally

1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in your Supabase Project URL and publishable/anon key.
4. Run `npm run dev`.

Without environment values the app uses Preview mode and local sample data, so you can explore the UI straight away. With Supabase configured it shows the real sign-in screen and student CRUD uses the `students` table.

## Supabase setup

1. Create a Supabase project and enable Email/Password sign-in under **Authentication → Providers**.
2. In the SQL Editor, run [`supabase/migrations/20260805000000_skylark_school_erp.sql`](supabase/migrations/20260805000000_skylark_school_erp.sql).
3. Create your first administrator in Authentication → Users.
4. Set its `app_metadata` role safely from a server-side Admin API or the Supabase dashboard to `admin`. Set teacher accounts to `teacher`; the other supported roles are `student` and `parent`.
5. Add the Supabase Project URL and publishable (or legacy anon) key to `.env.local`. Never put a `service_role` or secret key in this frontend.

The migration uses Row Level Security on every public table. Operational data is available only to `admin` and `teacher` roles from trusted `app_metadata`; the migration deliberately does not base authorization on editable user metadata.

## Netlify deployment

1. Push this repository to GitHub.
2. In Netlify, choose **Add new site → Import an existing project**, then select the repository.
3. Build command: `npm run build`; publish directory: `dist` (already provided in `netlify.toml`).
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify site environment variables, then deploy.
5. In Supabase Authentication URL Configuration, add your Netlify production URL and any preview URLs required for redirects.

## Project layout

```
src/                 React interface and reusable components
src/lib/             Supabase client and data access boundary
supabase/migrations/ Database schema, relationships, indexes and RLS
netlify.toml         SPA deployment configuration
```

## Version 1.0 scope

- Student directory provides add, edit, delete and search interactions.
- Attendance has a daily-marking workflow and an extensible attendance table.
- Fee schema supports invoices, payments and receipt numbers.
- Teachers, classes, notices, reports and settings have polished management foundations ready to connect to their matching tables.

## Future roadmap

1. Add complete CRUD forms and Supabase queries for teachers, classes, notices, attendance, invoices and reports.
2. Build parent/student portals with restricted profile and fee/attendance access policies.
3. Add Supabase Storage policies for student photos and school logos.
4. Add QR or RFID attendance via a secure server/Edge Function endpoint.
5. Add multi-school tenancy (`schools`, `school_id`) before making the product SaaS, then scope every RLS policy and index by `school_id`.
6. Add payment gateway webhooks, downloadable PDFs, audits, notifications and test coverage.
