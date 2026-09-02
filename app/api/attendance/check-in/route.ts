import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PostgrestError } from '@supabase/supabase-js'
import { isPublicKioskEnabled } from '@/lib/public-kiosk'

type CheckInBody = {
  member_id?: unknown
  confidence?: unknown
  distance?: unknown
  liveness_verified?: unknown
}
type CheckInRpcRow = {
  status: 'on_time' | 'late' | 'very_late' | 'no_shift'
  late_minutes: number
  shift_id: string | null
}

type CheckInRpcPayload = {
  data: unknown
  error: PostgrestError | null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isRpcResolutionError(error: PostgrestError | null) {
  if (!error) return false
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase()
  return (
    error.code === 'PGRST202' ||
    message.includes('could not find the function') ||
    message.includes('function public.secure_attendance_check_in')
  )
}

function formatRpcError(error: PostgrestError) {
  return {
    code: error.code ?? null,
    message: error.message ?? 'Unknown RPC error',
    details: error.details ?? null,
    hint: error.hint ?? null,
  }
}

export async function POST(request: Request) {
  if (!isPublicKioskEnabled()) {
    return NextResponse.json(
      { error: 'Public kiosk is disabled in this portfolio deployment' },
      { status: 403 }
    )
  }

  let body: CheckInBody

  try {
    body = (await request.json()) as CheckInBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.member_id !== 'string' || !isUuid(body.member_id)) {
    return NextResponse.json({ error: 'member_id must be a valid UUID' }, { status: 400 })
  }
  if (!isFiniteNumber(body.confidence) || body.confidence < 0 || body.confidence > 1) {
    return NextResponse.json({ error: 'confidence must be a finite number between 0 and 1' }, { status: 400 })
  }
  if (body.distance !== undefined && body.distance !== null && !isFiniteNumber(body.distance)) {
    return NextResponse.json({ error: 'distance must be a finite number' }, { status: 400 })
  }
  if (body.liveness_verified !== true) {
    return NextResponse.json({ error: 'liveness verification is required' }, { status: 400 })
  }

  const supabase = await createClient()

  let rpcResult: CheckInRpcPayload = await supabase.rpc('secure_attendance_check_in', {
    p_member_id: body.member_id,
    p_confidence: body.confidence,
    p_liveness_verified: true,
  })

  if (isRpcResolutionError(rpcResult.error)) {
    rpcResult = await supabase.rpc('secure_attendance_check_in', {
      member_id: body.member_id,
      confidence: body.confidence,
      liveness_verified: true,
    })
  }

  const { data, error } = rpcResult

  if (error) {
    const message = error.message?.toLowerCase() ?? ''
    if (process.env.NODE_ENV !== 'production') {
      console.error('secure_attendance_check_in RPC failed', formatRpcError(error))
    } else {
      console.error('secure_attendance_check_in RPC failed', {
        code: error.code ?? null,
        message: error.message ?? 'Unknown RPC error',
      })
    }

    if (error.code === '23505' || message.includes('already checked in')) {
      return NextResponse.json({ duplicate: true }, { status: 409 })
    }
    if (message.includes('inactive') || message.includes('not found')) {
      return NextResponse.json({ error: 'Member not found or inactive' }, { status: 404 })
    }
    if (message.includes('liveness')) {
      return NextResponse.json({ error: 'liveness verification is required' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Check-in could not be completed. Please try again.' }, { status: 500 })
  }

  const row = (Array.isArray(data) ? data[0] : data) as CheckInRpcRow | null
  if (!row) {
    return NextResponse.json({ duplicate: true }, { status: 409 })
  }

  return NextResponse.json(
    {
      ok: true,
      status: row.status,
      late_minutes: row.late_minutes,
      shift_id: row.shift_id,
    },
    { status: 201 }
  )
}
