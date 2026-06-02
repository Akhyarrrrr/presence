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
import { getCurrentAdminContext } from '@/lib/supabase/organization'
import {
  EmptyState,
  MetricCard,
  PageHeader,
  PrimaryLink,
  StatusPill,
  Surface,
} from '@/components/ui/presence-ui'
import DashboardCharts from './DashboardCharts'
import DashboardRealtimePanel from './DashboardRealtimePanel'

export default async function DashboardPage() {
  const supabase = await createClient()
  const adminContext = await getCurrentAdminContext(supabase)

  if (!adminContext) {
    return (
      <EmptyState
        icon={Users}
        title="Organization access is not ready"
        description="Your admin account is not linked to an organization yet. Apply the Phase 1 SQL migration and sign in again."
      />
    )
  }

  const organizationId = adminContext.organization.id
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  const [{ count: totalMembers }, { count: todayCount }, { data: last30Days }, { data: recentLogs }] =
    await Promise.all([
      supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('organization_id', organizationId),
      supabase
        .from('attendance_logs')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .eq('organization_id', organizationId),
      supabase
        .from('attendance_logs')
        .select('date')
        .gte('date', thirtyDaysAgoStr)
        .eq('organization_id', organizationId)
        .order('date'),
      supabase
        .from('attendance_logs')
        .select('*, members(name, employee_id, photo_url, departments(name))')
        .eq('date', today)
        .eq('organization_id', organizationId)
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

      <Surface className="mb-6 overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="p-5 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <StatusPill tone={attendanceRate >= 80 ? 'emerald' : attendanceRate >= 50 ? 'amber' : 'rose'}>
                  {attendanceRate}% covered
                </StatusPill>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-950">
                  Today&apos;s attendance posture
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                  Monitor arrival windows, verify kiosk activity, and close open items before the
                  workday ends.
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Work date
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-zinc-950">{today}</p>
              </div>
            </div>
          </div>
          <div className="border-t border-zinc-200 bg-zinc-950 p-5 text-white lg:border-l lg:border-t-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
              Open attention
            </p>
            <p className="mt-4 text-4xl font-bold tracking-tight">{absentCount}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              active member{absentCount === 1 ? '' : 's'} without a check-in record today.
            </p>
          </div>
        </div>
      </Surface>

      <section aria-label="Attendance metrics" className="reveal-stagger mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      </section>

      <div className="reveal-stagger grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <DashboardCharts chartData={chartData} />
        <DashboardRealtimePanel
          organizationId={organizationId}
          today={today}
          initialLogs={(recentLogs ?? []) as unknown as {
            id: string
            member_id: string
            check_in_at: string
            confidence: number
            status?: 'on_time' | 'late' | 'very_late' | 'no_shift' | null
            members?: {
              name: string | null
              employee_id: string | null
              photo_url: string | null
              departments?: { name?: string | null } | null
            } | null
          }[]}
        />
      </div>

      <div className="reveal-stagger mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Surface className="p-5 lg:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Readiness</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-950">Scanner operating model</h2>
            </div>
            <StatusPill tone="zinc">MVP path</StatusPill>
          </div>
          <div className="reveal-stagger mt-5 grid gap-3 sm:grid-cols-3">
            {readinessItems.map(({ title, detail, icon: Icon }) => (
              <div key={title} className="reveal-scale rounded-lg border border-zinc-200 bg-zinc-50/70 p-4">
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
          <div className="mt-5 flex flex-col gap-4">
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
