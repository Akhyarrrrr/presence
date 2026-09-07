import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPublicKioskEnabled } from '@/lib/public-kiosk'

type RosterRow = {
  id: string
  organization_id: string | null
  name: string
  employee_id: string
  photo_url: string | null
}

type CheckedInRow = {
  member_id: string
}

export async function GET(request: Request) {
  if (!isPublicKioskEnabled()) {
    return NextResponse.json(
      { error: 'Public kiosk is disabled in this portfolio deployment' },
      { status: 403 }
    )
  }

  const supabase = await createClient()
  const organization = new URL(request.url).searchParams.get('organization')?.trim()
  if (!organization) return NextResponse.json({ error: 'Organization code is required' }, { status: 400 })

  const [{ data: members, error: membersError }, { data: checkedIn, error: checkedInError }] =
    await Promise.all([
      supabase.rpc('kiosk_active_members_scoped', { organization_slug: organization }),
      supabase.rpc('kiosk_today_attendance_scoped', { organization_slug: organization }),
    ])

  if (membersError || checkedInError) {
    return NextResponse.json({ error: 'Kiosk bootstrap unavailable' }, { status: 503 })
  }

  return NextResponse.json({
    members: (members ?? []) as RosterRow[],
    checked_in_member_ids: ((checkedIn ?? []) as CheckedInRow[]).map((row) => row.member_id),
  })
}
