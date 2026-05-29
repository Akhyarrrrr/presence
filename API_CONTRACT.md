# Presence API Contract

This document describes the current API surface and the planned API surface for the PRD direction. The current app does not define local Next.js route handlers under `app/api`. Existing data access happens through Supabase Auth, Database, and Storage clients from Server Components and Client Components.

Current API contracts below are therefore documented as Supabase client contracts used by the app. Planned contracts are proposed Next.js route handlers and Supabase Realtime channels.

Phase 2 note: admin-side Supabase reads and writes for dashboard, members, member creation, member deletion, and attendance logs are now scoped to the current admin organization. Public kiosk scanner paths still use the existing unscoped MVP behavior.

Phase 3 note: shift management and schedule assignment are implemented as admin Supabase client contracts through `/dashboard/shifts` and `/dashboard/schedules`. Attendance classification utilities exist but are not wired into the kiosk insert flow yet.

## Shared Conventions

### Common Error Shape For Planned Route Handlers

```ts
type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'DUPLICATE_ATTENDANCE'
  | 'NO_FACE_DETECTED'
  | 'NO_FACE_MATCH'
  | 'LIVENESS_FAILED'
  | 'NO_SHIFT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

interface ApiErrorResponse {
  ok: false
  error: {
    code: ApiErrorCode
    message: string
    details?: Record<string, unknown>
  }
}
```

### Current Core Types

```ts
type AdminRole = 'owner' | 'admin' | 'viewer'

interface Organization {
  id: string
  name: string
  timezone: string
  created_at: string
  updated_at: string
}

interface AdminUser {
  id: string
  user_id: string
  organization_id: string
  role: AdminRole
  created_at: string
  updated_at: string
  organizations?: Organization | null
}

interface Department {
  id: string
  name: string
}

interface Member {
  id: string
  organization_id: string | null
  name: string
  employee_id: string
  department_id: string | null
  email: string | null
  photo_url: string | null
  face_descriptor: number[]
  is_active: boolean
  created_at: string
  updated_at: string
  departments?: Department
}

interface AttendanceLog {
  id: string
  organization_id: string | null
  member_id: string
  check_in_at: string
  confidence: number
  date: string
  created_at: string
  members?: Member
}
```

### Planned Core Types

```ts
type AdminRole = 'owner' | 'admin' | 'viewer'
type MemberStatus = 'active' | 'inactive' | 'archived'
type AttendanceStatus =
  | 'on_time'
  | 'late'
  | 'very_late'
  | 'no_shift'
  | 'liveness_failed'
  | 'unmatched'

interface PlannedMember {
  id: string
  organization_id: string
  employee_code: string
  full_name: string
  department_id: string | null
  department_name?: string | null
  position: string | null
  status: MemberStatus
  email: string | null
  photo_url: string | null
  created_at: string
  updated_at: string
}

interface PlannedAttendanceLog {
  id: string
  organization_id: string
  member_id: string
  shift_id: string | null
  shift_assignment_id: string | null
  check_in_at: string
  check_out_at: string | null
  work_date: string
  status: AttendanceStatus
  late_minutes: number
  worked_minutes: number | null
  face_distance: number | null
  confidence: number | null
  liveness_passed: boolean
  created_at: string
  updated_at: string
}
```

## Existing APIs

### Existing Auth APIs

#### Register Admin Account

| Field | Value |
| --- | --- |
| Current caller | `app/(auth)/register/page.tsx` |
| Client API | `supabase.auth.signUp` |
| Network route | Supabase Auth managed endpoint |
| Method | Supabase SDK managed |
| Auth required | No |

Request:

```ts
interface RegisterRequest {
  email: string
  password: string
}
```

Response:

```ts
interface RegisterResponse {
  user: unknown | null
  session: unknown | null
}
```

Error behavior:

```ts
interface RegisterError {
  message: string
}
```

Notes:

- The current UI positions this route as "Create Organization / Owner Account" onboarding.
- The current app redirects to `/login` after sign-up and shows a confirmation toast.
- Phase 1 SQL creates an `admin_users` row for new Auth users through `public.handle_new_admin_user()`.
- MVP behavior still allows public sign-up to enter the default owner/admin bootstrap path; invitation/approval for additional admins is a planned hardening phase.

