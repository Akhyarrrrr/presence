# Presence

Presence is a workforce attendance platform built with Next.js and Supabase. It provides a public kiosk check-in experience with face detection + liveness verification, plus an admin control panel for member management, shift scheduling, attendance analytics, realtime monitoring, and PDF reporting.

The project is intentionally phased: current production logic emphasizes secure server-side matching and server-side attendance writes while preserving operational reliability.

## Project Overview

Presence solves day-to-day attendance operations for organizations:

- Fast kiosk check-in with camera-based verification
- Admin-managed identity roster and schedule planning
- Shift-aware attendance classification (`on_time`, `late`, `very_late`, `no_shift`)
- Multi-organization foundation with admin scoping
- Realtime dashboard updates and downloadable monthly reports

## Roles & Access Model

Current workspace model:

- Owner
  - Creates the first workspace account via `/register` (MVP behavior).
  - Has highest operational authority inside the organization.
  - Future phase: invites/approves additional admins.
- Admin
  - Uses `/login` to manage members, enrollment, shifts, schedules, logs, and reports.
  - Should not be treated as open public self-registration in hardened production flow.
- Member / Employee
  - Created by Owner/Admin from the dashboard.
  - Uses `/attendance` kiosk for check-in without login.
  - Future phase: optional member self-service portal (`/member` or `/my-attendance`).

Important MVP note:

- Current auth onboarding still auto-links new sign-ups into the default organization/admin bootstrap flow.
- Hardened invitation/approval flow for additional admins is planned, but not implemented yet.

## Features

- Supabase Auth login/register for admin access
- Public kiosk scanner (`/attendance`) with:
  - face detection via `face-api.js`
  - head-movement liveness verification (stable face -> slight turn -> return center)
  - server-side face matching via pgvector RPC
  - server-side attendance check-in route
- Member enrollment with photo upload and dual descriptor write
- Organization-scoped admin dashboard
- Shift management (`/dashboard/shifts`)
- Schedule assignment (`/dashboard/schedules`)
- Attendance logs (`/logs`)
- Realtime attendance stream + status summary cards
- Monthly PDF report generation (`/dashboard/reports`)
- RLS lockdown via secure RPC strategy (no broad public table reads/inserts)

## Architecture

High-level structure:

- `app/attendance`  
  Public kiosk UI and scanner flow
- `app/(auth)`  
  Login and registration
- `app/(admin)`  
  Protected admin app shell and business modules
- `app/api/face/match`  
  Server route for face matching via pgvector RPC
- `app/api/attendance/bootstrap`  
  Server route for kiosk bootstrap roster + today check-ins
- `app/api/attendance/check-in`  
  Server route for validated attendance insert
- `lib/supabase`  
  Browser/server Supabase clients + organization helpers
- `lib/face-api.ts` and `lib/liveness.ts`  
  Face detection + liveness utility logic
- `supabase/schema.sql`  
  Source-of-truth SQL, including phased migration blocks

Security model:

- Browser uses anon key only
- Sensitive reads/writes flow through server routes
- Database access is restricted via RLS + security-definer RPCs for kiosk operations

## Tech Stack

- Next.js 15 (App Router)
- TypeScript (strict)
- Tailwind CSS
- Supabase (Auth, Postgres, Storage, Realtime)
- `face-api.js` + TensorFlow.js model assets
- pgvector (Supabase Postgres extension)
- Recharts
- Sonner
- Lucide React
- jsPDF

## Setup Instructions

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.local.example .env.local
```

3. Configure environment:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Start dev server:

```bash
npm run dev
```

5. Open:

- Kiosk: `http://localhost:3000/attendance`
- Admin: `http://localhost:3000/login`

## Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql` (or apply each phase block in order if migrating an existing environment).
4. Ensure storage bucket `member-photos` exists and policies are applied.

Important:

- If your live project already has earlier phases applied, apply only unapplied phase blocks.
- Phase 11 introduces RLS lockdown + secure RPCs required by kiosk server routes.

## pgvector Setup

Phase 6A and onward require pgvector:

- `create extension if not exists vector;`
- `member_face_descriptors.descriptor vector(128)`
- Matching RPCs:
  - `match_member_by_face` (legacy phase function)
  - `secure_match_member_by_face` (RLS-lockdown path)

The kiosk now relies on secure server matching endpoints and should not fetch descriptors directly in browser.

## Attendance Flow

1. Kiosk loads via `/attendance`.
2. Scanner requests bootstrap data from `/api/attendance/bootstrap`.
3. Face is detected and descriptor is extracted in browser.
4. Descriptor is sent to `/api/face/match` (server-side vector match).
5. User must pass liveness challenge (stable face, slight head turn, return center).
6. Scanner sends validated check-in to `/api/attendance/check-in`.
7. Server recomputes shift classification and inserts attendance safely.
8. Duplicate same-day check-ins are rejected gracefully.

## Liveness Flow

1. Scanner starts center calibration with stable face for around 2 seconds.
2. User moves head slightly left or right once.
3. User returns face to center.
4. Liveness state becomes `verified`.
5. Attendance insert is blocked until `verified`.

## Shift Management Flow

1. Admin creates/edits shifts in `/dashboard/shifts`.
2. Admin assigns members to shifts by date in `/dashboard/schedules`.
3. On check-in, server resolves today assignment + shift thresholds.
4. Attendance row stores `shift_id`, `status`, and `late_minutes` when available.

## Screenshots

Add product screenshots here:

- `docs/screenshots/kiosk-scanner.png` (kiosk scanner)
- `docs/screenshots/dashboard-overview.png` (dashboard summary)
- `docs/screenshots/shifts.png` (shift management)
- `docs/screenshots/schedules.png` (schedule assignment)
- `docs/screenshots/reports-pdf.png` (reports module)

Example markdown placeholders:

```md
![Kiosk Scanner](docs/screenshots/kiosk-scanner.png)
![Dashboard Overview](docs/screenshots/dashboard-overview.png)
![Shift Management](docs/screenshots/shifts.png)
![Schedules](docs/screenshots/schedules.png)
![Reports](docs/screenshots/reports-pdf.png)
```

## Scripts

```bash
npm run dev
npm run lint
npm run build
npx next typegen
npx tsc --noEmit
npm run start
```

## Future Roadmap

- Remove legacy `members.face_descriptor` after final migration/backfill verification
- Tighten and simplify legacy RPC surface after stabilization
- Add richer audit metadata (model version, matching telemetry)
- Add report exports beyond PDF (CSV/XLSX)
- Improve kiosk observability and operational alerts
- Add automated E2E tests for kiosk/admin critical flows
