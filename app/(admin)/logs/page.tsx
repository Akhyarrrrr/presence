import { CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatTime } from '@/lib/utils'
import DateFilter from './DateFilter'

export default async function LogsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ date?: string }>
}>) {
  const { date } = await searchParams
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const selectedDate = date || today

  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('*, members(name, employee_id, photo_url, departments(name))')
    .eq('date', selectedDate)
    .order('check_in_at', { ascending: false })

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance Logs</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {logs?.length || 0} check-ins on {formatDate(selectedDate)}
          </p>
        </div>
        <DateFilter selectedDate={selectedDate} maxDate={today} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
        {!logs?.length ? (
          <div className="py-16 text-center">
            <p className="text-gray-500">No attendance records for this date</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Member</th>
                  <th className="hidden px-5 py-3 text-left text-xs font-medium text-gray-500 sm:table-cell">
                    Department
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Check-in Time</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Confidence</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {logs.map((log) => (
                  <tr key={log.id} className="transition hover:bg-gray-800/30">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-400">
                          {log.members?.photo_url ? (
                            <img src={log.members.photo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            log.members?.name?.[0]
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{log.members?.name}</p>
                          <p className="text-xs text-gray-500">{log.members?.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-5 py-4 sm:table-cell">
                      <span className="text-sm text-gray-400">{log.members?.departments?.name || '-'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm text-gray-300">{formatTime(log.check_in_at)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-800">
                          <div
                            className="h-full rounded-full bg-emerald-400"
                            style={{ width: `${log.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400">{Math.round(log.confidence * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                        <CheckCircle size={11} />
                        Present
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
