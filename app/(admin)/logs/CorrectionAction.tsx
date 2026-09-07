'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function CorrectionAction({ logId, checkIn, checkOut, status }: Readonly<{ logId: string; checkIn: string; checkOut?: string | null; status?: string | null }>) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  async function submit(formData: FormData) {
    setSaving(true)
    const reason = String(formData.get('reason') || '').trim()
    const newCheckIn = String(formData.get('checkIn') || '')
    const newCheckOut = String(formData.get('checkOut') || '')
    const newStatus = String(formData.get('status') || '')
    const { error } = await createClient().rpc('correct_attendance', {
      log_id: logId,
      reason_text: reason,
      new_check_in: newCheckIn ? new Date(newCheckIn).toISOString() : null,
      new_check_out: newCheckOut ? new Date(newCheckOut).toISOString() : null,
      new_status: newStatus || null,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Attendance corrected and audit trail recorded')
    setOpen(false)
    router.refresh()
  }
  return <>
    <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-md border border-zinc-200 px-3 text-xs font-semibold text-zinc-700">Correct</button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/40 p-4" role="dialog" aria-modal="true" aria-label="Correct attendance">
      <form action={submit} className="w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-zinc-950">Correct attendance</h2>
        <label className="block text-sm font-semibold">Check-in<input name="checkIn" type="datetime-local" defaultValue={checkIn.slice(0, 16)} className="mt-1 min-h-11 w-full rounded-md border px-3" /></label>
        <label className="block text-sm font-semibold">Check-out<input name="checkOut" type="datetime-local" defaultValue={checkOut?.slice(0, 16)} className="mt-1 min-h-11 w-full rounded-md border px-3" /></label>
        <label className="block text-sm font-semibold">Status<select name="status" defaultValue={status || 'present'} className="mt-1 min-h-11 w-full rounded-md border px-3"><option value="on_time">On time</option><option value="late">Late</option><option value="very_late">Very late</option><option value="no_shift">No shift</option><option value="present">Present</option></select></label>
        <label className="block text-sm font-semibold">Reason<textarea name="reason" required minLength={5} className="mt-1 min-h-24 w-full rounded-md border p-3" /></label>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-md border px-4">Cancel</button><button disabled={saving} className="min-h-11 rounded-md bg-cyan-700 px-4 font-semibold text-white">{saving ? 'Saving…' : 'Save correction'}</button></div>
      </form>
    </div>}
  </>
}
