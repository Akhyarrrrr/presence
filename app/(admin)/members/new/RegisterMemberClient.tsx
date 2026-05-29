'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BadgeCheck, Save } from 'lucide-react'
import { toast } from 'sonner'
import FaceCapture from '@/components/camera/FaceCapture'
import { createClient } from '@/lib/supabase/client'
import type { Department } from '@/types'
import { StatusBadge, Surface } from '@/components/ui/presence-ui'

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

  const inputClass =
    'w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-3 text-sm font-medium text-zinc-950 placeholder-zinc-400 transition focus:outline-none focus:ring-2 focus:ring-cyan-600'

  return (
    <div className="grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Step 1</p>
            <h2 className="mt-1 text-lg font-bold text-zinc-950">Capture identity signal</h2>
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
          </div>
          <Link
            href="/members"
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-cyan-200 hover:text-cyan-800"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="member-name" className="mb-1.5 block text-sm font-semibold text-zinc-700">
              Full Name *
            </label>
            <input
              id="member-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Akhyar"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="member-id" className="mb-1.5 block text-sm font-semibold text-zinc-700">
              Employee / Student ID *
            </label>
            <input
              id="member-id"
              value={form.employee_id}
              onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))}
              placeholder="e.g. EMP-001"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="member-department" className="mb-1.5 block text-sm font-semibold text-zinc-700">
              Department
            </label>
            <select
              id="member-department"
              value={form.department_id}
              onChange={(e) => {
                const nextDepartmentId = e.target.value
                setForm((prev) => ({ ...prev, department_id: nextDepartmentId }))
                if (nextDepartmentId !== '__custom__') setCustomDepartmentName('')
              }}
              className={inputClass}
            >
              <option value="">No department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
              <option value="__custom__">Custom department...</option>
            </select>
          </div>

          {form.department_id === '__custom__' && (
            <div>
              <label htmlFor="member-custom-department" className="mb-1.5 block text-sm font-semibold text-zinc-700">
                Custom Department Name
              </label>
              <input
                id="member-custom-department"
                value={customDepartmentName}
                onChange={(e) => setCustomDepartmentName(e.target.value)}
                placeholder="e.g. Field Ops"
                required
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label htmlFor="member-email" className="mb-1.5 block text-sm font-semibold text-zinc-700">
              Email
            </label>
            <input
              id="member-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="optional"
              className={inputClass}
            />
          </div>

          {!faceData && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Capture a face photo first before saving.
            </div>
          )}

          {faceData && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              <BadgeCheck size={16} />
              Face descriptor is ready to be enrolled.
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !faceData}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-cyan-700 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Registering...' : 'Register Member'}
          </button>
        </form>
      </Surface>
    </div>
  )
}
