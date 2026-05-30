'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Clock3, Edit3, Loader2, Plus, Power, RotateCcw, Save, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
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
import type { Shift } from '@/types'

interface ShiftForm {
  id?: string
  name: string
  start_time: string
  end_time: string
  tolerance_minutes: string
  very_late_after_minutes: string
  color: string
  is_active: boolean
}

const emptyForm: ShiftForm = {
  name: '',
  start_time: '08:00',
  end_time: '17:00',
  tolerance_minutes: '15',
  very_late_after_minutes: '30',
  color: '#0e7490',
  is_active: true,
}

const colorOptions = ['#0e7490', '#059669', '#d97706', '#be123c', '#52525b']

export default function ShiftsClient({
  initialShifts,
  organizationId,
}: Readonly<{ initialShifts: Shift[]; organizationId: string }>) {
  const router = useRouter()
  const [form, setForm] = useState<ShiftForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [validation, setValidation] = useState<string | null>(null)
  const activeCount = useMemo(() => initialShifts.filter((shift) => shift.is_active).length, [initialShifts])

  function editShift(shift: Shift) {
    setValidation(null)
    setForm({
      id: shift.id,
      name: shift.name,
      start_time: shift.start_time.slice(0, 5),
      end_time: shift.end_time.slice(0, 5),
      tolerance_minutes: String(shift.tolerance_minutes),
      very_late_after_minutes: String(shift.very_late_after_minutes),
      color: shift.color,
      is_active: shift.is_active,
    })
  }

  function resetForm() {
    setValidation(null)
    setForm(emptyForm)
  }

  function validateForm() {
    const tolerance = Number(form.tolerance_minutes)
    const veryLate = Number(form.very_late_after_minutes)

    if (!form.name.trim()) return 'Shift name is required.'
    if (!form.start_time || !form.end_time) return 'Start and end time are required.'
    if (!Number.isInteger(tolerance) || tolerance < 0) return 'Tolerance must be a whole number.'
    if (!Number.isInteger(veryLate) || veryLate < tolerance) {
      return 'Very late threshold must be greater than or equal to tolerance.'
    }

    return null
  }

  async function saveShift(e: React.FormEvent) {
    e.preventDefault()
    const message = validateForm()

    if (message) {
      setValidation(message)
      return
    }

    setSaving(true)
    setValidation(null)

    const payload = {
      organization_id: organizationId,
      name: form.name.trim(),
      start_time: form.start_time,
      end_time: form.end_time,
      tolerance_minutes: Number(form.tolerance_minutes),
      very_late_after_minutes: Number(form.very_late_after_minutes),
      color: form.color,
      is_active: form.is_active,
    }

    const supabase = createClient()
    const { error } = form.id
      ? await supabase
          .from('shifts')
          .update(payload)
          .eq('id', form.id)
          .eq('organization_id', organizationId)
      : await supabase.from('shifts').insert(payload)

    setSaving(false)

    if (error) {
      toast.error(error.message.includes('duplicate') ? 'A shift with this name already exists.' : error.message)
      return
    }

    toast.success(form.id ? 'Shift updated' : 'Shift created')
    resetForm()
    router.refresh()
  }

  async function setShiftActive(shift: Shift, isActive: boolean) {
    const supabase = createClient()
    const { error } = await supabase
      .from('shifts')
      .update({ is_active: isActive })
      .eq('id', shift.id)
      .eq('organization_id', organizationId)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(isActive ? 'Shift reactivated' : 'Shift deactivated')
    router.refresh()
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
      <Surface className="p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
              {form.id ? 'Edit shift' : 'New shift'}
            </p>
            <h2 className="mt-1 text-lg font-bold text-zinc-950">Shift rule</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Define reusable time windows for schedule planning.
            </p>
          </div>
          <StatusBadge tone={form.id ? 'amber' : 'cyan'}>{form.id ? 'Editing' : 'Draft'}</StatusBadge>
        </div>

        <form onSubmit={saveShift} className="flex flex-col gap-4">
          <Field id="shift-name" label="Name">
            <TextInput
              id="shift-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Shift Pagi"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="shift-start" label="Start">
              <TextInput
                id="shift-start"
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
              />
            </Field>
            <Field id="shift-end" label="End">
              <TextInput
                id="shift-end"
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field id="shift-tolerance" label="Tolerance">
              <TextInput
                id="shift-tolerance"
                type="number"
                min={0}
                value={form.tolerance_minutes}
                onChange={(e) => setForm((prev) => ({ ...prev, tolerance_minutes: e.target.value }))}
              />
            </Field>
            <Field id="shift-very-late" label="Very late">
              <TextInput
                id="shift-very-late"
                type="number"
                min={0}
                value={form.very_late_after_minutes}
                onChange={(e) => setForm((prev) => ({ ...prev, very_late_after_minutes: e.target.value }))}
              />
            </Field>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Color</span>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Use color ${color}`}
                  aria-pressed={form.color === color}
                  onClick={() => setForm((prev) => ({ ...prev, color }))}
                  className={cn(
                    'h-9 w-9 cursor-pointer rounded-md border border-zinc-200 ring-offset-2 transition focus:outline-none focus:ring-2 focus:ring-cyan-600',
                    form.color === color && 'ring-2 ring-cyan-600'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-3">
            <span>
              <span className="block text-sm font-semibold text-zinc-800">Active</span>
              <span className="block text-xs text-zinc-500">Active shifts can be assigned.</span>
            </span>
            <input
              id="shift-active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4 accent-cyan-700"
            />
          </label>

          {validation && (
            <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              {validation}
            </p>
          )}

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {form.id ? 'Save changes' : 'Create shift'}
            </Button>
            {form.id && (
              <Button
                type="button"
                onClick={resetForm}
                variant="secondary"
                aria-label="Reset shift form"
              >
                <RotateCcw size={15} />
              </Button>
            )}
          </div>
        </form>
      </Surface>

      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Total" value={initialShifts.length} icon={Timer} tone="cyan" />
          <StatTile label="Active" value={activeCount} icon={CheckCircle} tone="emerald" />
          <StatTile label="Default tolerance" value="15m" icon={Clock3} tone="zinc" />
        </div>

        {initialShifts.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No shifts yet"
            description="Create the first reusable shift before assigning members to work dates."
          />
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {initialShifts.map((shift) => (
                <Surface key={shift.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-1 h-9 w-2 shrink-0 rounded-full" style={{ backgroundColor: shift.color }} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-950">{shift.name}</p>
                        <p className="mt-1 font-mono text-xs font-semibold text-zinc-500">
                          {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge tone={shift.is_active ? 'emerald' : 'zinc'}>
                      {shift.is_active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </div>
                  <div className="mt-4 grid gap-3 border-t border-zinc-200 pt-3">
                    <p className="text-xs font-medium text-zinc-500">
                      {shift.tolerance_minutes}m tolerance / {shift.very_late_after_minutes}m very late
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        onClick={() => editShift(shift)}
                        variant="secondary"
                        size="sm"
                      >
                        <Edit3 size={13} />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setShiftActive(shift, !shift.is_active)}
                        variant="secondary"
                        size="sm"
                        className="hover:border-rose-200 hover:text-rose-700"
                      >
                        {shift.is_active ? <Power size={13} /> : <CheckCircle size={13} />}
                        {shift.is_active ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </div>
                  </div>
                </Surface>
              ))}
            </div>

            <Surface className="hidden overflow-hidden md:block">
              <div className="border-b border-zinc-200 bg-zinc-50/80 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-zinc-950">Shift catalog</h2>
                    <p className="mt-1 text-xs text-zinc-500">Reusable rules for daily schedule assignment.</p>
                  </div>
                  <StatusPill tone="cyan">{activeCount} active</StatusPill>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <caption className="sr-only">Shift rules</caption>
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/80">
                      <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Shift</th>
                      <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Window</th>
                      <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Rules</th>
                      <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Status</th>
                      <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/70 bg-white">
                    {initialShifts.map((shift) => (
                      <tr key={shift.id} className="transition hover:bg-cyan-50/40">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="h-9 w-2 rounded-full" style={{ backgroundColor: shift.color }} />
                            <div>
                              <p className="text-sm font-semibold text-zinc-950">{shift.name}</p>
                              <p className="text-xs text-zinc-500">Created {new Date(shift.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 font-mono text-sm font-semibold text-zinc-700">
                            <Clock3 size={14} className="text-zinc-400" />
                            {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-zinc-600">
                          {shift.tolerance_minutes}m tolerance / {shift.very_late_after_minutes}m very late
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge tone={shift.is_active ? 'emerald' : 'zinc'}>
                            {shift.is_active ? 'Active' : 'Inactive'}
                          </StatusBadge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              onClick={() => editShift(shift)}
                              variant="secondary"
                              size="sm"
                            >
                              <Edit3 size={13} />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setShiftActive(shift, !shift.is_active)}
                              variant="secondary"
                              size="sm"
                              className="hover:border-rose-200 hover:text-rose-700"
                            >
                              {shift.is_active ? <Power size={13} /> : <CheckCircle size={13} />}
                              {shift.is_active ? 'Deactivate' : 'Reactivate'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Surface>
          </>
        )}
      </div>
    </div>
  )
}
