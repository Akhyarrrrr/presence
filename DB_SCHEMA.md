# Presence Database Schema

This document describes the current checked-in Supabase schema and the proposed schema required by the PRD. The current schema is based on `supabase/schema.sql` and the application code. I did not introspect a live Supabase project, so any production-only changes must be verified against Supabase before migration.

Phase 1 organization/admin foundation has been added to `supabase/schema.sql` as an additive, idempotent section. Phase 2 wires admin pages to the current organization context. Existing public kiosk attendance behavior is intentionally preserved.

## Existing Schema

### Extensions

| Extension | Current status | Purpose | Notes |
| --- | --- | --- | --- |
| `uuid-ossp` | Created in `supabase/schema.sql` | Legacy UUID support | Kept for compatibility with the original schema |
| `pgcrypto` | Created in the Phase 1 section if missing | Provides `gen_random_uuid()` in standard Supabase/Postgres setups | Additive safety fix for fresh databases |

### `public.organizations`

Stores organization/workspace records. Phase 1 creates a default row named `Default Organization` and backfills existing members and attendance logs to it.

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | Primary key, default `gen_random_uuid()` | Organization identifier |
| `name` | `text` | Not null, unique | Organization display name |
| `timezone` | `text` | Not null, default `Asia/Jakarta` | Local time zone for future attendance date and shift calculations |
| `created_at` | `timestamptz` | Default `now()`, not null | Creation timestamp |
| `updated_at` | `timestamptz` | Default `now()`, not null | Update timestamp |

Relationships:

- Referenced by `admin_users.organization_id`.
- Referenced by `members.organization_id`.
- Referenced by `attendance_logs.organization_id`.

RLS:

- Enabled.
- Authenticated users can read organizations linked through their `admin_users` row.

### `public.admin_users`

Maps Supabase Auth users to organization roles. Phase 1 backfills existing `auth.users` rows as `owner` of `Default Organization` and adds a trigger so future signups follow the current app behavior of becoming admins.

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | Primary key, default `gen_random_uuid()` | Admin profile identifier |
| `user_id` | `uuid` | Not null, FK to `auth.users.id`, `on delete cascade` | Supabase Auth user |
| `organization_id` | `uuid` | Not null, FK to `organizations.id`, default `default_organization_id()` | Organization membership |
| `role` | `text` | Not null, default `owner`, check in `owner`, `admin`, `viewer` | Admin permission role |
| `created_at` | `timestamptz` | Default `now()`, not null | Creation timestamp |
| `updated_at` | `timestamptz` | Default `now()`, not null | Update timestamp |

Constraints and indexes:

- Unique `(user_id, organization_id)`.
- Indexes on `user_id` and `organization_id`.

RLS:

- Enabled.
- Authenticated users can read their own admin profile.

Phase 1 helper functions and triggers:

- `public.default_organization_id()` returns the default organization id.
- `public.handle_new_admin_user()` creates an `admin_users` row for new Auth users.
- Trigger `on_auth_user_created_create_admin_user` runs after insert on `auth.users`.

### `public.departments`

Stores the current global department list used by member profiles.

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | Primary key, default `gen_random_uuid()` | Department identifier |
| `name` | `text` | Not null, unique | Department display name |
| `created_at` | `timestamptz` | Default `now()` | Creation timestamp |

Seeded values:

- `Engineering`
- `Design`
- `Marketing`
- `HR`
- `Finance`
- `Operations`

Relationships:

- Referenced by `members.department_id`.

RLS:

- Enabled.
- Public read policy: anyone can select departments.

### `public.members`

