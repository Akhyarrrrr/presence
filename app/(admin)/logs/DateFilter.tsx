'use client'

import { useRouter } from 'next/navigation'

export default function DateFilter({
  selectedDate,
  maxDate,
}: Readonly<{ selectedDate: string; maxDate: string }>) {
  const router = useRouter()

  return (
    <input
      type="date"
      defaultValue={selectedDate}
      max={maxDate}
      onChange={(e) => router.push(`/logs?date=${e.target.value}`)}
      className="rounded-lg border border-gray-800 bg-gray-900 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  )
}
