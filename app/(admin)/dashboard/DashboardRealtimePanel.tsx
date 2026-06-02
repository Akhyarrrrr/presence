'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MemberAvatar, StatusBadge, StatusPill, Surface } from '@/components/ui/presence-ui'

interface MemberLite {
  name: string | null
  employee_id: string | null
  photo_url: string | null
  departments?: {
    name?: string | null
  } | null
}

interface AttendanceLogLite {
  id: string
  member_id: string
  check_in_at: string
  confidence: number
  status?: 'on_time' | 'late' | 'very_late' | 'no_shift' | null
  members?: MemberLite | null
}

interface Props {
  organizationId: string
  today: string
  initialLogs: AttendanceLogLite[]
}

const statusLabel = {
  on_time: 'On time',
  late: 'Late',
  very_late: 'Very late',
  no_shift: 'No shift',
  null: 'Recorded',
}

const statusTone = {
  on_time: 'emerald',
  late: 'amber',
  very_late: 'rose',
  no_shift: 'zinc',
  null: 'zinc',
} as const

function toMemberLite(value: unknown): MemberLite | null {
  if (!value) return null
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== 'object') return null
  const candidate = row as {
    name?: unknown
    employee_id?: unknown
    photo_url?: unknown
    departments?: unknown
  }
  const departmentRow = Array.isArray(candidate.departments)
    ? candidate.departments[0]
    : candidate.departments

  return {
    name: typeof candidate.name === 'string' ? candidate.name : null,
    employee_id: typeof candidate.employee_id === 'string' ? candidate.employee_id : null,
    photo_url: typeof candidate.photo_url === 'string' ? candidate.photo_url : null,
    departments:
      departmentRow && typeof departmentRow === 'object'
        ? { name: typeof (departmentRow as { name?: unknown }).name === 'string' ? (departmentRow as { name?: string }).name ?? null : null }
        : null,
  }
}

function toAttendanceLogs(rows: unknown[]): AttendanceLogLite[] {
  return rows
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const item = row as Record<string, unknown>
      if (
        typeof item.id !== 'string' ||
        typeof item.member_id !== 'string' ||
        typeof item.check_in_at !== 'string' ||
        typeof item.confidence !== 'number'
      ) {
        return null
      }
      return {
        id: item.id,
        member_id: item.member_id,
        check_in_at: item.check_in_at,
        confidence: item.confidence,
        status:
          item.status === 'on_time' ||
          item.status === 'late' ||
          item.status === 'very_late' ||
          item.status === 'no_shift'
            ? item.status
            : null,
        members: toMemberLite(item.members),
      } as AttendanceLogLite
    })
    .filter((row): row is AttendanceLogLite => Boolean(row))
}

export default function DashboardRealtimePanel({ organizationId, today, initialLogs }: Props) {
  const [recentLogs, setRecentLogs] = useState<AttendanceLogLite[]>(initialLogs)

  const loadTodayLogs = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('attendance_logs')
      .select('id, member_id, check_in_at, confidence, status, members(name, employee_id, photo_url, departments(name))')
      .eq('date', today)
      .eq('organization_id', organizationId)
      .order('check_in_at', { ascending: false })
      .limit(100)

    if (data) setRecentLogs(toAttendanceLogs(data as unknown[]))
  }, [organizationId, today])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`dashboard-attendance-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_logs',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          void loadTodayLogs()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadTodayLogs, organizationId])

  const summary = useMemo(() => {
    const present = recentLogs.length
    const late = recentLogs.filter((log) => log.status === 'late').length
    const veryLate = recentLogs.filter((log) => log.status === 'very_late').length
    const noShift = recentLogs.filter((log) => log.status === 'no_shift').length
    return { present, late, veryLate, noShift }
  }, [recentLogs])

  const summaryItems = [
    { label: 'Present', value: summary.present, tone: 'emerald' as const, icon: CheckCircle2 },
    { label: 'Late', value: summary.late, tone: 'amber' as const, icon: Clock3 },
    { label: 'Very late', value: summary.veryLate, tone: 'rose' as const, icon: AlertTriangle },
    { label: 'No shift', value: summary.noShift, tone: 'zinc' as const, icon: ShieldCheck },
  ]

  return (
    <div className="flex flex-col gap-5">
      <Surface className="p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Today stream</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-950">Latest arrivals</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Realtime check-ins from the public kiosk for this organization.
            </p>
          </div>
          <StatusPill tone={summary.present ? 'emerald' : 'zinc'}>{summary.present} today</StatusPill>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2">
          {summaryItems.map(({ label, value, tone, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                  {label}
                </span>
                <Icon size={14} className="text-zinc-500" />
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <p className="text-2xl font-bold tracking-tight text-zinc-950">{value}</p>
                <StatusBadge tone={tone}>
                  {value === 1 ? '1 log' : `${value} logs`}
                </StatusBadge>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3" aria-live="polite" aria-label="Realtime attendance feed">
          {recentLogs.slice(0, 8).map((log) => {
            const statusKey = log.status ?? 'null'

            return (
              <div
                key={log.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
              >
                <MemberAvatar name={log.members?.name} photoUrl={log.members?.photo_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-950">{log.members?.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={12} />
                      {new Date(log.check_in_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {log.members?.departments?.name && <span>{log.members.departments.name}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusBadge tone={statusTone[statusKey]}>
                    {statusLabel[statusKey]}
                  </StatusBadge>
                  <span className="text-xs font-bold text-emerald-700">
                    {Math.round(log.confidence * 100)}%
                  </span>
                </div>
              </div>
            )
          })}

          {!recentLogs.length && (
            <div className="grid min-h-52 place-items-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/70 p-6 text-center">
              <div>
                <Activity size={30} className="mx-auto text-zinc-400" />
                <p className="mt-3 text-sm font-semibold text-zinc-800">No check-ins yet today</p>
                <p className="mt-1 text-xs text-zinc-500">Open the kiosk when arrivals begin.</p>
              </div>
            </div>
          )}
        </div>
      </Surface>
    </div>
  )
}