Stores enrolled identity profiles and the current face descriptor used by the browser scanner.

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | Primary key, default `gen_random_uuid()` | Member identifier |
| `organization_id` | `uuid` | Nullable FK to `organizations.id`, default `default_organization_id()`, `on delete set null` | Phase 1 organization scope |
| `name` | `text` | Not null | Member display name |
| `employee_id` | `text` | Not null, unique | Employee or student code |
| `department_id` | `uuid` | FK to `departments.id`, `on delete set null` | Optional department |
| `email` | `text` | Nullable | Optional member email |
| `photo_url` | `text` | Nullable | Public storage URL for captured enrollment photo |
| `face_descriptor` | `float8[]` | Not null | 128-dimensional face-api descriptor stored as an array |
| `is_active` | `boolean` | Default `true` | Whether the profile participates in kiosk matching |
| `created_at` | `timestamptz` | Default `now()`, not null | Creation timestamp |
| `updated_at` | `timestamptz` | Default `now()`, not null | Update timestamp |

Relationships:

- `organization_id` references `organizations.id`.
- `department_id` references `departments.id`.
- Referenced by `attendance_logs.member_id`.

RLS:

- Enabled.
- Public read policy allows anyone to select members.
- Authenticated users can manage members.

Current application usage:

- Admin member directory reads `members` with `departments(name)`.
- Member enrollment inserts `name`, `employee_id`, `department_id`, `email`, `face_descriptor`, and `photo_url`.
- Public kiosk reads all active members, including `face_descriptor`, then matches in the browser.
- Member deletion removes the member and cascades attendance history through `attendance_logs.member_id`.

Known limitations:

- Organization id is present, but existing member queries are not strictly scoped yet to avoid breaking the current kiosk/admin flow.
- No `position` field.
- No status enum beyond `is_active`.
- Face descriptors are in the member row and publicly readable under current RLS.
- No separate face enrollment history or model metadata.

### `public.attendance_logs`

Stores one daily check-in per member.

| Field | Type | Constraints | Purpose |
| --- | --- | --- | --- |
| `id` | `uuid` | Primary key, default `gen_random_uuid()` | Attendance log identifier |
| `organization_id` | `uuid` | Nullable FK to `organizations.id`, default `default_organization_id()`, `on delete set null` | Phase 1 organization scope |
| `member_id` | `uuid` | Not null, FK to `members.id`, `on delete cascade` | Checked-in member |
| `check_in_at` | `timestamptz` | Default `now()`, not null | Check-in timestamp |
| `confidence` | `float8` | Not null | Client-side match confidence derived from face distance |
| `date` | `date` | Default `current_date`, not null | Local attendance date used for duplicate prevention |
| `created_at` | `timestamptz` | Default `now()`, not null | Creation timestamp |

Indexes:

| Name | Fields | Purpose |
| --- | --- | --- |
| `attendance_member_date_unique` | `(member_id, date)` unique | Prevents duplicate check-ins for the same member on the same date |

Relationships:

- `organization_id` references `organizations.id`.
- `member_id` references `members.id`.

RLS:

- Enabled.
- Public read policy allows anyone to select attendance.
- Public insert policy allows anyone to insert attendance.
- Authenticated users can manage attendance.

Current application usage:

- Public kiosk reads today's `member_id` values to avoid duplicates.
- Public kiosk inserts `{ member_id, confidence, date }` after client-side face match.
- Dashboard counts today's logs and last 30 days of logs.
- Logs page filters by `date`.

Known limitations:

- No shift relation.
- No check-out.
- No late classification.
- No liveness result.
- No face distance field.
- Organization id is present, but existing attendance queries are not strictly scoped yet to preserve the public kiosk.
- `date` depends on database/client defaults and should be revisited for organization time zones.

### Storage Bucket: `member-photos`

Stores enrollment photos used as profile avatars.

| Property | Current value | Purpose |
| --- | --- | --- |
| Bucket id | `member-photos` | Member profile photo storage |
| Public | `true` | Photos can be served through public URLs |

Policies:

- Public select from `member-photos`.
- Authenticated users can upload to `member-photos`.

Known limitations:

- No path convention is enforced by policy.
- No update or delete policy is defined in `schema.sql`.
- Photos are public. Do not store sensitive biometric evidence here without a policy change.

## Existing Relationships

