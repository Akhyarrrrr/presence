'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Download, FileText, Loader2, Table2, Timer } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { createClient } from '@/lib/supabase/client'
import {
  Button,
  EmptyState,
  Field,
  StatTile,
  StatusBadge,
  StatusPill,
  Surface,
  TextInput,
} from '@/components/ui/presence-ui'

type AttendanceStatus = 'on_time' | 'late' | 'very_late' | 'no_shift' | null

interface AttendanceRow {
  member_id: string
  status: AttendanceStatus
  members?: {
    name?: string | null
    employee_id?: string | null
  } | null
  total_worked_minutes?: number | null
}

interface SummaryRow {
  memberName: string
  employeeId: string
  presentDays: number
  lateDays: number
  veryLateDays: number
  totalWorkedMinutes: number
}

function getMonthRange(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const start = new Date(year, monthNumber - 1, 1)
  const end = new Date(year, monthNumber, 0)
  const format = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return { start: format(start), end: format(end) }
}

function toMonthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  })
}

function buildSummary(rows: AttendanceRow[]): SummaryRow[] {
  const map = new Map<string, SummaryRow>()

  for (const row of rows) {
    const memberId = row.member_id
    const existing = map.get(memberId)
    const base =
      existing ??
      {
        memberName: row.members?.name || 'Unknown Member',
        employeeId: row.members?.employee_id || '-',
        presentDays: 0,
        lateDays: 0,
        veryLateDays: 0,
        totalWorkedMinutes: 0,
      }

    base.presentDays += 1
    if (row.status === 'late') base.lateDays += 1
    if (row.status === 'very_late') base.veryLateDays += 1
    if (typeof row.total_worked_minutes === 'number') {
      base.totalWorkedMinutes += row.total_worked_minutes
    }
    map.set(memberId, base)
  }

  return Array.from(map.values()).sort((a, b) => a.memberName.localeCompare(b.memberName))
}

