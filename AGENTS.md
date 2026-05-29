# Presence Agent Guide

This file is the working agreement for future AI agents and contributors in this repository. Read it before changing code. The goal is to keep Presence moving toward a professional workforce attendance product without letting the architecture drift into one-off demo code.

## Product Context

Presence is a Next.js App Router attendance system with browser-based face enrollment and a public attendance kiosk. The current implementation uses Supabase Auth, Database, Storage, `face-api.js`, TensorFlow.js model assets in `public/models`, Recharts, Sonner, Lucide icons, and Tailwind CSS.

The PRD direction is broader than the current MVP: server-side pgvector matching, liveness detection, shift scheduling, attendance classification, realtime monitoring, and PDF reports. When documenting or implementing future work, clearly separate what exists today from what is proposed.

## Current Architecture

- `app/page.tsx` redirects authenticated users to `/dashboard` and unauthenticated users to `/attendance`.
- `app/attendance/page.tsx` is the public kiosk route.
- `app/(auth)` contains login and register screens backed by Supabase Auth.
- `app/(admin)` contains protected dashboard, members, member enrollment, and logs routes.
- `middleware.ts` protects admin routes and redirects authenticated users away from auth pages.
- `lib/supabase/client.ts` creates the browser Supabase client.
- `lib/supabase/server.ts` creates the Server Component Supabase client.
- `lib/supabase/organization.ts` prepares current admin, current organization, and organization-scoped query helpers.
- `lib/face-api.ts` owns model loading, descriptor extraction, client-side matching, and canvas drawing.
- `components/camera` owns camera-driven UI.
- `components/ui/presence-ui.tsx` contains the current shared UI primitives.
- `types/index.ts` contains the current app-level TypeScript interfaces.
- `supabase/schema.sql` is the checked-in schema for the current database.

## Non-Negotiable Rules

- Do not blur existing behavior with planned behavior. Label proposed features, tables, and APIs as proposed until they exist.
- Do not expose Supabase service role keys to the browser or any `NEXT_PUBLIC_*` variable.
- Do not fetch every face descriptor into the browser in new work. The current scanner does this as legacy MVP behavior only.
- Do not add biometric storage or matching features without documenting RLS, data minimization, and failure states.
- Do not implement large refactors when the user asked for documentation, review, or planning only.
- Do not replace the existing visual language with generic landing-page or AI-template UI.
- Do not aggressively rewrite route groups, auth flow, or camera components without a migration path.

## Coding Conventions

- Use strict TypeScript. Avoid `any`; define explicit request, response, and domain types.
- Prefer small named functions over anonymous logic blocks when behavior is shared or testable.
- Keep route-specific data loading close to the route until there is real reuse.
- Keep shared UI in `components/ui` and domain components in domain folders such as `components/camera`.
- Keep Supabase client creation inside `lib/supabase`. Do not instantiate Supabase clients ad hoc throughout the app.
- Keep face-recognition utilities in `lib/face-api.ts` until a worker or server-side matching module is introduced.
- Use `@/` imports consistently.
- Preserve existing formatting style: no semicolons, single quotes, concise React components.
- Use existing dependencies before adding new ones. Add a dependency only when it clearly reduces product or security risk.

## App Router Conventions

- Use Server Components for authenticated page-level data loading when possible.
- Use Client Components only for interactivity, browser APIs, camera access, charts, forms, toasts, and realtime subscriptions.
- Keep protected admin pages under `app/(admin)` and public attendance under `app/attendance`.
- Keep auth screens under `app/(auth)`.
- Use route handlers under `app/api` for sensitive server-side work such as pgvector matching, liveness verification, report generation, and any operation needing privileged database access.
- Validate all route handler inputs at the boundary before calling Supabase.
- Return typed JSON errors from route handlers. Do not leak database internals to the UI.
- Use `metadata` on user-facing routes where practical.

## Supabase Rules

- Browser code may use only the anon key through `lib/supabase/client.ts`.
- Server Components and route handlers must use `lib/supabase/server.ts` unless a future service-role-only helper is explicitly created for trusted server routes.
- If a service-role client is introduced, it must live in a server-only module and must never be imported by Client Components.
- All new tables must enable RLS before they are used by the app.
- Policies must reflect product roles. Public attendance can insert limited attendance attempts, but admin management must require authenticated admin access.
- Keep storage bucket access intentional. Member photos are currently public; future biometric evidence should not become public by default.
- Treat `members.face_descriptor` as legacy. Future work should move descriptors to `member_face_descriptors.descriptor vector(128)` and query through server-side RPC or route handlers.
- Do not perform full-table descriptor reads in client code for new attendance or enrollment flows.
- Phase 1 adds `organizations`, `admin_users`, and nullable/defaulted `organization_id` columns. Do not make those fields non-null or strict in RLS until existing Supabase data and kiosk compatibility are verified.
- Phase 2 scopes admin dashboard, member, and attendance-log views to the current admin organization. Public kiosk scanner queries remain intentionally unscoped until the server-side attendance path exists.
- Phase 3 adds shifts and shift assignments for admin planning. Do not wire shift classification into kiosk attendance until that phase is explicitly requested.

## Attendance And Biometric Rules

