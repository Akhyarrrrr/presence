import {
  ArrowUpRight,
  Calendar,
  CheckSquare,
  Clock3,
  ScanFace,
  TrendingUp,
  UserMinus,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  MetricCard,
  PageHeader,
  PrimaryLink,
  StatusBadge,
  Surface,
} from '@/components/ui/presence-ui'
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
  const absentCount = Math.max((totalMembers || 0) - (todayCount || 0), 0)
  const readinessItems: { title: string; detail: string; icon: LucideIcon }[] = [
    { title: 'Identity enrolled', detail: `${totalMembers || 0} active profiles`, icon: Users },
    { title: 'Recognition active', detail: 'Browser-side model execution', icon: ScanFace },
    { title: 'Audit trail', detail: `${Object.keys(dateCountMap).length} tracked days`, icon: Calendar },
  ]
  const stats = [
    {
      label: 'Active Members',
      value: totalMembers || 0,
      icon: Users,
      tone: 'cyan' as const,
      helper: 'Eligible for kiosk recognition',
    },
    {
      label: 'Present Today',
      value: todayCount || 0,
      icon: CheckSquare,
      tone: 'emerald' as const,
      helper: 'Recorded for this date',
      progress: attendanceRate,
    },
    {
      label: 'Coverage Rate',
      value: `${attendanceRate}%`,
      icon: TrendingUp,
      tone: 'amber' as const,
      helper: `${absentCount} still unaccounted`,
      progress: attendanceRate,
    },
    {
      label: 'Open Items',
      value: absentCount,
      icon: UserMinus,
      tone: absentCount > 0 ? ('rose' as const) : ('zinc' as const),
      helper: 'Members without today log',
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Command center"
        title="Attendance operations"
        description={new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
        action={
          <PrimaryLink href="/attendance" target="_blank" className="shrink-0">
            Open Kiosk
            <ArrowUpRight size={15} />
          </PrimaryLink>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon, tone, helper, progress }) => (
          <MetricCard
            key={label}
            label={label}
            value={value}
            icon={icon}
            tone={tone}
            helper={helper}
            progress={progress}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <DashboardCharts chartData={chartData} />
        <Surface className="p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
                Today stream
              </p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-950">
                Latest arrivals
              </h2>
            </div>
            <StatusBadge tone={todayCount ? 'emerald' : 'zinc'}>{todayCount || 0} live</StatusBadge>
          </div>
          <div className="space-y-3">
            {recentLogs?.map((log) => (
              <div key={log.id} className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-cyan-50 text-xs font-bold text-cyan-800 ring-1 ring-cyan-100">
                  {log.members?.photo_url ? (
                    <img
                      src={log.members.photo_url}
                      alt={log.members?.name || 'Member'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    log.members?.name?.[0]?.toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-950">{log.members?.name}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(log.check_in_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {log.members?.departments?.name && ` - ${log.members.departments.name}`}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                  {Math.round(log.confidence * 100)}%
                </span>
              </div>
            ))}

            {!recentLogs?.length && (
              <div className="grid min-h-52 place-items-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/70 p-6 text-center">
                <div>
                  <ScanFace size={30} className="mx-auto text-zinc-400" />
                  <p className="mt-3 text-sm font-semibold text-zinc-800">No check-ins yet today</p>
                  <p className="mt-1 text-xs text-zinc-500">Open the kiosk when arrivals begin.</p>
                </div>
              </div>
            )}
          </div>
        </Surface>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Surface className="p-5 lg:col-span-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Readiness</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-950">Scanner operating model</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {readinessItems.map(({ title, detail, icon: Icon }) => (
              <div key={title} className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-4">
                <Icon size={18} className="text-cyan-700" />
                <p className="mt-3 text-sm font-semibold text-zinc-950">{title}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">SLA watch</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-950">Today&apos;s posture</h2>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Clock3 size={17} className="text-zinc-500" />
                <span className="text-sm font-medium text-zinc-700">Daily coverage</span>
              </div>
              <span className="text-sm font-bold text-zinc-950">{attendanceRate}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-cyan-700" style={{ width: `${attendanceRate}%` }} />
            </div>
            <p className="text-sm leading-6 text-zinc-500">
              Keep the kiosk visible during arrival windows and review open items before closing the
              day.
            </p>
          </div>
        </Surface>
      </div>
    </div>
  )
}