function formatWorkedMinutes(totalMinutes: number) {
  if (!totalMinutes) return '-'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

export default function ReportsClient({
  organizationId,
  organizationName,
  defaultMonth,
}: Readonly<{ organizationId: string; organizationName: string; defaultMonth: string }>) {
  const [month, setMonth] = useState(defaultMonth)
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [hasWorkedMinutes, setHasWorkedMinutes] = useState(false)

  const summaryRows = useMemo(() => buildSummary(rows), [rows])
  const totalPresentDays = summaryRows.reduce((sum, row) => sum + row.presentDays, 0)
  const totalLateDays = summaryRows.reduce((sum, row) => sum + row.lateDays + row.veryLateDays, 0)
  const totalWorkedMinutes = summaryRows.reduce((sum, row) => sum + row.totalWorkedMinutes, 0)

  async function loadReportData() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const range = getMonthRange(month)

    const withWorkedMinutes = await supabase
      .from('attendance_logs')
      .select('member_id, status, total_worked_minutes, members(name, employee_id)')
      .eq('organization_id', organizationId)
      .gte('date', range.start)
      .lte('date', range.end)

    if (!withWorkedMinutes.error) {
      setRows((withWorkedMinutes.data ?? []) as AttendanceRow[])
      setHasWorkedMinutes(true)
      setLoaded(true)
      setLoading(false)
      return
    }

    const fallback = await supabase
      .from('attendance_logs')
      .select('member_id, status, members(name, employee_id)')
      .eq('organization_id', organizationId)
      .gte('date', range.start)
      .lte('date', range.end)

    if (fallback.error) {
      setError(fallback.error.message)
      setRows([])
      setHasWorkedMinutes(false)
    } else {
      setRows((fallback.data ?? []) as AttendanceRow[])
      setHasWorkedMinutes(false)
      setLoaded(true)
    }

    setLoading(false)
  }

  function downloadPdf() {
    const monthLabel = toMonthLabel(month)
    const doc = new jsPDF()
    let y = 18

    doc.setFontSize(18)
    doc.text('Monthly Attendance Report', 14, y)
    y += 8

    doc.setFontSize(11)
    doc.text(`Organization: ${organizationName}`, 14, y)
    y += 6
    doc.text(`Month: ${monthLabel}`, 14, y)
    y += 10

    doc.setFontSize(10)
    doc.setFillColor(245, 247, 250)
    doc.rect(14, y - 5, 182, 8, 'F')
    doc.text('Member', 16, y)
    doc.text('Present', 95, y)
    doc.text('Late', 118, y)
    doc.text('Very Late', 136, y)
    doc.text('Worked', 168, y)
    y += 7

    for (const row of summaryRows) {
      if (y > 276) {
        doc.addPage()
        y = 18
      }
      const name = `${row.memberName} (${row.employeeId})`
      doc.text(name.slice(0, 44), 16, y)
      doc.text(String(row.presentDays), 97, y)
      doc.text(String(row.lateDays), 120, y)
      doc.text(String(row.veryLateDays), 140, y)
      doc.text(formatWorkedMinutes(row.totalWorkedMinutes), 166, y)
      y += 6
    }

    const fileMonth = month.replace('-', '_')
    doc.save(`attendance_report_${fileMonth}.pdf`)
  }

  return (
    <div className="flex flex-col gap-5">
      <Surface className="p-5">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Report builder</p>
            <h2 className="mt-1 text-lg font-bold text-zinc-950">Monthly attendance summary</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Generate the current table first, then export the same summary to PDF.
            </p>
          </div>
          <StatusPill tone={loaded ? 'emerald' : 'zinc'}>{loaded ? 'Loaded' : 'Not generated'}</StatusPill>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <Field id="report-month" label="Report Month">
            <TextInput
              id="report-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </Field>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Button
              type="button"
              onClick={loadReportData}
              disabled={loading}
              size="lg"
              className="w-full sm:w-auto"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              Generate Summary
            </Button>
            <Button
              type="button"
              onClick={downloadPdf}
              disabled={!summaryRows.length}
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              <Download size={16} />
              Download PDF
            </Button>
            <div className="flex items-end">
              <StatusBadge tone={hasWorkedMinutes ? 'emerald' : 'zinc'}>
                {hasWorkedMinutes ? 'Worked minutes included' : 'Worked minutes unavailable'}
              </StatusBadge>
            </div>
          </div>
        </div>
      </Surface>

      {!!summaryRows.length && (
        <section aria-label="Report summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Members" value={summaryRows.length} icon={Table2} tone="cyan" />
          <StatTile label="Present days" value={totalPresentDays} icon={CalendarDays} tone="emerald" />
          <StatTile label="Exceptions" value={totalLateDays} icon={Timer} tone={totalLateDays ? 'amber' : 'zinc'} />
        </section>
      )}

      {error && (
        <Surface className="border-rose-200 bg-rose-50 p-4" role="alert">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </Surface>
      )}

      {loaded && !summaryRows.length && !loading && (
        <EmptyState
          icon={FileText}
          title="No attendance data for this month"
          description="Try another month or collect check-ins first."
        />
      )}

      {!!summaryRows.length && (
        <>
          <div className="grid gap-3 md:hidden">
            {summaryRows.map((row) => (
              <Surface key={`${row.employeeId}-${row.memberName}`} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-950">{row.memberName}</p>
                    <p className="mt-1 text-xs text-zinc-500">{row.employeeId}</p>
                  </div>
                  <StatusBadge tone={row.lateDays + row.veryLateDays ? 'amber' : 'emerald'}>
                    {row.presentDays} present
                  </StatusBadge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-200 pt-3 text-xs">
                  <div>
                    <p className="font-bold uppercase tracking-[0.12em] text-zinc-500">Late</p>
                    <p className="mt-1 font-semibold text-zinc-900">{row.lateDays}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-[0.12em] text-zinc-500">Very late</p>
                    <p className="mt-1 font-semibold text-zinc-900">{row.veryLateDays}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-[0.12em] text-zinc-500">Worked</p>
                    <p className="mt-1 font-semibold text-zinc-900">{formatWorkedMinutes(row.totalWorkedMinutes)}</p>
                  </div>
                </div>
              </Surface>
            ))}
          </div>

          <Surface className="hidden overflow-x-auto p-0 md:block">
            <table className="min-w-full">
              <caption className="sr-only">Monthly attendance report for {toMonthLabel(month)}</caption>
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/70">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-zinc-600">Member</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-zinc-600">Present Days</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-zinc-600">Late Days</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-zinc-600">Very Late Days</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-zinc-600">Worked Minutes</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row) => (
                  <tr key={`${row.employeeId}-${row.memberName}`} className="border-b border-zinc-100 last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-zinc-950">{row.memberName}</p>
                      <p className="text-xs text-zinc-500">{row.employeeId}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">{row.presentDays}</td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">{row.lateDays}</td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">{row.veryLateDays}</td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">{formatWorkedMinutes(row.totalWorkedMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasWorkedMinutes && (
              <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700">
                Total worked time: {formatWorkedMinutes(totalWorkedMinutes)}
              </div>
            )}
          </Surface>
        </>
      )}
    </div>
  )
}
