'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, CalendarDays, CheckCircle, Loader2, Save, Users } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Button,
  EmptyState,
  Field,
  MemberAvatar,
  SelectField,
  StatTile,
  StatusBadge,
  StatusPill,
  Surface,
  TextInput,
} from '@/components/ui/presence-ui'
import type { Department, Member, Shift, ShiftAssignment } from '@/types'

export default function SchedulesClient({
  organizationId,
  selectedDate,
  selectedDepartmentId,
  departments,
  members,
  shifts,
  assignments,
}: Readonly<{
  organizationId: string
  selectedDate: string
  selectedDepartmentId: string
  departments: Department[]
  members: Member[]
  shifts: Shift[]
  assignments: ShiftAssignment[]
}>) {
  const router = useRouter()
  const [memberId, setMemberId] = useState('')
  const [shiftId, setShiftId] = useState('')
  const [saving, setSaving] = useState(false)
  const [validation, setValidation] = useState<string | null>(null)

  const assignedMemberIds = useMemo(
    () => new Set(assignments.map((assignment) => assignment.member_id)),
    [assignments]
  )
  const unassignedCount = Math.max(members.length - assignedMemberIds.size, 0)

  function updateFilters(next: { date?: string; department?: string }) {
    const params = new URLSearchParams()
    params.set('date', next.date ?? selectedDate)
    const department = next.department ?? selectedDepartmentId
    if (department) params.set('department', department)
    router.push(`/dashboard/schedules?${params.toString()}`)
  }

  async function saveAssignment(e: React.FormEvent) {
    e.preventDefault()

    if (!memberId || !shiftId) {
      setValidation('Choose both a member and a shift.')
      return
    }

    setSaving(true)
    setValidation(null)

    const supabase = createClient()
    const existing = assignments.find((assignment) => assignment.member_id === memberId)
    const payload = {
      organization_id: organizationId,
      member_id: memberId,
      shift_id: shiftId,
      work_date: selectedDate,
    }

    const { error } = existing
      ? await supabase
          .from('shift_assignments')
          .update(payload)
          .eq('id', existing.id)
          .eq('organization_id', organizationId)
      : await supabase.from('shift_assignments').insert(payload)

    setSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(existing ? 'Assignment updated' : 'Shift assigned')
    setMemberId('')
    setShiftId('')
    router.refresh()
  }

  function beginUpdate(assignment: ShiftAssignment) {
    setMemberId(assignment.member_id)
    setShiftId(assignment.shift_id)
    setValidation(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="reveal-stagger grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Surface className="p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
                Work date
              </p>
              <h2 className="mt-1 text-lg font-bold text-zinc-950">Daily assignment board</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Filter the roster and assign active members to one shift for this date.
              </p>
            </div>
            <StatusBadge tone={assignments.length ? 'emerald' : 'zinc'}>
              {assignments.length} assigned
            </StatusBadge>
          </div>

          <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
            <Field id="schedule-date" label="Date">
              <TextInput
                id="schedule-date"
                type="date"
                value={selectedDate}
                onChange={(e) => updateFilters({ date: e.target.value })}
              />
            </Field>
            <SelectField
              id="schedule-department"
              label="Department"
              value={selectedDepartmentId}
              onChange={(e) => updateFilters({ department: e.target.value })}
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </SelectField>
          </div>
        </Surface>

        <div className="reveal-stagger grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <StatTile label="Members" value={members.length} icon={Users} tone="cyan" />
          <StatTile label="Assigned" value={assignments.length} icon={CheckCircle} tone="emerald" />
          <StatTile label="Open" value={unassignedCount} icon={CalendarDays} tone={unassignedCount ? 'amber' : 'zinc'} />
        </div>
      </div>

      <div className="reveal-stagger grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <Surface className="p-5">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
              Assignment
            </p>
            <h2 className="mt-1 text-lg font-bold text-zinc-950">Member shift</h2>
            <p className="mt-1 text-sm text-zinc-500">One member can have one shift per work date.</p>
          </div>

          <form onSubmit={saveAssignment} className="flex flex-col gap-4">
            <SelectField
              id="schedule-member"
              label="Member"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              disabled={members.length === 0}
            >
              <option value="">Select member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} - {member.employee_id}
                </option>
              ))}
            </SelectField>

            <SelectField
              id="schedule-shift"
              label="Shift"
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              disabled={shifts.length === 0}
            >
              <option value="">Select shift</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name} ({shift.start_time.slice(0, 5)}-{shift.end_time.slice(0, 5)})
                </option>
              ))}
            </SelectField>

            {validation && (
              <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                {validation}
              </p>
            )}

            {shifts.length === 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                Create an active shift before assigning schedules.
              </p>
            )}

            <Button
              type="submit"
              disabled={saving || members.length === 0 || shifts.length === 0}
              className="w-full"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save assignment
            </Button>
          </form>
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-xs leading-5 text-zinc-600">
            Each member can have one shift per work date. Saving again updates the existing
            assignment.
          </div>
        </Surface>

        {assignments.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No assignments for this date"
            description="Choose a member and shift to build the schedule for the selected work date."
          />
        ) : (
          <>
            <div className="reveal-stagger grid gap-3 md:hidden">
              {assignments.map((assignment) => (
                <Surface key={assignment.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <MemberAvatar name={assignment.members?.name} photoUrl={assignment.members?.photo_url} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-950">{assignment.members?.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">{assignment.members?.employee_id}</p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => beginUpdate(assignment)}
                      variant="secondary"
                      size="sm"
                    >
                      Update
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-2 border-t border-zinc-200 pt-3 text-xs">
                    <p className="flex items-center gap-1.5 font-medium text-zinc-500">
                      <Building2 size={12} />
                      {assignment.members?.departments?.name || 'No department'}
                    </p>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-1.5 rounded-full" style={{ backgroundColor: assignment.shifts?.color || '#52525b' }} />
                        <span className="font-semibold text-zinc-950">{assignment.shifts?.name}</span>
                      </div>
                      <span className="font-mono font-semibold text-zinc-700">
                        {assignment.shifts?.start_time.slice(0, 5)}-{assignment.shifts?.end_time.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                </Surface>
              ))}
            </div>

            <Surface className="hidden overflow-hidden md:block">
              <div className="border-b border-zinc-200 bg-zinc-50/80 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-zinc-950">Assigned schedule</h2>
                    <p className="mt-1 text-xs text-zinc-500">Current member to shift mapping for the selected date.</p>
                  </div>
                  <StatusPill tone={assignments.length ? 'emerald' : 'zinc'}>
                    {assignments.length} assigned
                  </StatusPill>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px]">
                  <caption className="sr-only">Schedule assignments for {selectedDate}</caption>
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/80">
                      <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Member</th>
                      <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Department</th>
                      <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Shift</th>
                      <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Window</th>
                      <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/70 bg-white">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id} className="transition hover:bg-cyan-50/40">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <MemberAvatar name={assignment.members?.name} photoUrl={assignment.members?.photo_url} className="h-9 w-9" sizes="36px" />
                            <div>
                              <p className="text-sm font-semibold text-zinc-950">{assignment.members?.name}</p>
                              <p className="text-xs text-zinc-500">{assignment.members?.employee_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700">
                            <Building2 size={12} />
                            {assignment.members?.departments?.name || 'No department'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="h-6 w-1.5 rounded-full" style={{ backgroundColor: assignment.shifts?.color || '#52525b' }} />
                            <span className="text-sm font-semibold text-zinc-950">{assignment.shifts?.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                            <CheckCircle size={14} className="text-emerald-600" />
                            {assignment.shifts?.start_time.slice(0, 5)} - {assignment.shifts?.end_time.slice(0, 5)}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            type="button"
                            onClick={() => beginUpdate(assignment)}
                            variant="secondary"
                            size="sm"
                          >
                            Update
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Surface>
          </>
        )}
      </div>
    </div>
  )
}
