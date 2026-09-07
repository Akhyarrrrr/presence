import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAdminContext } from '@/lib/supabase/organization'

export async function POST(request: Request) {
  const supabase = await createClient()
  const context = await getCurrentAdminContext(supabase)
  if (!context || context.adminUser.role !== 'owner') return NextResponse.json({ error: 'Owner access required' }, { status: 403 })

  const body = await request.json().catch(() => null) as { email?: unknown; role?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const role = body?.role === 'viewer' ? 'viewer' : body?.role === 'admin' ? 'admin' : null
  if (!/^\S+@\S+\.\S+$/.test(email) || !role) return NextResponse.json({ error: 'Valid email and role are required' }, { status: 400 })

  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const { error } = await supabase.from('admin_invitations').insert({
    organization_id: context.organization.id,
    email,
    role,
    token_hash: tokenHash,
    invited_by: context.user.id,
  })
  if (error) return NextResponse.json({ error: 'Could not create invitation' }, { status: 400 })
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin}/invite/${token}`
  const apiKey = process.env.RESEND_API_KEY
  let emailed = false
  if (apiKey) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || 'Presence <presence@notify.akhyar.dev>', to: email, subject: `Invitation to ${context.organization.name}`, html: `<p>You were invited as ${role}.</p><p><a href="${inviteUrl}">Accept invitation</a></p>` }),
    })
    emailed = response.ok
  }
  return NextResponse.json({ invite_url: inviteUrl, emailed }, { status: 201 })
}
