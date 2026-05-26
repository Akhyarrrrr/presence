'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Member } from '@/types'

export default function MembersClient({ initialMembers }: Readonly<{ initialMembers: Member[] }>) {
  const [members, setMembers] = useState(initialMembers)
  const [search, setSearch] = useState('')

  const filtered = members.filter(
    (member) =>
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.employee_id.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name}? Their attendance history will also be deleted.`)) return

    const supabase = createClient()
    const { error } = await supabase.from('members').delete().eq('id', id)

    if (error) {
      toast.error('Failed to remove member')
      return
    }

    setMembers((prev) => prev.filter((member) => member.id !== id))
    toast.success(`${name} removed`)
  }

  return (
    <div>
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or ID..."
          className="w-full rounded-xl border border-gray-800 bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 py-16 text-center">
          <p className="mb-3 text-gray-500">{search ? 'No members found' : 'No members registered yet'}</p>
          <Link
            href="/members/new"
            className="inline-flex items-center gap-2 text-sm text-indigo-400 transition hover:text-indigo-300"
          >
            <UserPlus size={14} />
            Register first member
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((member) => (
            <div
              key={member.id}
              className="group rounded-2xl border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-700"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-indigo-500/20 text-lg font-bold text-indigo-400">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.name} className="h-full w-full object-cover" />
                  ) : (
                    member.name[0].toUpperCase()
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(member.id, member.name)}
                  aria-label={`Remove ${member.name}`}
                  className="cursor-pointer rounded-lg p-1.5 text-gray-600 opacity-100 transition hover:bg-red-400/10 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <p className="font-medium text-white">{member.name}</p>
              <p className="text-sm text-gray-500">{member.employee_id}</p>
              {member.departments?.name && (
                <span className="mt-2 inline-block rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-400">
                  {member.departments.name}
                </span>
              )}
              <div className="mt-3 flex items-center gap-1.5 border-t border-gray-800 pt-3">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-gray-500">Face registered</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
