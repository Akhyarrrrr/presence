import { CalendarSearch, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAdminContext } from '@/lib/supabase/organization'
import { formatDate, formatTime } from '@/lib/utils'
import { EmptyState, PageHeader, StatusBadge, Surface } from '@/components/ui/presence-ui'
import DateFilter from './DateFilter'

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

  return (
    <div>
      <PageHeader
        eyebrow="Audit trail"
        title="Attendance logs"
        description={`${logs?.length || 0} check-ins on ${formatDate(selectedDate)}.`}
        action={<DateFilter selectedDate={selectedDate} maxDate={today} />}
      />

      {!logs?.length ? (
        <EmptyState
          icon={CalendarSearch}
          title="No attendance records"
          description="Choose another date or open the kiosk when members start arriving."
        />
      ) : (
        <Surface className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80">
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Member</th>
                  <th className="hidden px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 sm:table-cell">
                    Department
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Check-in Time</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Confidence</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 bg-white">
                {logs.map((log) => (
                  <tr key={log.id} className="transition hover:bg-cyan-50/40">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-cyan-50 text-xs font-bold text-cyan-800 ring-1 ring-cyan-100">
                          {log.members?.photo_url ? (
                            <img src={log.members.photo_url} alt={log.members?.name || 'Member'} className="h-full w-full object-cover" />
                          ) : (
                            log.members?.name?.[0]
                          )}
                        </div>
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
                      <StatusBadge tone="emerald">
                        <CheckCircle size={11} />
                        Present
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      )}
    </div>
  )
}
