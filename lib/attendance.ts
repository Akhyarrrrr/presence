import type { AttendanceStatus, Shift, ShiftAssignment } from '@/types'

export interface AttendanceClassification {
  status: AttendanceStatus
  late_minutes: number
  shift: Shift | null
  assignment: ShiftAssignment | null
}

export function findAssignedShiftForDate(
  assignments: ShiftAssignment[],
  memberId: string,
  workDate: string
): ShiftAssignment | null {
  return (
    assignments.find(
      (assignment) => assignment.member_id === memberId && assignment.work_date === workDate
    ) ?? null
  )
}

export function classifyCheckInStatus({
  checkInAt,
  workDate,
  assignment,
}: {
  checkInAt: Date
  workDate: string
  assignment: ShiftAssignment | null
}): AttendanceClassification {
  const shift = assignment?.shifts ?? null

  if (!assignment || !shift) {
    return {
      status: 'no_shift',
      late_minutes: 0,
      shift: null,
      assignment,
    }
  }

  const shiftStart = buildLocalDateTime(workDate, shift.start_time)
  const lateMinutes = Math.max(0, Math.floor((checkInAt.getTime() - shiftStart.getTime()) / 60000))

  if (lateMinutes <= shift.tolerance_minutes) {
    return {
      status: 'on_time',
      late_minutes: lateMinutes,
      shift,
      assignment,
    }
  }

  if (lateMinutes >= shift.very_late_after_minutes) {
    return {
      status: 'very_late',
      late_minutes: lateMinutes,
      shift,
      assignment,
    }
  }

  return {
    status: 'late',
    late_minutes: lateMinutes,
    shift,
    assignment,
  }
}

function buildLocalDateTime(workDate: string, time: string): Date {
  const normalizedTime = time.length === 5 ? `${time}:00` : time
  return new Date(`${workDate}T${normalizedTime}`)
}
