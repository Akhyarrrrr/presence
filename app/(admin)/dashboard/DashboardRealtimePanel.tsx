'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScanFace } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MetricCard, StatusBadge, Surface } from '@/components/ui/presence-ui'

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

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Present Today" value={summary.present} tone="emerald" helper="Realtime" icon={ScanFace} />
        <MetricCard label="Late Today" value={summary.late} tone="amber" helper="Status: late" icon={ScanFace} />
        <MetricCard label="Very Late Today" value={summary.veryLate} tone="rose" helper="Status: very_late" icon={ScanFace} />
        <MetricCard label="No Shift" value={summary.noShift} tone="zinc" helper="Status: no_shift" icon={ScanFace} />
      </div>

      <Surface className="p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Today stream</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-950">Latest arrivals</h2>
          </div>
          <StatusBadge tone={summary.present ? 'emerald' : 'zinc'}>{summary.present} live</StatusBadge>
        </div>
        <div className="space-y-3">
          {recentLogs.slice(0, 8).map((log) => (
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

          {!recentLogs.length && (
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
  )
}
