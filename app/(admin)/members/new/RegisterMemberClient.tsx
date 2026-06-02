'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Fingerprint, Save, ShieldCheck, UserRoundPlus } from 'lucide-react'
import { toast } from 'sonner'
import FaceCapture from '@/components/camera/FaceCapture'
import { createClient } from '@/lib/supabase/client'
import type { Department } from '@/types'
import {
  Button,
  Field,
  SelectField,
  StatusBadge,
  StatusPill,
  Surface,
  TextInput,
} from '@/components/ui/presence-ui'

function toVectorLiteral(descriptor: number[]) {
  return `[${descriptor.join(',')}]`
}

export default function RegisterMemberClient({
  departments,
  organizationId,
}: Readonly<{ departments: Department[]; organizationId: string }>) {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', employee_id: '', department_id: '', email: '' })
  const [customDepartmentName, setCustomDepartmentName] = useState('')
  const [faceData, setFaceData] = useState<{ descriptor: number[]; photoDataUrl: string } | null>(null)
  const [saving, setSaving] = useState(false)

  function handleCapture(descriptor: number[], photoDataUrl: string) {
    setFaceData({ descriptor, photoDataUrl })
    toast.success('Face captured. Fill in the details and save.')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!faceData) {
      toast.error('Please capture a face photo first')
      return
    }

    if (!form.name.trim() || !form.employee_id.trim()) {
      toast.error('Name and Employee ID are required')
      return
    }

    setSaving(true)
    const supabase = createClient()
    let departmentId: string | null = form.department_id || null

    if (form.department_id === '__custom__') {
      const customName = customDepartmentName.trim()
      if (!customName) {
        toast.error('Please enter a department name.')
        setSaving(false)
        return
      }

      const { data: createdDepartment, error: createDepartmentError } = await supabase
        .from('departments')
        .insert({ name: customName })
        .select('id')
        .single()

      if (createDepartmentError) {
        const message = createDepartmentError.message.toLowerCase()
        const isDuplicateName =
          message.includes('duplicate key') ||
          message.includes('already exists') ||
          message.includes('departments_name_key') ||
          createDepartmentError.code === '23505'

        if (isDuplicateName) {
          toast.error('Department already exists. Please select it from the list.')
        } else {
          toast.error('Failed to create department. Please try again.')
        }
        setSaving(false)
        return
      }

      departmentId = createdDepartment.id
    }

    let photoUrl: string | null = null
    const blob = await fetch(faceData.photoDataUrl).then((response) => response.blob())
    const filename = `${Date.now()}-${form.employee_id.replace(/\s/g, '-')}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('member-photos')
      .upload(filename, blob, { contentType: 'image/jpeg' })

    if (!uploadError) {
      const {
        data: { publicUrl },
      } = supabase.storage.from('member-photos').getPublicUrl(filename)
      photoUrl = publicUrl
    }

    const { data: memberRow, error } = await supabase
      .from('members')
      .insert({
        organization_id: organizationId,
        name: form.name.trim(),
        employee_id: form.employee_id.trim(),
        department_id: departmentId,
        email: form.email.trim() || null,
        face_descriptor: faceData.descriptor,
        photo_url: photoUrl,
      })
      .select('id')
      .single()

    if (error) {
      const isDuplicateEmployeeId =
        error.code === '23505' || error.message.toLowerCase().includes('unique')
      toast.error(
        isDuplicateEmployeeId
          ? 'Employee ID already exists'
          : 'Member registration could not be completed. Please try again.'
      )
      setSaving(false)
      return
    }

    const { error: descriptorError } = await supabase.from('member_face_descriptors').insert({
      organization_id: organizationId,
      member_id: memberRow.id,
      descriptor: toVectorLiteral(faceData.descriptor),
    })

    if (descriptorError) {
      await supabase
        .from('members')
        .delete()
        .eq('id', memberRow.id)
        .eq('organization_id', organizationId)

      toast.error('Face enrollment could not be completed. Please try again.')
      setSaving(false)
      return
    }

    toast.success(`${form.name} registered successfully`)
    router.push('/members')
  }

  return (
    <div className="grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Step 1</p>
            <h2 className="mt-1 text-lg font-bold text-zinc-950">Capture identity signal</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Use a clear, centered face image for reliable kiosk recognition.
            </p>
          </div>
          <StatusBadge tone={faceData ? 'emerald' : 'zinc'}>
            {faceData ? 'Captured' : 'Waiting'}
          </StatusBadge>
        </div>
        <FaceCapture onCapture={handleCapture} isLoading={saving} />
      </div>

      <Surface className="p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Step 2</p>
            <h2 className="mt-1 text-lg font-bold text-zinc-950">Member details</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Members are managed by admins and do not need workspace login access.
            </p>
          </div>
          <Link
            href="/members"
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-cyan-200 hover:text-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3">
            <UserRoundPlus size={16} className="text-cyan-700" />
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Profile</p>
            <p className="mt-1 text-sm font-semibold text-zinc-950">Required details</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3">
            <Fingerprint size={16} className="text-emerald-700" />
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Face</p>
            <p className="mt-1 text-sm font-semibold text-zinc-950">{faceData ? 'Ready' : 'Waiting'}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field id="member-name" label="Full Name *">
            <TextInput
              id="member-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Akhyar…"
              autoComplete="name"
              required
            />
          </Field>

          <Field id="member-id" label="Employee / Student ID *">
            <TextInput
              id="member-id"
              value={form.employee_id}
              onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))}
              placeholder="e.g. EMP-001…"
              autoComplete="off"
              required
            />
          </Field>

          <SelectField
            id="member-department"
            label="Department"
            value={form.department_id}
            onChange={(e) => {
              const nextDepartmentId = e.target.value
              setForm((prev) => ({ ...prev, department_id: nextDepartmentId }))
              if (nextDepartmentId !== '__custom__') setCustomDepartmentName('')
            }}
          >
            <option value="">No department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
            <option value="__custom__">Custom department…</option>
          </SelectField>

          {form.department_id === '__custom__' && (
            <Field id="member-custom-department" label="Custom Department Name">
              <TextInput
                id="member-custom-department"
                value={customDepartmentName}
                onChange={(e) => setCustomDepartmentName(e.target.value)}
                placeholder="e.g. Field Ops…"
                autoComplete="off"
                required
              />
            </Field>
          )}

          <Field id="member-email" label="Email" hint="Optional contact metadata. This does not create member login access.">
            <TextInput
              id="member-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Optional email…"
              autoComplete="email"
              spellCheck={false}
            />
          </Field>

          {!faceData && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Capture a face photo first before saving.
            </div>
          )}

          {faceData && (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              <ShieldCheck size={16} className="mt-0.5 shrink-0" />
              <span>Face descriptor is ready to be enrolled.</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={saving || !faceData}
            size="lg"
            className="w-full"
          >
            <Save size={16} />
            {saving ? 'Registering…' : 'Register Member'}
          </Button>
        </form>
        <div className="mt-5 flex flex-wrap gap-2">
          <StatusPill tone="zinc">Admin managed</StatusPill>
          <StatusPill tone={faceData ? 'emerald' : 'amber'}>{faceData ? 'Capture complete' : 'Capture required'}</StatusPill>
        </div>
      </Surface>
    </div>
  )
}
