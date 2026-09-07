'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button, EmptyState, PageHeader, Surface } from '@/components/ui/presence-ui'
import { ShieldCheck } from 'lucide-react'

type Admin = { id: string; user_id: string; role: string; created_at: string }
type Invitation = { id: string; email: string; role: string; expires_at: string; accepted_at: string | null; created_at: string }

export default function TeamClient({ organizationName, owner, admins, invitations }: { organizationName: string; owner: boolean; admins: Admin[]; invitations: Invitation[] }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'viewer'>('admin')
  const [loading, setLoading] = useState(false)

  async function invite(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    const response = await fetch('/api/admin/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role }) })
    const result = await response.json() as { invite_url?: string; emailed?: boolean; error?: string }
    setLoading(false)
    if (!response.ok || !result.invite_url) { toast.error(result.error || 'Could not create invitation'); return }
    await navigator.clipboard.writeText(result.invite_url)
    toast.success(result.emailed ? 'Invitation emailed and secure link copied.' : 'Secure invite link copied. Email delivery is not configured yet.')
    setEmail('')
  }

  return <div><PageHeader eyebrow="Access control" title="Admin access" description={`Manage access to ${organizationName}.`} />
    {owner && <Surface className="mb-5 p-5"><form onSubmit={invite} className="grid gap-3 md:grid-cols-[1fr_160px_auto]"><div><label htmlFor="invite-email" className="text-sm font-semibold text-zinc-800">Email</label><input id="invite-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-zinc-300 px-3" /></div><div><label htmlFor="invite-role" className="text-sm font-semibold text-zinc-800">Role</label><select id="invite-role" value={role} onChange={event => setRole(event.target.value as 'admin' | 'viewer')} className="mt-1 h-11 w-full rounded-lg border border-zinc-300 px-3"><option value="admin">Admin</option><option value="viewer">Viewer</option></select></div><Button type="submit" disabled={loading} className="self-end">{loading ? 'Creating...' : 'Create invite'}</Button></form><p className="mt-3 text-xs text-zinc-500">The link expires after seven days and only works for the invited email.</p></Surface>}
    <div className="grid gap-5 lg:grid-cols-2"><Surface className="p-5"><h2 className="font-semibold text-zinc-950">Administrators</h2><div className="mt-4 space-y-2">{admins.map(admin => <div key={admin.id} className="flex justify-between rounded-lg bg-zinc-50 p-3 text-sm"><span className="font-mono text-zinc-600">{admin.user_id.slice(0, 8)}…</span><span className="font-semibold capitalize">{admin.role}</span></div>)}</div></Surface><Surface className="p-5"><h2 className="font-semibold text-zinc-950">Invitations</h2>{invitations.length ? <div className="mt-4 space-y-2">{invitations.map(invite => <div key={invite.id} className="rounded-lg bg-zinc-50 p-3 text-sm"><div className="flex justify-between gap-3"><span className="truncate">{invite.email}</span><span className="capitalize">{invite.role}</span></div><p className="mt-1 text-xs text-zinc-500">{invite.accepted_at ? 'Accepted' : `Expires ${new Date(invite.expires_at).toLocaleDateString()}`}</p></div>)}</div> : <EmptyState icon={ShieldCheck} title="No invitations" description="Create an invite when another administrator needs access." />}</Surface></div>
  </div>
}
