import Link from 'next/link'
import { Calendar, CheckSquare, TrendingUp, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import DashboardCharts from './DashboardCharts'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  const [{ count: totalMembers }, { count: todayCount }, { data: last30Days }, { data: recentLogs }] =
    await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('attendance_logs').select('*', { count: 'exact', head: true }).eq('date', today),
      supabase.from('attendance_logs').select('date').gte('date', thirtyDaysAgoStr).order('date'),
      supabase
        .from('attendance_logs')
        .select('*, members(name, employee_id, photo_url, departments(name))')
        .eq('date', today)
        .order('check_in_at', { ascending: false })
        .limit(8),
    ])

  const dateCountMap: Record<string, number> = {}
  last30Days?.forEach((log) => {
    dateCountMap[log.date] = (dateCountMap[log.date] || 0) + 1
  })

  const chartData = []
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    chartData.push({ date: label, count: dateCountMap[dateStr] || 0 })
  }

  const attendanceRate = totalMembers ? Math.round(((todayCount || 0) / totalMembers) * 100) : 0
  const stats = [
    {
      label: 'Total Members',
      value: totalMembers || 0,
      icon: Users,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
    },
    {
      label: 'Present Today',
      value: todayCount || 0,
      icon: CheckSquare,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Attendance Rate',
      value: `${attendanceRate}%`,
      icon: TrendingUp,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Days Tracked',
      value: Object.keys(dateCountMap).length,
      icon: Calendar,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ]

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <Link
          href="/attendance"
          target="_blank"
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Open Scanner
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="mt-0.5 text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <DashboardCharts chartData={chartData} />
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Today&apos;s Check-ins</h2>
          <div className="space-y-2.5">
            {recentLogs?.map((log) => (
              <div key={log.id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-400">
                  {log.members?.photo_url ? (
                    <img
                      src={log.members.photo_url}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    log.members?.name?.[0]?.toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{log.members?.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(log.check_in_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {log.members?.departments?.name && ` - ${log.members.departments.name}`}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-emerald-400">
                  {Math.round(log.confidence * 100)}%
                </span>
              </div>
            ))}

            {!recentLogs?.length && (
              <p className="py-8 text-center text-sm text-gray-600">No check-ins yet today</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