#### Login Admin

| Field | Value |
| --- | --- |
| Current caller | `app/(auth)/login/page.tsx` |
| Client API | `supabase.auth.signInWithPassword` |
| Network route | Supabase Auth managed endpoint |
| Method | Supabase SDK managed |
| Auth required | No |

Request:

```ts
interface LoginRequest {
  email: string
  password: string
}
```

Response:

```ts
interface LoginResponse {
  user: unknown
  session: unknown
}
```

Error behavior:

```ts
interface LoginError {
  message: string
}
```

Notes:

- On success the app navigates to `/dashboard`.
- `middleware.ts` also redirects authenticated users away from `/login` and `/register`.

#### Get Current User

| Field | Value |
| --- | --- |
| Current caller | `middleware.ts`, `app/page.tsx`, `app/(admin)/layout.tsx`, `app/(admin)/members/new/page.tsx` |
| Client API | `supabase.auth.getUser` |
| Auth required | Optional |

Response:

```ts
interface GetUserResponse {
  user: {
    id: string
    email?: string
  } | null
}
```

Error behavior:

- Current code does not surface errors. It treats missing users as unauthenticated.

#### Logout Admin

| Field | Value |
| --- | --- |
| Current caller | `app/(admin)/AdminShell.tsx` |
| Client API | `supabase.auth.signOut` |
| Auth required | Yes |

Response:

```ts
interface LogoutResponse {
  error: { message: string } | null
}
```

### Existing Organization/Admin Helpers

These are local TypeScript helpers, not HTTP APIs. They prepare the app for organization-aware data access without changing the current kiosk flow.

#### Get Current Admin Context

| Field | Value |
| --- | --- |
| Current helper | `getCurrentAdminContext` |
| File | `lib/supabase/organization.ts` |
| Auth required | Yes |
| Database tables | `admin_users`, `organizations` |

Input:

```ts
interface GetCurrentAdminContextInput {
  supabase: SupabaseClient
}
```

Response:

```ts
interface CurrentAdminContext {
  user: User
  adminUser: AdminUser
  organization: Organization
}
```

Error behavior:

```ts
type CurrentAdminContextResult = CurrentAdminContext | null
```

Notes:

- Returns `null` when there is no authenticated user, no linked admin profile, or no linked organization.
- Existing pages do not depend on this helper yet, so a missing live migration will not break the current UI.

#### Scope Query To Organization

| Field | Value |
| --- | --- |
| Current helper | `scopeToOrganization` |
| File | `lib/supabase/organization.ts` |
| Auth required | Caller-dependent |

Input:

```ts
interface ScopeToOrganizationInput<TQuery> {
  query: TQuery
  organizationId: string | null | undefined
}
```

Response:

```ts
type ScopeToOrganizationResponse<TQuery> = TQuery
```

Behavior:

- Applies `.eq('organization_id', organizationId)` when an organization id exists.
- Returns the original query unchanged when no organization id is available.

### Existing Department APIs

#### List Departments

| Field | Value |
| --- | --- |
| Current caller | `app/(admin)/members/new/page.tsx` |
| Client API | `supabase.from('departments').select('*').order('name')` |
| Equivalent method | `GET` |
| Equivalent route | Supabase REST `/rest/v1/departments?select=*&order=name.asc` |
| Auth required by route | Yes, because page is protected |
| RLS requirement today | Public select is allowed |

Request:

```ts
interface ListDepartmentsRequest {}
```

Response:

```ts
type ListDepartmentsResponse = Department[]
```

Error responses:

- Current UI does not render a dedicated error state for department load failure.

### Existing Member APIs

#### List Members For Admin Directory

| Field | Value |
| --- | --- |
| Current caller | `app/(admin)/members/page.tsx` |
| Client API | `supabase.from('members').select('*, departments(name)').order('created_at', { ascending: false })` |
| Equivalent method | `GET` |
| Equivalent route | Supabase REST `/rest/v1/members?select=*,departments(name)&order=created_at.desc` |
| Auth required by route | Yes |
| RLS requirement today | Public select is allowed |