```text
organizations.id
  -> admin_users.organization_id
  -> members.organization_id
  -> attendance_logs.organization_id

auth.users.id
  -> admin_users.user_id

departments.id
  -> members.department_id

members.id
  -> attendance_logs.member_id
```

Current attendance flow:

1. Admin enrolls a member and stores `members.face_descriptor`.
2. Public kiosk reads active `members` and today's `attendance_logs`.
3. Browser runs face-api detection and compares descriptors locally.
4. Browser inserts one `attendance_logs` row per matched member and date.
5. Dashboard and logs pages read `attendance_logs`.

## Current Statuses And Enums

There are no database enums in the current schema.

Current status-like values:

| Concept | Current representation | Notes |
| --- | --- | --- |
| Admin role | `admin_users.role text` checked against `owner`, `admin`, `viewer` | Added in Phase 1 without strict authorization enforcement yet |
| Member active state | `members.is_active boolean` | Used to include or exclude members from kiosk matching |
| Attendance status | Derived in UI as `Present` | No stored attendance status |
| Duplicate attendance | Unique index on `(member_id, date)` | Duplicate insert returns Postgres error `23505` |
| Match result | `attendance_logs.confidence float8` | No stored raw distance |

## Proposed Additions

The following schema is proposed for the remaining PRD direction. `organizations`, `admin_users`, `members.organization_id`, and `attendance_logs.organization_id` have already been added in Phase 1; stricter app-level scoping and RLS are still future work.

### Proposed Enums

#### `admin_role`

| Value | Purpose |
| --- | --- |
| `owner` | Full organization administration |
| `admin` | Manage members, shifts, schedules, attendance, and reports |
| `viewer` | Read-only dashboard and report access |

#### `member_status`

| Value | Purpose |
| --- | --- |
| `active` | Eligible for schedules and attendance |
| `inactive` | Hidden from active operations |
| `archived` | Retained for historical reporting but not editable by normal flows |

#### `attendance_status`

| Value | Purpose |
| --- | --- |
| `on_time` | Checked in within shift tolerance |
| `late` | Checked in after tolerance but before very-late threshold |
| `very_late` | Checked in after very-late threshold |
| `no_shift` | Attendance accepted or attempted without a shift assignment |
| `liveness_failed` | Attendance rejected because liveness verification failed |
| `unmatched` | Face match failed or confidence was below threshold |

### Phase 1 Foundation Already Added

These pieces now exist in `supabase/schema.sql`:

- `public.organizations`
- `public.admin_users`
- `members.organization_id`
- `attendance_logs.organization_id`
- `public.default_organization_id()`
- `public.handle_new_admin_user()`
- Trigger `on_auth_user_created_create_admin_user`

Future phases should tighten query scoping and authorization only after the deployed Supabase project has run the Phase 1 SQL successfully.

### `public.departments` - proposed changes

Keep the existing table but scope departments to organizations.

| Field | Type | Purpose |
| --- | --- | --- |
| `organization_id` | `uuid` | FK to `organizations.id` |
| `name` | `text` | Department name within the organization |

Recommended constraints:

- Unique `(organization_id, name)`.

### `public.members` - proposed changes

Keep the member table but move biometric descriptors out of the row and align fields with the PRD.

| Field | Type | Purpose |
| --- | --- | --- |
| `organization_id` | `uuid` | Already added in Phase 1; future work should make it non-null after backfill verification |
| `employee_code` | `text` | Replacement or alias for current `employee_id` |
| `full_name` | `text` | Replacement or alias for current `name` |
| `department_id` | `uuid` | FK to scoped departments |
| `position` | `text` | Job title or role label |
| `status` | `member_status` | Lifecycle state |
| `email` | `text` | Optional email |
| `photo_url` | `text` | Optional profile photo |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Update timestamp |

Recommended constraints:

- Unique `(organization_id, employee_code)`.
- Index `(organization_id, status)`.

Migration note:

- Current `name` maps to proposed `full_name`.
- Current `employee_id` maps to proposed `employee_code`.
- Current `is_active` maps to `status = 'active'` or `status = 'inactive'`.
- Current `face_descriptor` should move to `member_face_descriptors`.

