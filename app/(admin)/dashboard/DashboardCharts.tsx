'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Surface } from '@/components/ui/presence-ui'

interface Props {
  chartData: { date: string; count: number }[]
}

export default function DashboardCharts({ chartData }: Props) {
  const totalCheckIns = chartData.reduce((sum, item) => sum + item.count, 0)
  const peakDay = chartData.reduce(
    (peak, item) => (item.count > peak.count ? item : peak),
    chartData[0] ?? { date: '-', count: 0 }
  )

  return (
    <Surface className="p-5">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Trend</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-950">Last 30 Days</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Daily accepted kiosk check-ins for the current organization.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">Total</p>
            <p className="mt-1 text-sm font-bold text-zinc-950">{totalCheckIns}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">Peak</p>
            <p className="mt-1 text-sm font-bold text-zinc-950">{peakDay.count}</p>
          </div>
        </div>
      </div>
      <figure aria-label="Last 30 days attendance chart">
        <figcaption className="sr-only">
          Area chart showing accepted attendance check-ins for each day in the last 30 days.
        </figcaption>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <defs>
              <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0891b2" stopOpacity={0.24} />
                <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#71717a' }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#71717a' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                fontSize: 12,
                boxShadow: '0 18px 40px rgba(15, 23, 42, 0.10)',
              }}
              labelStyle={{ color: '#52525b' }}
              itemStyle={{ color: '#0e7490' }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#0e7490"
              strokeWidth={2}
              fill="url(#attendanceGradient)"
              name="Check-ins"
            />
          </AreaChart>
        </ResponsiveContainer>
      </figure>
    </Surface>
  )
}