Request:

```ts
interface ListMembersRequest {}
```

Response:

```ts
type ListMembersResponse = Member[]
```

Error responses:

- Current UI falls back to an empty list if `members` is null.

#### Register Member

| Field | Value |
| --- | --- |
| Current caller | `app/(admin)/members/new/RegisterMemberClient.tsx` |
| Client API | `supabase.from('members').insert(...)` |
| Equivalent method | `POST` |
| Equivalent route | Supabase REST `/rest/v1/members` |
| Auth required | Yes |
| RLS requirement today | Authenticated users can manage members |

Request:

```ts
interface RegisterMemberRequest {
  name: string
  employee_id: string
  department_id: string | null
  email: string | null
  face_descriptor: number[]
  photo_url: string | null
}
```

Response:

```ts
interface RegisterMemberResponse {
  id: string
}
```

Current error responses:

```ts
type RegisterMemberError =
  | { message: 'Employee ID already exists' }
  | { message: string }
```

Notes:

- The face descriptor is generated in the browser by `FaceCapture`.
- The current insert does not request the inserted row back.
- Phase 1 database defaults fill `organization_id` with `Default Organization` when the client does not send it.

#### Delete Member

| Field | Value |
| --- | --- |
| Current caller | `app/(admin)/members/MembersClient.tsx` |
| Client API | `supabase.from('members').delete().eq('id', id)` |
| Equivalent method | `DELETE` |
| Equivalent route | Supabase REST `/rest/v1/members?id=eq.{id}` |
| Auth required | Yes |
| RLS requirement today | Authenticated users can manage members |

Request:

```ts
interface DeleteMemberRequest {
  id: string
}
```

Response:

```ts
interface DeleteMemberResponse {
  ok: true
}
```

Error responses:

```ts
interface DeleteMemberError {
  message: 'Failed to remove member' | string
}
```

Risk:

- Current database uses `on delete cascade` from members to attendance logs, so deleting a member deletes attendance history.

### Existing Member Photo Storage APIs

#### Upload Member Photo

| Field | Value |
| --- | --- |
| Current caller | `app/(admin)/members/new/RegisterMemberClient.tsx` |
| Client API | `supabase.storage.from('member-photos').upload(filename, blob, { contentType: 'image/jpeg' })` |
| Equivalent method | Supabase Storage upload |
| Auth required | Yes |
| Storage policy today | Authenticated users can upload to `member-photos` |

Request:

```ts
interface UploadMemberPhotoRequest {
  filename: string
  contentType: 'image/jpeg'
  body: Blob
}
```

Response:

```ts
interface UploadMemberPhotoResponse {
  path: string
}
```

Error behavior:

- Current code continues registration with `photo_url = null` if upload fails.

#### Get Public Member Photo URL

| Field | Value |
| --- | --- |
| Current caller | `app/(admin)/members/new/RegisterMemberClient.tsx` |
| Client API | `supabase.storage.from('member-photos').getPublicUrl(filename)` |
| Auth required | No for public URL generation |

Response:

```ts
interface GetPublicPhotoUrlResponse {
  publicUrl: string
}
```

### Existing Attendance APIs

#### List Active Members For Public Scanner

| Field | Value |
| --- | --- |
| Current caller | `components/camera/AttendanceScanner.tsx` |
| Client API | `supabase.from('members').select('*').eq('is_active', true)` |
| Equivalent method | `GET` |
| Equivalent route | Supabase REST `/rest/v1/members?select=*&is_active=eq.true` |
| Auth required | No |
| RLS requirement today | Public select is allowed |

Request:

```ts
interface ListScannerMembersRequest {
  is_active: true
}
```

Response:

```ts
type ListScannerMembersResponse = Member[]
```

Security note:

- This response currently includes `face_descriptor`. This is a known MVP gap and must not be copied into planned APIs.

#### List Today Attendance Member IDs

| Field | Value |
| --- | --- |
| Current caller | `components/camera/AttendanceScanner.tsx` |
| Client API | `supabase.from('attendance_logs').select('member_id').eq('date', today)` |
| Equivalent method | `GET` |
| Equivalent route | Supabase REST `/rest/v1/attendance_logs?select=member_id&date=eq.{YYYY-MM-DD}` |
| Auth required | No |
| RLS requirement today | Public select is allowed |