### `public.member_face_descriptors` - proposed

Stores biometric descriptors separately and enables server-side pgvector matching.

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Descriptor identifier |
| `organization_id` | `uuid` | FK to `organizations.id` for scoped matching |
| `member_id` | `uuid` | FK to `members.id` |
| `descriptor` | `vector(128)` | Face descriptor for pgvector search |
| `model_name` | `text` | Face model that generated the descriptor, for example `face-api.js/face_recognition_model` |
| `quality_score` | `float8` | Optional enrollment quality score |
| `image_url` | `text` | Optional profile or enrollment image URL |
| `is_active` | `boolean` | Whether this descriptor participates in matching |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Update timestamp |

Relationships:

- `member_id` references `members.id`.
- `organization_id` references `organizations.id`.

Recommended indexes:

- `(organization_id, member_id)`.
- `(organization_id, is_active)`.
- Vector index on `descriptor` after enough rows exist.

### `public.shifts`

Defines reusable work shifts. Added in Phase 3.

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Shift identifier |
| `organization_id` | `uuid` | Not null, FK to `organizations.id`, default `default_organization_id()` |
| `name` | `text` | Shift name, for example `Shift Pagi` |
| `start_time` | `time` | Local start time |
| `end_time` | `time` | Local end time |
| `tolerance_minutes` | `integer` | Minutes after start still considered on time |
| `very_late_after_minutes` | `integer` | Minutes after start considered very late |
| `color` | `text` | UI color token or hex value |
| `is_active` | `boolean` | Whether shift is assignable |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Update timestamp |

Relationships:

- Referenced by `shift_assignments.shift_id`.

Constraints and indexes:

- Unique `(organization_id, name)`.
- Check `tolerance_minutes >= 0`.
- Check `very_late_after_minutes >= tolerance_minutes`.
- Index `(organization_id, is_active)`.

RLS:

- Enabled.
- Authenticated admins can read shifts for their organization.
- `owner` and `admin` roles can manage shifts for their organization.

### `public.shift_assignments`

Assigns members to shifts per date. Added in Phase 3. This supports changing shifts day by day.

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Assignment identifier |
| `organization_id` | `uuid` | Not null, FK to `organizations.id`, default `default_organization_id()` |
| `member_id` | `uuid` | FK to `members.id` |
| `shift_id` | `uuid` | FK to `shifts.id` |
| `work_date` | `date` | Local scheduled work date |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Update timestamp |

Relationships:

- `member_id` references `members.id`.
- `shift_id` references `shifts.id`.
- `organization_id` references `organizations.id`.

Constraints and indexes:

- Unique `(organization_id, member_id, work_date)`.
- Index `(organization_id, work_date)`.
- Index `(member_id, work_date)`.
- Index `(shift_id)`.

RLS:

- Enabled.
- Authenticated admins can read assignments for their organization.
- `owner` and `admin` roles can manage assignments for their organization.

### `public.attendance_logs` - proposed changes

Expand the current check-in table into a shift-aware audit record.

| Field | Type | Purpose |
| --- | --- | --- |
| `organization_id` | `uuid` | FK to `organizations.id` |
| `member_id` | `uuid` | FK to `members.id` |
| `shift_id` | `uuid` | Nullable FK to `shifts.id` |
| `shift_assignment_id` | `uuid` | Nullable FK to `shift_assignments.id` |
| `matched_descriptor_id` | `uuid` | Nullable FK to `member_face_descriptors.id` |
| `check_in_at` | `timestamptz` | Check-in timestamp |
| `check_out_at` | `timestamptz` | Optional check-out timestamp |
| `work_date` | `date` | Organization-local attendance date |
| `status` | `attendance_status` | Classification result |
| `late_minutes` | `integer` | Minutes late based on shift |
| `worked_minutes` | `integer` | Total worked minutes after check-out |
| `face_distance` | `float8` | Raw pgvector distance for the match |
| `confidence` | `float8` | Normalized confidence for UI |
| `liveness_passed` | `boolean` | Whether liveness passed |
| `liveness_method` | `text` | Method used, for example `head_movement` |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Update timestamp |

