import { AlertTriangle, Building2, CalendarSearch, CheckCircle, Clock3, IdCard, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAdminContext } from '@/lib/supabase/organization'
import { formatDate, formatTime } from '@/lib/utils'
import { EmptyState, MemberAvatar, PageHeader, StatTile, StatusBadge, Surface } from '@/components/ui/presence-ui'
import DateFilter from './DateFilter'

type LogStatusKey = 'on_time' | 'late' | 'very_late' | 'no_shift' | 'present'

const statusLabel: Record<LogStatusKey, string> = {
  on_time: 'On time',
  late: 'Late',
  very_late: 'Very late',
  no_shift: 'No shift',
  present: 'Present',
}

const statusTone: Record<LogStatusKey, 'emerald' | 'amber' | 'rose' | 'zinc'> = {
  on_time: 'emerald',
  late: 'amber',
  very_late: 'rose',
  no_shift: 'zinc',
  present: 'emerald',
}

function getStatusKey(status: unknown): LogStatusKey {
  if (status === 'on_time' || status === 'late' || status === 'very_late' || status === 'no_shift') {
    return status
  }
  return 'present'
}

export default async function LogsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ date?: string }>
}>) {
  const { date } = await searchParams
  const supabase = await createClient()
  const adminContext = await getCurrentAdminContext(supabase)

  if (!adminContext) {
    return (
      <EmptyState
        icon={CalendarSearch}
        title="Organization access is not ready"
        description="Your admin account is not linked to an organization yet. Apply the Phase 1 SQL migration and sign in again."
      />
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const selectedDate = date || today

  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('*, members(name, employee_id, photo_url, departments(name))')
    .eq('date', selectedDate)
    .eq('organization_id', adminContext.organization.id)
    .order('check_in_at', { ascending: false })

  const onTimeCount = logs?.filter((log) => getStatusKey(log.status) === 'on_time').length || 0
  const lateCount = logs?.filter((log) => getStatusKey(log.status) === 'late').length || 0
  const veryLateCount = logs?.filter((log) => getStatusKey(log.status) === 'very_late').length || 0

  return (
    <div>
      <PageHeader
        eyebrow="Audit trail"
        title="Attendance logs"
        description={`${logs?.length || 0} check-ins on ${formatDate(selectedDate)}.`}
        action={<DateFilter selectedDate={selectedDate} maxDate={today} />}
      />

      <section aria-label="Attendance log summary" className="reveal-stagger mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Recorded"
          value={logs?.length || 0}
          icon={UserCheck}
          tone="cyan"
          description="Accepted check-ins for the selected date."
        />
        <StatTile
          label="On time"
          value={onTimeCount}
          icon={CheckCircle}
          tone="emerald"
          description="Logs classified as on time."
        />
        <StatTile
          label="Exceptions"
          value={lateCount + veryLateCount}
          icon={AlertTriangle}
          tone={lateCount + veryLateCount ? 'amber' : 'zinc'}
          description="Late and very late records."
        />
      </section>

      <Surface className="mb-5 p-4">
        <p className="text-sm leading-6 text-zinc-600">
          Use the date filter for daily audits. Confidence values help validate face-match quality,
          while late statuses follow the applicable shift rules.
        </p>
      </Surface>

      {!logs?.length ? (
        <EmptyState
          icon={CalendarSearch}
          title="No attendance records"
          description="Choose another date or open the kiosk when members start arriving."
        />
      ) : (
        <>
          <div className="reveal-stagger grid gap-3 md:hidden">
            {logs.map((log) => {
              const statusKey = getStatusKey(log.status)

              return (
                <Surface key={log.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <MemberAvatar name={log.members?.name} photoUrl={log.members?.photo_url} className="h-11 w-11" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-950">{log.members?.name}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                        <IdCard size={12} />
                        {log.members?.employee_id}
                      </p>
                    </div>
                    <StatusBadge tone={statusTone[statusKey]}>
                      {statusLabel[statusKey]}
                    </StatusBadge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-200 pt-3 text-xs">
                    <div>
                      <p className="font-bold uppercase tracking-[0.12em] text-zinc-500">Time</p>
                      <p className="mt-1 font-mono font-semibold text-zinc-800">{formatTime(log.check_in_at)}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-[0.12em] text-zinc-500">Confidence</p>
                      <p className="mt-1 font-semibold text-zinc-800">{Math.round(log.confidence * 100)}%</p>
                    </div>
                    <div className="col-span-2">
                      <p className="flex items-center gap-1.5 font-medium text-zinc-500">
                        <Building2 size={12} />
                        {log.members?.departments?.name || 'No department'}
                      </p>
                    </div>
                  </div>
                </Surface>
              )
            })}
          </div>

          <Surface className="hidden overflow-hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <caption className="sr-only">Attendance logs for {formatDate(selectedDate)}</caption>
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80">
                  <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Member</th>
                  <th scope="col" className="hidden px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 sm:table-cell">
                    Department
                  </th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Check-in Time</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Confidence</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 bg-white">
                {logs.map((log) => {
                  const statusKey = getStatusKey(log.status)

                  return (
                    <tr key={log.id} className="transition hover:bg-cyan-50/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <MemberAvatar name={log.members?.name} photoUrl={log.members?.photo_url} className="h-9 w-9" sizes="36px" />
                          <div>
                            <p className="text-sm font-semibold text-zinc-950">{log.members?.name}</p>
                            <p className="text-xs text-zinc-500">{log.members?.employee_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-5 py-4 sm:table-cell">
                        <span className="text-sm font-medium text-zinc-600">{log.members?.departments?.name || '-'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-sm font-semibold text-zinc-700">{formatTime(log.check_in_at)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${log.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-zinc-600">{Math.round(log.confidence * 100)}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge tone={statusTone[statusKey]}>
                          {statusKey === 'late' || statusKey === 'very_late' ? <Clock3 size={11} /> : <CheckCircle size={11} />}
                          {statusLabel[statusKey]}
                        </StatusBadge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </Surface>
        </>
      )}
    </div>
  )
}