Request:

```ts
interface ListTodayAttendanceRequest {
  date: string
}
```

Response:

```ts
type ListTodayAttendanceResponse = Array<{ member_id: string }>
```

#### Record Attendance Check-In

| Field | Value |
| --- | --- |
| Current caller | `components/camera/AttendanceScanner.tsx` |
| Client API | `supabase.from('attendance_logs').insert({ member_id, confidence, date })` |
| Equivalent method | `POST` |
| Equivalent route | Supabase REST `/rest/v1/attendance_logs` |
| Auth required | No |
| RLS requirement today | Public insert is allowed |

Request:

```ts
interface RecordAttendanceRequest {
  member_id: string
  confidence: number
  date: string
}
```

Response:

```ts
interface RecordAttendanceResponse {
  ok: true
}
```

Error responses:

```ts
type RecordAttendanceError =
  | { code: '23505'; message: 'Duplicate attendance for member and date' }
  | { message: string }
```

Notes:

- Duplicate attendance is prevented by the unique index `attendance_member_date_unique`.
- Current app ignores duplicate error `23505`.
- Phase 1 database defaults fill `organization_id` with `Default Organization` when the public kiosk does not send it.

#### Dashboard Attendance Metrics

| Field | Value |
| --- | --- |
| Current caller | `app/(admin)/dashboard/page.tsx` |
| Client APIs | Counts and selects against `members` and `attendance_logs` |
| Equivalent method | `GET` |
| Auth required by route | Yes |
| RLS requirement today | Member and attendance select are public |

Request:

```ts
interface DashboardMetricsRequest {
  today: string
  thirtyDaysAgo: string
}
```

Response:

```ts
interface DashboardMetricsResponse {
  totalMembers: number
  todayCount: number
  last30Days: Array<{ date: string }>
  recentLogs: Array<AttendanceLog>
}
```

#### List Attendance Logs By Date

| Field | Value |
| --- | --- |
| Current caller | `app/(admin)/logs/page.tsx` |
| Client API | `supabase.from('attendance_logs').select('*, members(name, employee_id, photo_url, departments(name))').eq('date', selectedDate).order('check_in_at', { ascending: false })` |
| Equivalent method | `GET` |
| Equivalent route | Supabase REST `/rest/v1/attendance_logs?select=*,members(name,employee_id,photo_url,departments(name))&date=eq.{YYYY-MM-DD}&order=check_in_at.desc` |
| Auth required by route | Yes |
| RLS requirement today | Public select is allowed |

Request:

```ts
interface ListAttendanceLogsRequest {
  date: string
}
```

Response:

```ts
type ListAttendanceLogsResponse = Array<
  AttendanceLog & {
    members?: Pick<Member, 'name' | 'employee_id' | 'photo_url'> & {
      departments?: Pick<Department, 'name'>
    }
  }
>
```

### Existing Face Enrollment And Matching APIs

Current implementation uses server-side matching for kiosk attendance.

Current client functions still used in the browser:

```ts
loadModels(): Promise<void>
getFaceDescriptor(input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<Float32Array | null>
getAllFaceDetections(input: HTMLVideoElement | HTMLCanvasElement): Promise<Detection[]>
```

Current behavior:

- Enrollment generates a descriptor in the browser and writes to both `members.face_descriptor` and `member_face_descriptors`.
- Attendance sends descriptor to `POST /api/face/match` for server-side pgvector matching.
- Liveness verification exists in kiosk UI and uses head-movement challenge states.

### Existing Realtime APIs

No Supabase Realtime channels are currently used by the app.

## Planned APIs

Planned APIs should be implemented as Next.js route handlers under `app/api` for sensitive work. Each route must validate input, verify auth where required, enforce organization scope, and return the common error shape.

Shift and schedule management currently exist through direct Supabase admin UI calls. Future route handlers may wrap these contracts if privileged server-only validation or audit logging is needed.

### Planned Auth And Session APIs