Recommended constraints:

- Unique `(organization_id, member_id, work_date)` for check-in-only MVP.
- If future multiple sessions are allowed, replace with a partial unique index for open check-ins.
- Check `late_minutes >= 0`.
- Check `worked_minutes >= 0`.

### `public.liveness_challenges` - proposed optional

Use only if liveness needs server-issued challenges, auditability, or replay protection. If liveness remains entirely client-side, this table is not required.

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Challenge identifier |
| `organization_id` | `uuid` | Optional FK to `organizations.id` |
| `nonce` | `text` | Server-generated challenge token |
| `required_action` | `text` | Required liveness action, for example `head_turn_left_or_right_then_center` |
| `expires_at` | `timestamptz` | Challenge expiration |
| `verified_at` | `timestamptz` | Verification timestamp |
| `created_at` | `timestamptz` | Creation timestamp |

### `public.report_exports` - proposed optional

Use only if generated PDF reports are stored or audited. If reports are generated on demand, this table is not required.

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Report export identifier |
| `organization_id` | `uuid` | FK to `organizations.id` |
| `requested_by` | `uuid` | Auth user who generated the report |
| `report_month` | `date` | Month represented by the report |
| `format` | `text` | `pdf` or future export format |
| `storage_path` | `text` | Optional storage path |
| `status` | `text` | `pending`, `ready`, or `failed` |
| `created_at` | `timestamptz` | Creation timestamp |

## Proposed Relationships

```text
organizations.id
  -> admin_users.organization_id
  -> departments.organization_id
  -> members.organization_id
  -> shifts.organization_id
  -> shift_assignments.organization_id
  -> attendance_logs.organization_id
  -> member_face_descriptors.organization_id

auth.users.id
  -> admin_users.user_id

departments.id
  -> members.department_id

members.id
  -> member_face_descriptors.member_id
  -> shift_assignments.member_id
  -> attendance_logs.member_id

shifts.id
  -> shift_assignments.shift_id
  -> attendance_logs.shift_id

shift_assignments.id
  -> attendance_logs.shift_assignment_id

member_face_descriptors.id
  -> attendance_logs.matched_descriptor_id
```

## PGVector Usage Plan

The PRD requires server-side vector matching so descriptors are not fetched into the browser.

Planned changes:

1. Enable the `vector` extension.
2. Add `member_face_descriptors.descriptor vector(128)`.
3. Backfill descriptors from `members.face_descriptor`.
4. Add an RPC function such as `match_member_face`.
5. Query active descriptors by organization using vector distance.
6. Return only the best member match, distance, confidence, and descriptor id to the server route.
7. Insert attendance logs from the server after liveness and shift classification pass.
8. Stop selecting `members.face_descriptor` from public client components.

Recommended matching contract:

```sql
match_member_face(
  query_descriptor vector(128),
  match_threshold float8,
  match_count int,
  organization_id uuid
)
```

Recommended distance:

- Current code uses Euclidean distance through `faceapi.euclideanDistance`.
- Use pgvector L2 distance (`<->`) with a threshold calibrated against the current `0.55` browser threshold.
- Store the raw distance in `attendance_logs.face_distance`.
- Store a normalized UI confidence separately in `attendance_logs.confidence`.

Recommended vector index:

- Start without an approximate index for small datasets.
- Add HNSW or IVFFLAT once descriptor count justifies it.
- Keep the index scoped by `organization_id` and `is_active` filters in query planning.

## Realtime Plan

No separate realtime table is required for the MVP. Supabase Realtime should subscribe to database changes on:

- `attendance_logs` for live arrivals and status changes.
- `shift_assignments` for schedule dashboard updates if needed.
- `members` for roster changes if the dashboard needs live member counts.

Recommended realtime filters:

