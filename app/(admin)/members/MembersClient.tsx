'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, Building2, FileUp, IdCard, Mail, Search, ShieldCheck, UserMinus, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Member } from '@/types'
import { Button, EmptyState, FilterBar, MemberAvatar, StatusBadge, StatusPill, Surface } from '@/components/ui/presence-ui'

export default function MembersClient({
  initialMembers,
  organizationId,
}: Readonly<{ initialMembers: Member[]; organizationId: string }>) {
  const [members, setMembers] = useState(initialMembers)
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)

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

  async function importCsv(file: File) {
    setImporting(true)
    // ponytail: intentionally supports plain comma-separated values; use a CSV library if quoted commas become a real roster need.
    const lines = (await file.text()).split(/\r?\n/).filter(Boolean)
    const headers = lines.shift()?.split(',').map((value) => value.trim().toLowerCase()) || []
    const nameIndex = headers.indexOf('name')
    const idIndex = headers.indexOf('employee_id')
    const emailIndex = headers.indexOf('email')
    if (nameIndex < 0 || idIndex < 0) {
      toast.error('CSV must contain name and employee_id headers')
      setImporting(false)
      return
    }
    const rows = lines.map((line) => line.split(',').map((value) => value.trim())).filter((values) => values[nameIndex] && values[idIndex]).map((values) => ({
      organization_id: organizationId,
      name: values[nameIndex],
      employee_id: values[idIndex],
      email: emailIndex >= 0 ? values[emailIndex] || null : null,
      face_descriptor: null,
    }))
    if (!rows.length) {
      toast.error('CSV has no valid member rows')
      setImporting(false)
      return
    }
    const { data, error } = await createClient().from('members').insert(rows).select('*, departments(name)')
    setImporting(false)
    if (error) return void toast.error(error.message)
    setMembers((current) => [...(data as Member[]), ...current])
    toast.success(`${data.length} members imported`)
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
            name="member-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID…"
            autoComplete="off"
            className="w-full rounded-lg border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-zinc-950 placeholder-zinc-400 transition focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2"
          />
        </div>
      </FilterBar>

      <Surface className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <div><p className="font-semibold text-zinc-950">Bulk roster import</p><p className="text-sm text-zinc-600">CSV headers: name, employee_id, email. Imported members enroll face or badge later.</p></div>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700">
          <FileUp size={16} /> {importing ? 'Importing…' : 'Import CSV'}
          <input type="file" accept=".csv,text/csv" disabled={importing} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file) }} />
        </label>
      </Surface>

      <Surface className="p-4">
        <div className="reveal-stagger grid gap-2 text-sm leading-6 text-zinc-600 sm:grid-cols-3">
          <p className="reveal-up rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
            Use full names and unique IDs to keep roster search fast.
          </p>
          <p className="reveal-up rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
            Keep active status only for members who are allowed to check in.
          </p>
          <p className="reveal-up rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
            Deactivate members instead of deleting them to preserve attendance history.
          </p>
        </div>
      </Surface>

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
          <div className="reveal-stagger grid grid-cols-1 gap-4 lg:hidden">
            {filtered.map((member) => (
              <Surface key={member.id} className="group p-4" hover>
                <div className="flex items-start gap-3">
                  <MemberAvatar name={member.name} photoUrl={member.photo_url} className="h-12 w-12 text-lg" />
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
                  <StatusBadge tone={member.face_descriptor ? 'emerald' : 'amber'}>
                    <BadgeCheck size={12} />
                    {member.face_descriptor ? 'Face registered' : 'Enrollment pending'}
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
                          <MemberAvatar name={member.name} photoUrl={member.photo_url} className="text-sm" />
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
                        <StatusBadge tone={member.face_descriptor ? 'emerald' : 'amber'}>
                          <ShieldCheck size={12} />
                          {member.face_descriptor ? 'Face registered' : 'Enrollment pending'}
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