Supabase Auth should remain the identity provider. Planned local APIs should verify the session server-side and derive authorization from `admin_users`.

#### Get Current Admin Session

| Field | Value |
| --- | --- |
| Route | `/api/auth/session` |
| Method | `GET` |
| Auth required | Yes |

Response:

```ts
interface GetAdminSessionResponse {
  ok: true
  user: {
    id: string
    email: string | null
  }
  admin: {
    organization_id: string
    role: AdminRole
  }
}
```

Errors:

```ts
type GetAdminSessionError = ApiErrorResponse // UNAUTHORIZED | FORBIDDEN
```

### Planned Member APIs

#### List Members

| Field | Value |
| --- | --- |
| Route | `/api/members` |
| Method | `GET` |
| Auth required | Admin |

Query:

```ts
interface ListMembersQuery {
  status?: MemberStatus
  department_id?: string
  search?: string
  limit?: number
  cursor?: string
}
```

Response:

```ts
interface ListMembersPlannedResponse {
  ok: true
  data: PlannedMember[]
  next_cursor: string | null
}
```

Errors:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`

#### Create Member

| Field | Value |
| --- | --- |
| Route | `/api/members` |
| Method | `POST` |
| Auth required | Admin |

Request:

```ts
interface CreateMemberRequest {
  employee_code: string
  full_name: string
  department_id?: string | null
  position?: string | null
  email?: string | null
  status?: MemberStatus
}
```

Response:

```ts
interface CreateMemberResponse {
  ok: true
  data: PlannedMember
}
```

Errors:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `CONFLICT` for duplicate employee code

#### Update Member

| Field | Value |
| --- | --- |
| Route | `/api/members/[memberId]` |
| Method | `PATCH` |
| Auth required | Admin |

Request:

```ts
interface UpdateMemberRequest {
  employee_code?: string
  full_name?: string
  department_id?: string | null
  position?: string | null
  email?: string | null
  status?: MemberStatus
}
```

Response:

```ts
interface UpdateMemberResponse {
  ok: true
  data: PlannedMember
}
```

Errors:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`

#### Deactivate Member

| Field | Value |
| --- | --- |
| Route | `/api/members/[memberId]` |
| Method | `DELETE` |
| Auth required | Admin |

Response:

```ts
interface DeactivateMemberResponse {
  ok: true
  data: {
    id: string
    status: 'inactive'
  }
}
```

