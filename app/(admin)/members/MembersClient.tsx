'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, Building2, IdCard, Mail, Search, ShieldCheck, UserMinus, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Member } from '@/types'
import { Button, EmptyState, FilterBar, StatusBadge, StatusPill, Surface } from '@/components/ui/presence-ui'

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
  const departmentCount = new Set(
    members.map((member) => member.departments?.name).filter(Boolean)
  ).size
  const activeCount = members.filter((member) => member.is_active).length

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
    <div className="flex flex-col gap-5">
      <FilterBar>
        <div className="grid grid-cols-3 gap-2 sm:min-w-80">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">Profiles</p>
            <p className="mt-1 text-lg font-bold text-zinc-950">{members.length}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">Visible</p>
            <p className="mt-1 text-lg font-bold text-zinc-950">{filtered.length}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">Teams</p>
            <p className="mt-1 text-lg font-bold text-zinc-950">{departmentCount}</p>
          </div>
        </div>
        <div className="relative w-full sm:max-w-sm" role="search">
          <label htmlFor="member-search" className="sr-only">
            Search members
          </label>
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            id="member-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full rounded-lg border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-zinc-950 placeholder-zinc-400 transition focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2"
          />
        </div>
      </FilterBar>

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
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
            >
              <UserPlus size={14} />
              Register first member
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {filtered.map((member) => (
              <Surface key={member.id} className="group p-4" hover>
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-cyan-50 text-lg font-bold text-cyan-800 ring-1 ring-cyan-100">
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.name} className="h-full w-full object-cover" />
                    ) : (
                      member.name[0].toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-zinc-950">{member.name}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
                      <IdCard size={13} />
                      {member.employee_id}
                    </p>
                    {member.email && (
                      <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-zinc-500">
                        <Mail size={12} />
                        {member.email}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeactivate(member.id, member.name)}
                    aria-label={`Deactivate ${member.name}`}
                    className="cursor-pointer rounded-md p-2 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                  >
                    <UserMinus size={15} />
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-3">
                  <StatusBadge tone="emerald">
                    <BadgeCheck size={12} />
                    Face registered
                  </StatusBadge>
                  <StatusBadge tone={member.is_active ? 'cyan' : 'zinc'}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </StatusBadge>
                  {member.departments?.name && (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700">
                      <Building2 size={12} />
                      {member.departments.name}
                    </span>
                  )}
                </div>
              </Surface>
            ))}
          </div>

          <Surface className="hidden overflow-hidden lg:block">
            <div className="border-b border-zinc-200 bg-zinc-50/80 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-zinc-950">Member directory</h2>
                  <p className="mt-1 text-xs text-zinc-500">Active identity profiles available to the kiosk.</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill tone="emerald">{activeCount} active</StatusPill>
                  <StatusPill tone="cyan" icon={Users}>{filtered.length} visible</StatusPill>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <caption className="sr-only">Member identity directory</caption>
                <thead>
                  <tr className="border-b border-zinc-200 bg-white">
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Member</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Department</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Enrollment</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Status</th>
                    <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/70 bg-white">
                  {filtered.map((member) => (
                    <tr key={member.id} className="transition hover:bg-cyan-50/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-cyan-50 text-sm font-bold text-cyan-800 ring-1 ring-cyan-100">
                            {member.photo_url ? (
                              <img src={member.photo_url} alt={member.name} className="h-full w-full object-cover" />
                            ) : (
                              member.name[0].toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-950">{member.name}</p>
                            <p className="mt-0.5 text-xs text-zinc-500">{member.employee_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700">
                          <Building2 size={12} />
                          {member.departments?.name || 'No department'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge tone="emerald">
                          <ShieldCheck size={12} />
                          Face registered
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge tone={member.is_active ? 'cyan' : 'zinc'}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          type="button"
                          onClick={() => handleDeactivate(member.id, member.name)}
                          variant="secondary"
                          size="sm"
                          className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-rose-200 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        >
                          <UserMinus size={13} />
                          Deactivate
                        </Button>
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
  )
}
