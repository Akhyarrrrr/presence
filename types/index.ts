export type AdminRole = 'owner' | 'admin' | 'viewer'
export type AttendanceStatus = 'on_time' | 'late' | 'very_late' | 'no_shift'

export interface Organization {
  id: string
  name: string
  slug: string
  owner_name?: string | null
  timezone: string
  created_at: string
  updated_at: string
}

export interface AdminUser {
  id: string
  user_id: string
  organization_id: string
  role: AdminRole
  created_at: string
  updated_at: string
  organizations?: Organization | null
}

export interface AdminInvitation {
  id: string
  organization_id: string
  email: string
  role: 'admin' | 'viewer'
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface Department {
  id: string
  name: string
}

export interface Member {
  id: string
  organization_id: string | null
  name: string
  employee_id: string
  department_id: string | null
  email: string | null
  photo_url: string | null
  face_descriptor: number[] | null
  is_active: boolean
  created_at: string
  updated_at: string
  departments?: Department
}

export interface AttendanceLog {
  id: string
  organization_id: string | null
  member_id: string
  shift_id?: string | null
  status?: AttendanceStatus | null
  late_minutes?: number | null
  check_in_at: string
  check_out_at?: string | null
  verification_method?: string | null
  correction_reason?: string | null
  confidence: number
  date: string
  created_at: string
  members?: Member
}

export interface Shift {
  id: string
  organization_id: string
  name: string
  start_time: string
  end_time: string
  tolerance_minutes: number
  very_late_after_minutes: number
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ShiftAssignment {
  id: string
  organization_id: string
  member_id: string
  shift_id: string
  work_date: string
  created_at: string
  updated_at: string
  members?: Member
  shifts?: Shift
}

export interface FaceMatch {
  member: Member
  distance: number
  confidence: number
}
