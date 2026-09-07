'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button, Surface } from '@/components/ui/presence-ui'

const actions = [
  ['check_in', 'Check in'],
  ['break_start', 'Start break'],
  ['break_end', 'End break'],
  ['check_out', 'Check out'],
] as const

export default function FallbackAttendance({ organization }: { organization: string }) {
  const [badge, setBadge] = useState('')
  const [pin, setPin] = useState('')
  const [action, setAction] = useState<(typeof actions)[number][0]>('check_in')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    const response = await fetch('/api/attendance/fallback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organization, badge, pin, action }) })
    const result = await response.json() as { error?: string }
    setLoading(false)
    if (!response.ok) toast.error(result.error || 'Attendance action failed')
    else { toast.success(actions.find(item => item[0] === action)?.[1] || 'Attendance saved'); setPin('') }
  }

  return <Surface className="mx-auto mt-6 w-[calc(100vw-2rem)] p-5 sm:w-full"><h2 className="text-lg font-bold text-zinc-950">Camera alternative</h2><p className="mt-1 text-sm text-zinc-600">Use your organization-issued badge code and PIN when camera verification is not suitable.</p><form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_180px_auto]"><div><label htmlFor="badge-code" className="text-sm font-semibold text-zinc-800">Badge code</label><input id="badge-code" required minLength={3} value={badge} onChange={event => setBadge(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-zinc-300 px-3" /></div><div><label htmlFor="attendance-pin" className="text-sm font-semibold text-zinc-800">PIN</label><input id="attendance-pin" type="password" inputMode="numeric" required minLength={4} value={pin} onChange={event => setPin(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-zinc-300 px-3" /></div><div><label htmlFor="attendance-action" className="text-sm font-semibold text-zinc-800">Action</label><select id="attendance-action" value={action} onChange={event => setAction(event.target.value as typeof action)} className="mt-1 h-11 w-full rounded-lg border border-zinc-300 px-3">{actions.map(item => <option key={item[0]} value={item[0]}>{item[1]}</option>)}</select></div><Button type="submit" disabled={loading} className="self-end">{loading ? 'Saving...' : 'Continue'}</Button></form></Surface>
}