Errors:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`

Rule:

- Prefer soft-deactivation over physical deletion to preserve attendance history.

### Planned Face Enrollment APIs

#### Enroll Member Face Descriptor

| Field | Value |
| --- | --- |
| Route | `/api/members/[memberId]/face-enrollment` |
| Method | `POST` |
| Auth required | Admin |

Request:

```ts
interface FaceEnrollmentRequest {
  descriptor: number[] // length 128
  model_name: 'face-api.js/face_recognition_model'
  image_data_url?: string
  quality_score?: number
}
```

Response:

```ts
interface FaceEnrollmentResponse {
  ok: true
  data: {
    descriptor_id: string
    member_id: string
    is_active: true
    created_at: string
  }
}
```

Errors:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `NO_FACE_DETECTED`

Rules:

- Validate descriptor length and numeric values.
- Store descriptor in `member_face_descriptors.descriptor vector(128)`.
- Do not return stored descriptor values.

### Planned Liveness APIs

#### Create Liveness Challenge

Use this only if the liveness flow needs server-issued challenges or replay protection.

| Field | Value |
| --- | --- |
| Route | `/api/liveness/challenge` |
| Method | `POST` |
| Auth required | No for public kiosk |

Request:

```ts
interface CreateLivenessChallengeRequest {
  kiosk_id?: string
}
```

Response:

```ts
interface CreateLivenessChallengeResponse {
  ok: true
  data: {
    challenge_id: string
    nonce: string
    required_action: 'head_turn_left_or_right_then_center'
    expires_at: string
  }
}
```

Errors:

- `RATE_LIMITED`
- `INTERNAL_ERROR`

#### Verify Liveness

| Field | Value |
| --- | --- |
| Route | `/api/liveness/verify` |
| Method | `POST` |
| Auth required | No for public kiosk |

Request:

```ts
interface VerifyLivenessRequest {
  challenge_id?: string
  movement_trace?: Array<{
    t_ms: number
    nose_offset_ratio: number
  }>
  duration_ms: number
}
```

Response:

```ts
interface VerifyLivenessResponse {
  ok: true
  data: {
    liveness_token: string
    method: 'head_movement'
    passed: true
    expires_at: string
  }
}
```

Errors:

- `VALIDATION_ERROR`
- `LIVENESS_FAILED`
- `RATE_LIMITED`

Rules:

- Kiosk UX uses stable face -> slight head turn (left or right) -> return center.
- A failed verification must not create a normal attendance log.

### Planned PGVector Face Matching APIs

#### Match Face Descriptor

| Field | Value |
| --- | --- |
| Route | `/api/face/match` |
| Method | `POST` |
| Auth required | Public kiosk, rate-limited |

Request:

```ts
interface FaceMatchRequest {
  descriptor: number[] // length 128
  liveness_token?: string
  match_threshold?: number
}
```

Response:

```ts
interface FaceMatchResponse {
  ok: true
  data: {
    matched: boolean
    member?: {
      id: string
      employee_code: string
      full_name: string
      photo_url: string | null
      department_name: string | null
    }
    descriptor_id?: string
    distance?: number
    confidence?: number
  }
}
```

Errors:

- `VALIDATION_ERROR`
- `LIVENESS_FAILED`
- `NO_FACE_MATCH`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

Rules:

- Server calls a Supabase RPC such as `match_member_face`.
- Response must never include descriptor vectors.
- Match should filter by active organization and active descriptors.

### Planned Attendance APIs

#### Check In

This is the primary planned public kiosk endpoint. It should combine liveness verification, server-side face matching, shift lookup, classification, and attendance insertion.

| Field | Value |
| --- | --- |
| Route | `/api/attendance/check-in` |
| Method | `POST` |
| Auth required | Public kiosk, rate-limited |

Request:

```ts
interface AttendanceCheckInRequest {
  descriptor: number[] // length 128
  liveness_token: string
  captured_at?: string
  kiosk_id?: string
}
```

Response:

```ts
interface AttendanceCheckInResponse {
  ok: true
  data: {
    attendance: PlannedAttendanceLog
    member: {
      id: string
      employee_code: string
      full_name: string
      department_name: string | null
      photo_url: string | null
    }
    shift: {
      id: string
      name: string
      start_time: string
      end_time: string
    } | null
    message: string
  }
}
```

Errors:

- `VALIDATION_ERROR`
- `LIVENESS_FAILED`
- `NO_FACE_MATCH`
- `DUPLICATE_ATTENDANCE`
- `NO_SHIFT`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

Rules:

- If no shift exists, return or store `status: 'no_shift'` according to product decision.
- Duplicate check-ins must be idempotent and should return a clear duplicate response.
- The route should compute `work_date` from organization timezone, not browser timezone.

#### List Attendance Logs

| Field | Value |
| --- | --- |
| Route | `/api/attendance` |
| Method | `GET` |
| Auth required | Admin |

Query:

```ts
interface ListAttendanceQuery {
  date?: string
  from?: string
  to?: string
  member_id?: string
  department_id?: string
  status?: AttendanceStatus
  limit?: number
  cursor?: string
}
```

Response:

```ts
interface ListAttendanceResponse {
  ok: true
  data: Array<
    PlannedAttendanceLog & {
      member: Pick<PlannedMember, 'id' | 'employee_code' | 'full_name' | 'photo_url'>
      shift: { id: string; name: string } | null
    }
  >
  next_cursor: string | null
}
```

Errors:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`

#### Check Out

| Field | Value |
| --- | --- |
| Route | `/api/attendance/[attendanceId]/check-out` |
| Method | `PATCH` |
| Auth required | Admin or future member-authenticated flow |

Request:

```ts
interface AttendanceCheckOutRequest {
  check_out_at?: string
}
```

Response:

```ts
interface AttendanceCheckOutResponse {
  ok: true
  data: PlannedAttendanceLog
}
```

