import { CalendarDays } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/ui/presence-ui'
import { getCurrentAdminContext } from '@/lib/supabase/organization'
import { createClient } from '@/lib/supabase/server'
import type { Department, Member, Shift, ShiftAssignment } from '@/types'
import SchedulesClient from './SchedulesClient'

export default async function SchedulesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ date?: string; department?: string }>
}>) {
  const { date, department } = await searchParams
  const supabase = await createClient()
  const adminContext = await getCurrentAdminContext(supabase)

  if (!adminContext) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Organization access is not ready"
        description="Your admin account is not linked to an organization yet. Apply the Phase 1 SQL migration and sign in again."
      />
    )
  }

  const selectedDate = date || new Date().toISOString().split('T')[0]
  const organizationId = adminContext.organization.id

  const membersQuery = supabase
    .from('members')
    .select('*, departments(name)')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (department) membersQuery.eq('department_id', department)

  const [{ data: departments }, { data: members }, { data: shifts }, { data: assignments }] =
    await Promise.all([
      supabase.from('departments').select('*').order('name'),
      membersQuery,
      supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('start_time', { ascending: true }),
      supabase
        .from('shift_assignments')
        .select('*, members(id, organization_id, name, employee_id, department_id, email, photo_url, is_active, created_at, updated_at, departments(name)), shifts(*)')
        .eq('organization_id', organizationId)
        .eq('work_date', selectedDate)
        .order('created_at', { ascending: false }),
    ])

  return (
    <div>
      <PageHeader
        eyebrow="Schedule foundation"
        title="Schedules"
        description="Assign members to shifts by work date. Attendance classification is prepared but not wired into kiosk check-in yet."
      />

      <SchedulesClient
        organizationId={organizationId}
        selectedDate={selectedDate}
        selectedDepartmentId={department || ''}
        departments={(departments || []) as Department[]}
        members={(members || []) as Member[]}
        shifts={(shifts || []) as Shift[]}
        assignments={(assignments || []) as ShiftAssignment[]}
      />
    </div>
  )
}
