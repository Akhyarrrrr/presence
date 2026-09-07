import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPublicKioskEnabled } from '@/lib/public-kiosk'

const actions = new Set(['check_in', 'check_out', 'break_start', 'break_end'])

export async function POST(request: Request) {
  if (!isPublicKioskEnabled()) return NextResponse.json({ error: 'Public kiosk is disabled' }, { status: 403 })
  const body = await request.json().catch(() => null) as { organization?: unknown; badge?: unknown; pin?: unknown; action?: unknown } | null
  const organization = typeof body?.organization === 'string' ? body.organization.trim() : ''
  const badge = typeof body?.badge === 'string' ? body.badge.trim() : ''
  const pin = typeof body?.pin === 'string' ? body.pin : ''
  const action = typeof body?.action === 'string' ? body.action : ''
  if (!organization || badge.length < 3 || pin.length < 4 || !actions.has(action)) return NextResponse.json({ error: 'Organization, badge, PIN, and action are required' }, { status: 400 })
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('secure_fallback_attendance', { organization_slug: organization, badge, pin, requested_action: action })
  if (error) return NextResponse.json({ error: 'Badge, PIN, or attendance state is invalid' }, { status: 400 })
  return NextResponse.json({ ok: true, result: data }, { status: 200 })
}
