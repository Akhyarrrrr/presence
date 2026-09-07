'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { BrandMark, Button, Surface } from '@/components/ui/presence-ui'

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  async function accept() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/login?next=${encodeURIComponent(`/invite/${token}`)}`); return }
    const { error } = await supabase.rpc('accept_admin_invitation', { raw_token: token })
    setLoading(false)
    if (error) toast.error('This invitation is invalid, expired, or belongs to another email.')
    else { toast.success('Invitation accepted.'); router.push('/dashboard'); router.refresh() }
  }
  return <main className="grid min-h-screen place-items-center px-4"><Surface className="w-full max-w-md p-7"><BrandMark /><h1 className="mt-6 text-2xl font-bold text-zinc-950">Join organization</h1><p className="mt-3 text-sm leading-6 text-zinc-600">Sign in with the exact email that received this link, then accept access.</p><Button type="button" size="lg" className="mt-6 w-full" disabled={loading} onClick={accept}>{loading ? 'Checking...' : 'Accept invitation'}</Button><Link href="/login" className="mt-4 block text-center text-sm text-cyan-700">Sign in first</Link></Surface></main>
}
