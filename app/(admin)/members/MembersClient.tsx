'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Building2, Search, ShieldCheck, UserMinus, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Member } from '@/types'
import { EmptyState, Surface } from '@/components/ui/presence-ui'

export default function MembersClient({
  initialMembers,
  organizationId,
}: Readonly<{ initialMembers: Member[]; organizationId: string }>) {
  const [members, setMembers] = useState(initialMembers)
  const [search, setSearch] = useState('')

  const filtered = members.filter(
    (member) =>
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.employee_id.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDeactivate(id: string, name: string) {
    if (!confirm(`Deactivate ${name}? They will no longer appear in kiosk recognition.`)) return

    const supabase = createClient()
    const { error } = await supabase
      .from('members')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) {
      toast.error('Failed to deactivate member')
      return
    }

    setMembers((prev) => prev.filter((member) => member.id !== id))
    toast.success(`${name} deactivated`)
  }

  return (
    <div>
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or ID..."
          className="w-full rounded-lg border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-zinc-950 placeholder-zinc-400 shadow-[0_12px_40px_rgba(15,23,42,0.04)] transition focus:outline-none focus:ring-2 focus:ring-cyan-600"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={search ? 'No matching members' : 'No members registered yet'}
          description={
            search
              ? 'Try a different name, employee ID, or clear the search input.'
              : 'Create the first identity profile before opening kiosk mode.'
          }
          action={
            <Link
              href="/members/new"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800"
            >
              <UserPlus size={14} />
              Register first member
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((member) => (
            <Surface key={member.id} className="group p-4" hover>
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-cyan-50 text-lg font-bold text-cyan-800 ring-1 ring-cyan-100">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.name} className="h-full w-full object-cover" />
                  ) : (
                    member.name[0].toUpperCase()
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeactivate(member.id, member.name)}
                  aria-label={`Deactivate ${member.name}`}
                  className="cursor-pointer rounded-md p-1.5 text-zinc-400 opacity-100 transition hover:bg-rose-50 hover:text-rose-700 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <UserMinus size={14} />
                </button>
              </div>

              <p className="font-semibold text-zinc-950">{member.name}</p>
              <p className="text-sm text-zinc-500">{member.employee_id}</p>
              {member.departments?.name && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700">
                  <Building2 size={12} />
                  {member.departments.name}
                </span>
              )}
              <div className="mt-4 flex items-center gap-2 border-t border-zinc-200 pt-3">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span className="text-xs font-semibold text-zinc-500">Face registered</span>
              </div>
            </Surface>
          ))}
        </div>
      )}
    </div>
  )
}
