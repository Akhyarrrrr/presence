'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, CalendarDays, CheckCircle, Loader2, Save, Users } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { EmptyState, StatusBadge, Surface } from '@/components/ui/presence-ui'
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

  const inputClass =
    'w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-3 text-sm font-medium text-zinc-950 transition focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Surface className="p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
                Work date
              </p>
              <h2 className="mt-1 text-lg font-bold text-zinc-950">Daily assignment board</h2>
            </div>
            <StatusBadge tone={assignments.length ? 'emerald' : 'zinc'}>
              {assignments.length} assigned
            </StatusBadge>
          </div>

          <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => updateFilters({ date: e.target.value })}
                className={inputClass}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Department</span>
              <select
                value={selectedDepartmentId}
                onChange={(e) => updateFilters({ department: e.target.value })}
                className={inputClass}
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Surface>

        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <Surface className="p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Members</p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">{members.length}</p>
          </Surface>
          <Surface className="p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Assigned</p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">{assignments.length}</p>
          </Surface>
          <Surface className="p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Open</p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">{unassignedCount}</p>
          </Surface>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <Surface className="p-5">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
              Assignment
            </p>
            <h2 className="mt-1 text-lg font-bold text-zinc-950">Member shift</h2>
            <p className="mt-1 text-sm text-zinc-500">One member can have one shift per work date.</p>
          </div>

          <form onSubmit={saveAssignment} className="space-y-4">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Member</span>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className={inputClass}
                disabled={members.length === 0}
              >
                <option value="">Select member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} - {member.employee_id}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Shift</span>
              <select
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                className={inputClass}
                disabled={shifts.length === 0}
              >
                <option value="">Select shift</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({shift.start_time.slice(0, 5)}-{shift.end_time.slice(0, 5)})
                  </option>
                ))}
              </select>
            </label>

            {validation && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                {validation}
              </p>
            )}

            {shifts.length === 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                Create an active shift before assigning schedules.
              </p>
            )}

            <button
              type="submit"
              disabled={saving || members.length === 0 || shifts.length === 0}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save assignment
            </button>
          </form>
        </Surface>

        {assignments.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No assignments for this date"
            description="Choose a member and shift to build the schedule for the selected work date."
          />
        ) : (
          <Surface className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/80">
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Member</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Department</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Shift</th>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Window</th>
                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/70 bg-white">
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="transition hover:bg-cyan-50/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg bg-cyan-50 text-xs font-bold text-cyan-800 ring-1 ring-cyan-100">
                            {assignment.members?.photo_url ? (
                              <img
                                src={assignment.members.photo_url}
                                alt={assignment.members.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              assignment.members?.name?.[0]?.toUpperCase() ?? <Users size={14} />
                            )}
                          </div>
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
                        <button
                          type="button"
                          onClick={() => beginUpdate(assignment)}
                          className="inline-flex cursor-pointer items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-cyan-200 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>
        )}
      </div>
    </div>
  )
}