- Enrollment creates a member profile, a face descriptor, and optionally a photo preview.
- Attendance must be idempotent per member per work date.
- Current duplicate prevention is the `attendance_member_date_unique` index. Preserve equivalent protection after schema changes.
- Planned attendance must run liveness before accepting check-in.
- Planned matching must happen server-side using pgvector.
- Store only what is needed for auditability. Avoid storing raw camera frames unless a future requirement explicitly calls for it.
- Record enough matching metadata for audit and troubleshooting: distance, confidence, model version, liveness result, shift, and status.

## Frontend Standards

- Build the app itself, not a marketing shell. The first screen for product routes should be useful.
- Keep the product feel modern, calm, operational, and enterprise-ready.
- Use the existing visual primitives: `BrandMark`, `Surface`, `StatusBadge`, `MetricCard`, `PageHeader`, `EmptyState`, `PrimaryLink`, and `SecondaryLink`.
- Use Lucide icons for actions and navigation.
- Prefer dense, scannable dashboard layouts over oversized hero sections inside admin tools.
- Avoid nested cards, decorative blobs, one-note palettes, and generic gradient-heavy AI UI.
- Keep card radius at or below the existing `rounded-lg` pattern unless a local component already differs.
- Provide loading, empty, success, and error states for user workflows.
- Keep text inside controls short and ensure it fits on mobile.
- Do not use visible instructional text to explain obvious UI mechanics. Let controls and states communicate.

## Accessibility Requirements

- Preserve the skip link in `app/layout.tsx`.
- Use semantic landmarks: `main`, `nav`, `aside`, `table`, headings in order, and form labels.
- Every icon-only button needs an accessible label.
- All form inputs need labels connected by `htmlFor`.
- All interactive controls must be keyboard reachable and show focus states.
- Maintain readable contrast in light UI and camera overlays.
- Respect `prefers-reduced-motion`; do not add required motion-only interactions.
- Camera and biometric flows must provide text feedback, not only color or animation.
- Tables need real table markup for tabular data.

## Security Rules

- Never commit real `.env.local` values.
- Never place secrets in client code, logs, toasts, screenshots, or docs.
- Validate server route inputs and reject malformed descriptors, invalid UUIDs, invalid dates, and unexpected statuses.
- Use RLS and server-side role checks together for admin-only operations.
- Rate-limit or otherwise protect future public attendance APIs from spam.
- Keep biometric descriptors behind admin/server boundaries.
- Do not show raw database errors to public kiosk users.
- Prefer soft-deactivation for members in future work; deleting members currently cascades attendance history and should be treated as a legacy risk.

## Performance Rules

- Do not block the UI thread with continuous expensive inference loops.
- Current scanner throttles detection to roughly every 800ms; keep equivalent pacing until a Web Worker is introduced.
- Planned face processing should move TensorFlow/face-api work into a Web Worker where practical.
- Cache model loading through a single shared promise, as `lib/face-api.ts` currently does.
- Keep dashboard queries bounded with limits, date filters, and counts.
- Avoid subscribing to broad realtime channels when a narrower table, organization, or date filter is available.
- Avoid introducing large client bundles into public kiosk routes.

## Component Structure Rules

- Page files should compose data loading and layout; they should not become large interaction controllers.
- Camera components may use browser APIs and refs, but their persistence and matching calls should be abstracted as the product matures.
- Shared UI primitives should be generic and presentation-focused. They should not import Supabase or domain logic.
- Domain components should receive typed props and avoid reaching into unrelated route state.
- If a component grows past one responsibility, split by workflow step, not by arbitrary UI fragments.

## Database And Migration Rules

- Update `DB_SCHEMA.md` whenever schema changes.
- Add migrations or SQL changes deliberately. Do not mutate `supabase/schema.sql` casually without explaining migration impact.
- Never drop or rename columns without a migration plan and data backfill plan.
- Keep old and new attendance fields compatible during transitions.
- Preserve existing records when moving from `float8[]` descriptors to pgvector.
- Add indexes for new foreign keys, date queries, and vector search paths.

## Future AI Agent Workflow

1. Read `prd.md`, `README.md`, `AGENTS.md`, `DB_SCHEMA.md`, and `API_CONTRACT.md`.
2. Inspect the actual code before proposing changes.
3. Identify whether the request is documentation, implementation, review, or debugging.
4. Keep existing and proposed behavior separate in docs and code comments.
5. Make the smallest coherent change that advances the requested goal.
6. Run relevant checks when code changes: at minimum `npm run lint`, and `npm run build` for route, type, or data-flow changes when feasible.
7. Summarize assumptions, risks, and follow-up work clearly.

## Areas To Treat Carefully

- The public attendance scanner currently fetches active members and descriptors in the browser. This is a known security and scalability gap, not a pattern to copy.
- Member deletion currently deletes attendance history through cascade. Avoid building workflows that encourage destructive deletion.
- Admin pages now use the Phase 1 organization/admin foundation, but public kiosk attendance still uses the original MVP flow.
- Departments are still global in the current schema. Decide whether to scope them before building multi-tenant department features.
- Current attendance has only check-in, confidence, and date. Shift-aware statuses require schema and flow changes together.
- Shift and schedule tables now exist as a planning foundation, but current attendance logs are not shift-classified.
- Liveness detection does not exist yet. Do not imply the current product is spoof-resistant.
