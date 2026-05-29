# Presence Manual Testing Checklist

Use this checklist for demo-day and release verification. Mark each item as `PASS` or `FAIL`.

| Area | Test Case | Expected Result | PASS/FAIL |
| --- | --- | --- | --- |
| Auth | Open `/register` | Page copy explains Owner/workspace onboarding |  |
| Auth | Create account from `/register` | Account is created and redirected to `/login` |  |
| Auth | Open `/login` | Page copy says Workspace Login / Owner/Admin |  |
| Auth | Login with valid Owner/Admin account | Redirected to `/dashboard` |  |
| Members | Open `/members/new` | Member registration form loads with camera capture |  |
| Members | Register member with existing department | Member saved and visible in `/members` |  |
| Members | Register member with custom department | Department created and member linked to it |  |
| Members | Register custom department duplicate name | Friendly warning: select existing department from list |  |
| Enrollment | Complete face capture | Face capture status shows ready and allows submit |  |
| Enrollment | Submit member registration | `members` row + `member_face_descriptors` row both saved |  |
| Data Check | Query `member_face_descriptors` | Descriptor row exists for newly enrolled member |  |
| Kiosk Bootstrap | Open `/attendance` while roster exists | Roster count > 0 and scanner starts |  |
| Kiosk Liveness | Perform liveness challenge | Flow: stable face (~2s) -> slight left/right turn -> return center -> verified |  |
| Kiosk Match | After liveness verified, recognized face appears | Server-side match returns member label/confidence |  |
| Attendance Insert | Successful check-in | Success toast appears, coverage updates, recent check-in appears |  |
| Duplicate Guard | Scan same member again same day | Duplicate is blocked gracefully, no second log row |  |
| Classification | Check-in without assignment | Stored status is `no_shift` |  |
| Classification | Check-in with assigned shift | Stored status reflects `on_time` / `late` / `very_late` correctly |  |
| Realtime | Keep dashboard open during check-in | Recent attendance feed updates without refresh |  |
| Reports | Open `/dashboard/reports` and pick month | Monthly summary renders and download works |  |
| Production Demo | End-to-end run | Register Owner -> login -> add member -> kiosk verify/match/check-in -> dashboard/reports update |  |

## Quick SQL Verification Snippets

```sql
-- latest descriptors
select member_id, organization_id, created_at
from public.member_face_descriptors
order by created_at desc
limit 10;
```

```sql
-- latest attendance rows
select member_id, date, status, late_minutes, shift_id, confidence
from public.attendance_logs
order by created_at desc
limit 20;
```
