'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import FaceCapture from '@/components/camera/FaceCapture'
import { createClient } from '@/lib/supabase/client'
import type { Department } from '@/types'

export default function RegisterMemberClient({
  departments,
}: Readonly<{ departments: Department[] }>) {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', employee_id: '', department_id: '', email: '' })
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

    const { error } = await supabase.from('members').insert({
      name: form.name.trim(),
      employee_id: form.employee_id.trim(),
      department_id: form.department_id || null,
      email: form.email.trim() || null,
      face_descriptor: faceData.descriptor,
      photo_url: photoUrl,
    })

    if (error) {
      toast.error(error.message.includes('unique') ? 'Employee ID already exists' : error.message)
      setSaving(false)
      return
    }

    toast.success(`${form.name} registered successfully`)
    router.push('/members')
  }

  const inputClass =
    'w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="grid max-w-4xl grid-cols-1 gap-8 lg:grid-cols-2">
      <div>
        <h2 className="mb-4 text-sm font-semibold text-gray-300">Step 1 - Capture Face</h2>
        <FaceCapture onCapture={handleCapture} isLoading={saving} />
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold text-gray-300">Step 2 - Member Details</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Full Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Akhyar"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Employee / Student ID *</label>
            <input
              value={form.employee_id}
              onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))}
              placeholder="e.g. EMP-001"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Department</label>
            <select
              value={form.department_id}
              onChange={(e) => setForm((prev) => ({ ...prev, department_id: e.target.value }))}
              className={inputClass}
            >
              <option value="">No department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="optional"
              className={inputClass}
            />
          </div>

          {!faceData && (
            <div className="rounded-xl border border-amber-400/10 bg-amber-400/5 px-4 py-3 text-sm text-amber-400">
              Capture a face photo first before saving.
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !faceData}
            className="w-full cursor-pointer rounded-xl bg-indigo-600 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Registering...' : 'Register Member'}
          </button>
        </form>
      </div>
    </div>
  )
}