Errors:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`

### Existing Shift APIs

The current implementation uses Supabase client calls from the admin UI rather than local route handlers.

#### List Shifts

| Field | Value |
| --- | --- |
| Current caller | `/dashboard/shifts` |
| Client API | `supabase.from('shifts').select('*').eq('organization_id', organizationId)` |
| Equivalent method | `GET` |
| Auth required | Admin |

Query:

```ts
interface ListShiftsQuery {
  is_active?: boolean
}
```

Response:

```ts
interface Shift {
  id: string
  organization_id: string
  name: string
  start_time: string
  end_time: string
  tolerance_minutes: number
  very_late_after_minutes: number
  color: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ListShiftsResponse {
  ok: true
  data: Shift[]
}
```

#### Create Shift

| Field | Value |
| --- | --- |
| Current caller | `/dashboard/shifts` |
| Client API | `supabase.from('shifts').insert(...)` |
| Equivalent method | `POST` |
| Auth required | Admin |

Request:

```ts
interface CreateShiftRequest {
  name: string
  start_time: string
  end_time: string
  tolerance_minutes: number
  very_late_after_minutes: number
  color?: string | null
}
```

Response:

```ts
interface CreateShiftResponse {
  ok: true
  data: Shift
}
```

Errors:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `CONFLICT`

#### Update Shift Or Deactivate Shift

| Field | Value |
| --- | --- |
| Current caller | `/dashboard/shifts` |
| Client API | `supabase.from('shifts').update(...).eq('id', shiftId).eq('organization_id', organizationId)` |
| Equivalent method | `PATCH` |
| Auth required | Admin |

Request:

```ts
interface UpdateShiftRequest {
  name?: string
  start_time?: string
  end_time?: string
  tolerance_minutes?: number
  very_late_after_minutes?: number
  color?: string | null
  is_active?: boolean
}
```

Response:

```ts
interface UpdateShiftResponse {
  ok: true
  data: Shift
}
```

### Existing Schedule APIs

The current implementation uses Supabase client calls from the admin UI rather than local route handlers.

#### List Shift Assignments

| Field | Value |
| --- | --- |
| Current caller | `/dashboard/schedules` |
| Client API | `supabase.from('shift_assignments').select(...).eq('organization_id', organizationId).eq('work_date', date)` |
| Equivalent method | `GET` |
| Auth required | Admin |

Query:

```ts
interface ListSchedulesQuery {
  date?: string
  from?: string
  to?: string
  member_id?: string
  department_id?: string
}
```

Response:

```ts
interface ShiftAssignment {
  id: string
  organization_id: string
  member_id: string
  shift_id: string
  work_date: string
  created_at: string
  updated_at: string
  member?: Pick<PlannedMember, 'id' | 'employee_code' | 'full_name'>
  shift?: Pick<Shift, 'id' | 'name' | 'start_time' | 'end_time' | 'color'>
}

interface ListSchedulesResponse {
  ok: true
  data: ShiftAssignment[]
}
```

#### Assign Or Update Shift

| Field | Value |
| --- | --- |
| Current caller | `/dashboard/schedules` |
| Client API | Insert or update `shift_assignments` for `(organization_id, member_id, work_date)` |
| Equivalent method | `POST` or `PATCH` |
| Auth required | Admin |

Request:

```ts
interface AssignShiftRequest {
  member_id: string
  shift_id: string
  work_date: string
}
```

Response:

```ts
interface AssignShiftResponse {
  ok: true
  data: ShiftAssignment
}
```

Errors:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `CONFLICT`

#### Bulk Assign Shifts

| Field | Value |
| --- | --- |
| Route | `/api/schedules/bulk` |
| Method | `POST` |
| Auth required | Admin |

Request:

```ts
interface BulkAssignShiftsRequest {
  assignments: Array<{
    member_id: string
    shift_id: string
    work_date: string
  }>
  overwrite?: boolean
}
```

Response:

```ts
interface BulkAssignShiftsResponse {
  ok: true
  data: {
    created: number
    updated: number
    skipped: number
  }
}
```

### Planned Report APIs

#### Monthly Attendance Report

| Field | Value |
| --- | --- |
| Route | `/api/reports/monthly` |
| Method | `GET` |
| Auth required | Admin |

Query:

```ts
interface MonthlyReportQuery {
  month: string // YYYY-MM
  department_id?: string
  format?: 'json' | 'pdf'
}
```

JSON response:

```ts
interface MonthlyReportJsonResponse {
  ok: true
  data: {
    month: string
    totals: {
      members: number
      work_days: number
      check_ins: number
      on_time: number
      late: number
      very_late: number
      no_shift: number
      absences: number
    }
    members: Array<{
      member_id: string
      employee_code: string
      full_name: string
      department_name: string | null
      total_present: number
      total_late: number
      total_very_late: number
      total_late_minutes: number
      total_worked_minutes: number
    }>
  }
}
```

PDF response:

```ts
type MonthlyReportPdfResponse = Blob // application/pdf
```

Errors:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `INTERNAL_ERROR`

Rules:

- PDF generation should happen server-side.
- If PDFs are stored, create or update `report_exports`.

### Planned Realtime Contracts

Realtime should use Supabase Realtime channels rather than local polling APIs.

#### Attendance Stream

| Field | Value |
| --- | --- |
| Channel | `presence:attendance:{organizationId}:{workDate}` |
| Source table | `attendance_logs` |
| Events | `INSERT`, `UPDATE` |
| Auth required | Admin |

Payload:

```ts
interface AttendanceRealtimePayload {
  eventType: 'INSERT' | 'UPDATE'
  new: PlannedAttendanceLog
  old?: Partial<PlannedAttendanceLog>
}
```

Rules:

- Subscribe only after verifying the admin session.
- Filter by `organization_id`.
- Prefer current `work_date` filters for dashboard views.

#### Schedule Stream

| Field | Value |
| --- | --- |
| Channel | `presence:schedules:{organizationId}` |
| Source table | `shift_assignments` |
| Events | `INSERT`, `UPDATE`, `DELETE` |
| Auth required | Admin |

Payload:

```ts
interface ScheduleRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: ShiftAssignment
  old?: Partial<ShiftAssignment>
}
```

## Planned Implementation Order

1. Apply the Phase 3 SQL block in Supabase before relying on shift and schedule pages in production.
2. Tighten admin authorization and RLS only after the public kiosk has a compatible path.
3. Decide when to wire shift-aware classification into attendance inserts.
4. Add `member_face_descriptors` with pgvector and matching RPC.
5. Replace public descriptor reads with `/api/attendance/check-in` or `/api/face/match`.
6. Add liveness verification to the kiosk flow.
7. Add realtime dashboard subscriptions.
8. Add report generation.

## Compatibility Rules

- Existing direct Supabase calls can remain while planned route handlers are introduced incrementally.
- Do not remove current member enrollment until face enrollment API is working.
- Do not remove `attendance_logs.date` until `work_date` is backfilled and all reads use it.
- Do not return descriptor vectors from any planned API.
- Do not make reports depend on proposed fields until migrations are complete.
## Phase 10 Security Hardening (Implemented)

### `POST /api/attendance/check-in`

Server-side attendance write endpoint used by kiosk after liveness + server match.

```ts
type CheckInRequest = {
  member_id: string // UUID
  confidence: number // 0..1
  distance?: number | null
  liveness_verified: true
}
```

```ts
type CheckInSuccess = {
  ok: true
  status: 'on_time' | 'late' | 'very_late' | 'no_shift'
  late_minutes: number
  shift_id: string | null
}

type CheckInDuplicate = { duplicate: true }
type CheckInError = { error: string }
```

- Auth: public kiosk allowed through server route.
- Validation: UUID, confidence range, liveness flag.
- Server recomputes shift classification.
- Duplicate same-day member check-in returns `409 { duplicate: true }`.

## Phase 11 RLS Lockdown (Implemented)

- Kiosk bootstrap uses `GET /api/attendance/bootstrap`, backed by security-definer RPCs (`kiosk_active_members`, `kiosk_today_checked_in`).
- Face match uses `secure_match_member_by_face` RPC.
- Check-in uses `secure_attendance_check_in` RPC.
- Broad public table policies are removed in favor of RPC-based access.
