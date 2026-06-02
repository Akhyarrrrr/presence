'use client'

import { useRouter } from 'next/navigation'

export default function DateFilter({
  selectedDate,
  maxDate,
}: Readonly<{ selectedDate: string; maxDate: string }>) {
  const router = useRouter()

  return (
    <label
      htmlFor="attendance-log-date"
      className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-[0_12px_40px_rgba(15,23,42,0.04)]"
    >
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Date</span>
      <input
        id="attendance-log-date"
        name="attendance-log-date"
        type="date"
        defaultValue={selectedDate}
        max={maxDate}
        onChange={(e) => router.push(`/logs?date=${e.target.value}`)}
        className="cursor-pointer rounded-md bg-transparent px-1 text-sm font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
      />
    </label>
  )
}