- Admin dashboard should subscribe only after auth.
- Filter by `organization_id`.
- Filter attendance views by current `work_date` where practical.

Optional future table:

- `system_events` or `audit_events` can be introduced if the product needs a unified event feed. It is not required by the current PRD.

## Migration Plan

### Phase 1 - Organization/Admin Foundation

- Added `organizations` and `admin_users`.
- Added nullable/defaulted `organization_id` columns to `members` and `attendance_logs`.
- Backfilled existing members, attendance logs, and existing Auth users into `Default Organization`.
- Added minimal RLS for reading linked organizations and a user's own admin profile.
- Preserved current public kiosk reads and inserts.

### Phase 2 - Organization-Scoped Admin Functionality

- Verified Phase 1 SQL was applied in the live Supabase project before implementation.
- Admin dashboard, member list, member deletion, member creation, and attendance log reads now use the current admin organization.
- New members created from the admin UI include `organization_id`.
- Public kiosk member lookup and attendance insert paths remain unchanged.
- RLS on `members` and `attendance_logs` remains intentionally permissive until the kiosk has a compatible server-side path.

### Phase 3 - Shift Management and Schedule Foundation

- Added `shifts` and `shift_assignments`.
- Added organization-scoped admin RLS for shifts and assignments.
- Added admin pages for `/dashboard/shifts` and `/dashboard/schedules`.
- Added standalone utility logic for assigned-shift lookup and check-in classification.
- Did not wire classification into the kiosk attendance insert flow.

### Phase 4 - Tighten Organization Boundaries

- Decide whether `departments` should be global or organization-scoped, then migrate if needed.
- Add stricter admin authorization checks if role-specific behavior is needed.
- Tighten RLS on `members` and `attendance_logs` only after the public kiosk has a compatible path.

### Phase 5 - Introduce Member Lifecycle Fields

- Add `employee_code`, `full_name`, `position`, and `status`.
- Backfill from `employee_id`, `name`, and `is_active`.
- Keep old columns temporarily or provide compatibility views until application code is migrated.

### Phase 6 - Move Face Descriptors To PGVector

- Enable `vector`.
- Create `member_face_descriptors`.
- Backfill from `members.face_descriptor`.
- Add matching RPC.
- Update the attendance scanner to call a server route instead of fetching descriptors.
- Remove or lock down client access to legacy `members.face_descriptor`.

### Phase 7 - Add Liveness And Attendance Audit Fields

- Add `liveness_passed`, `liveness_method`, `face_distance`, `late_minutes`, and `worked_minutes`.
- Add optional `liveness_challenges` only if server-issued challenges are implemented.
- Ensure failed liveness attempts are either recorded safely or returned without creating normal attendance logs.

### Phase 8 - Realtime And Reports

- Enable Supabase Realtime on the required tables.
- Add report generation routes.
- Add `report_exports` only if generated PDFs need storage or audit tracking.

## Do Not Migrate Aggressively Yet

- Do not drop `members.face_descriptor` until pgvector matching is working and the scanner no longer reads it.
- Do not replace `employee_id` or `name` abruptly without compatibility handling.
- Do not remove the unique daily attendance index without an equivalent duplicate-prevention rule.
- Do not make member photos private until the UI has a signed URL strategy.
- Do not add multi-organization RLS without backfilling existing records into an organization.
## Phase 10 Security Hardening (Implemented)

- Kiosk no longer relies on public `members.face_descriptor` fetch for matching.
- Attendance insert is moved behind server route `POST /api/attendance/check-in`.
- Member management should use soft deactivation (`is_active=false`) instead of destructive delete to avoid cascade history loss.

## Phase 11 RLS Lockdown (Implemented)

- Public row policies for broad `members`/`attendance_logs` access are removed.
- Kiosk access is served through security-definer RPCs:
  - `kiosk_active_members()`
  - `kiosk_today_checked_in()`
  - `secure_match_member_by_face(vector, float)`
  - `secure_attendance_check_in(uuid, float, boolean)`
