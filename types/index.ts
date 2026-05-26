export interface Department {
  id: string
  name: string
}

export interface Member {
  id: string
  name: string
  employee_id: string
  department_id: string | null
  email: string | null
  photo_url: string | null
  face_descriptor: number[]
  is_active: boolean
  created_at: string
  departments?: Department
}

export interface AttendanceLog {
  id: string
  member_id: string
  check_in_at: string
  confidence: number
  date: string
  created_at: string
  members?: Member
}

export interface FaceMatch {
  member: Member
  distance: number
  confidence: number
}
