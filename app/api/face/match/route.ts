import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPublicKioskEnabled } from '@/lib/public-kiosk'
const DESCRIPTOR_LENGTH = 128
const DEFAULT_MATCH_THRESHOLD = 0.55

type MatchRequestBody = {
  descriptor?: unknown
  threshold?: unknown
  organization?: unknown
}

type MatchRpcRow = {
  member_id: string
  organization_id: string | null
  member_name: string
  employee_id: string
  photo_url: string | null
  distance: number
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function parseDescriptor(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== DESCRIPTOR_LENGTH) return null
  if (!value.every(isFiniteNumber)) return null
  return value
}

function parseThreshold(value: unknown): number {
  if (!isFiniteNumber(value)) return DEFAULT_MATCH_THRESHOLD
  return value
}

export async function POST(request: Request) {
  if (!isPublicKioskEnabled()) {
    return NextResponse.json(
      { error: 'Public kiosk is disabled in this portfolio deployment' },
      { status: 403 }
    )
  }

  let body: MatchRequestBody

  try {
    body = (await request.json()) as MatchRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const descriptor = parseDescriptor(body.descriptor)
  if (!descriptor) {
    return NextResponse.json(
      { error: `descriptor must be an array of ${DESCRIPTOR_LENGTH} finite numbers` },
      { status: 400 }
    )
  }

  const threshold = parseThreshold(body.threshold)
  const organization = typeof body.organization === 'string' ? body.organization.trim() : ''
  if (!organization) return NextResponse.json({ error: 'organization is required' }, { status: 400 })
  const supabase = await createClient()

  const { data: matchRows, error: matchError } = await supabase.rpc('secure_match_member_by_face_scoped', {
    query_embedding: descriptor,
    match_threshold: threshold,
    organization_slug: organization,
  })

  if (matchError) {
    console.error('Face match RPC failed:', matchError)
    return NextResponse.json({ error: 'Face match is unavailable' }, { status: 503 })
  }

  const match = (matchRows as MatchRpcRow[] | null)?.[0]
  if (!match) {
    return NextResponse.json({ matched: false, member: null, distance: null }, { status: 200 })
  }

  return NextResponse.json(
    {
      matched: true,
      member: {
        id: match.member_id,
        organization_id: match.organization_id,
        name: match.member_name,
        employee_id: match.employee_id,
        photo_url: match.photo_url,
      },
      distance: match.distance,
    },
    { status: 200 }
  )
}
