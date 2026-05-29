'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle,
  Eye,
  Loader2,
  Radio,
  ScanFace,
  ShieldCheck,
  StopCircle,
  UserCheck,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { drawDetections, getAllFaceDetections, loadModels } from '@/lib/face-api'
import {
  createBlinkLivenessContext,
  updateBlinkLiveness,
  type HeadLivenessContext,
} from '@/lib/liveness'
import { formatTime } from '@/lib/utils'
import type { AttendanceStatus, Member } from '@/types'
import { StatusBadge, Surface } from '@/components/ui/presence-ui'

interface RecentRecord {
  member: Member
  confidence: number
  time: string
  attendanceStatus: AttendanceStatus
}

interface ScannerMember {
  id: string
  organization_id: string | null
  name: string
  employee_id: string
  photo_url: string | null
}

interface ServerFaceMatchResponse {
  matched: boolean
  member: Member | null
  distance: number | null
}

const attendanceStatusLabel: Record<AttendanceStatus, string> = {
  on_time: 'On Time',
  late: 'Late',
  very_late: 'Very Late',
  no_shift: 'No Shift',
}

async function matchFaceOnServer(descriptor: Float32Array) {
  try {
    const response = await fetch('/api/face/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descriptor: Array.from(descriptor) }),
    })

    if (!response.ok) return null

    const data = (await response.json()) as ServerFaceMatchResponse
    if (!data.matched || !data.member || data.distance === null) return null

    const confidence = Math.max(0, Math.min(1, 1 - data.distance))

    return {
      memberId: data.member.id,
      memberName: data.member.name,
      confidence,
      distance: data.distance,
    }
  } catch {
    return null
  }
}

export default function AttendanceScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number | null>(null)
  const isRunningRef = useRef(false)
  const lastDetectionTime = useRef(0)
  const todayLogsRef = useRef<Set<string>>(new Set())
  const checkInInFlightRef = useRef<Set<string>>(new Set())
  const livenessRef = useRef<HeadLivenessContext>(createBlinkLivenessContext())
  const lastLivenessToastAtRef = useRef(0)

  const [members, setMembers] = useState<ScannerMember[]>([])
  const [todayLogs, setTodayLogs] = useState<Set<string>>(new Set())
  const [recentActivity, setRecentActivity] = useState<RecentRecord[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'scanning' | 'error'>('idle')
  const [detectedCount, setDetectedCount] = useState(0)
  const [challengeProgress, setChallengeProgress] = useState(0)
  const [livenessState, setLivenessState] = useState<HeadLivenessContext['state']>('center_calibration')
  const [livenessDebug, setLivenessDebug] = useState<{
    noseOffset: number | null
    baseline: number | null
    turnThreshold: number
    returnThreshold: number
    progress: number
    state: HeadLivenessContext['state']
  } | null>(null)

  const loadBootstrap = useCallback(async () => {
    const response = await fetch('/api/attendance/bootstrap', {
      method: 'GET',
      cache: 'no-store',
    })
    if (!response.ok) return

    const payload = (await response.json()) as {
      members: ScannerMember[]
      checked_in_member_ids: string[]
    }
    if (payload.members) setMembers(payload.members)
    if (payload.checked_in_member_ids) {
      const logs = new Set(payload.checked_in_member_ids)
      todayLogsRef.current = logs
      setTodayLogs(logs)
    }
  }, [])

  useEffect(() => {
    loadBootstrap()
  }, [loadBootstrap])

  useEffect(() => {
    todayLogsRef.current = todayLogs
  }, [todayLogs])

  useEffect(() => {
    const video = videoRef.current

    return () => {
      isRunningRef.current = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (video?.srcObject) {
        ;(video.srcObject as MediaStream).getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const recordAttendance = useCallback(
    async (memberId: string, confidence: number, memberName: string, distance: number | null) => {
      if (livenessRef.current.state !== 'verified') return
      if (todayLogsRef.current.has(memberId)) return
      if (checkInInFlightRef.current.has(memberId)) return

      checkInInFlightRef.current.add(memberId)

      let attendanceStatus: AttendanceStatus = 'no_shift'
      try {
        const response = await fetch('/api/attendance/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            member_id: memberId,
            confidence,
            distance,
            liveness_verified: true,
          }),
        })

        const text = await response.text()
        let payload: {
          error?: string
          status?: AttendanceStatus
          duplicate?: boolean
        }
        try {
          payload = (text ? JSON.parse(text) : {}) as typeof payload
        } catch {
          payload = {}
        }

        if (!response.ok) {
          if (response.status === 409 || payload.duplicate) {
            const duplicateLogs = new Set(todayLogsRef.current)
            duplicateLogs.add(memberId)
            todayLogsRef.current = duplicateLogs
            setTodayLogs(duplicateLogs)
            return
          }
          throw new Error(payload.error || 'Check-in failed')
        }

        attendanceStatus = payload.status ?? 'no_shift'

        const nextLogs = new Set(todayLogsRef.current)
        nextLogs.add(memberId)
        todayLogsRef.current = nextLogs
        setTodayLogs(nextLogs)
      } catch (error) {
        console.error('Attendance check-in failed:', error)
        const rawMessage = error instanceof Error ? error.message.toLowerCase() : ''
        if (rawMessage.includes('already checked in')) {
          toast.error('You have already checked in today.')
        } else if (rawMessage.includes('inactive') || rawMessage.includes('not found')) {
          toast.error('Member is inactive or not available for check-in.')
        } else if (rawMessage.includes('match')) {
          toast.error('Face could not be matched. Please try again.')
        } else {
          toast.error('Check-in could not be completed. Please try again.')
        }
        return
      } finally {
        checkInInFlightRef.current.delete(memberId)
      }

      const member = members.find((item) => item.id === memberId)
      if (member) {
        setRecentActivity((prev) => [
          {
            member: member as Member,
            confidence,
            time: formatTime(new Date().toISOString()),
            attendanceStatus,
          },
          ...prev.slice(0, 9),
        ])
        toast.success(`${memberName} checked in - ${attendanceStatusLabel[attendanceStatus]}`, {
          duration: 3000,
        })
      }

      await loadBootstrap()
    },
    [loadBootstrap, members]
  )

  const runDetectionLoop = useCallback(function loop() {
    if (!isRunningRef.current) return

    animFrameRef.current = requestAnimationFrame(async () => {
      const now = Date.now()
      const detectionIntervalMs =
        livenessRef.current.state === 'verified' ? 800 : 200

      if (now - lastDetectionTime.current > detectionIntervalMs && videoRef.current && canvasRef.current) {
        lastDetectionTime.current = now

        try {
          const detections = await getAllFaceDetections(videoRef.current)
          setDetectedCount(detections.length)
          const primaryLandmarks = detections[0]?.landmarks ?? null
          const primaryBox = detections[0]?.detection?.box ?? null
          const previousLiveness = livenessRef.current
          const nextLiveness = updateBlinkLiveness(previousLiveness, primaryLandmarks, primaryBox)
          livenessRef.current = nextLiveness
          setLivenessDebug({
            noseOffset: nextLiveness.currentOffsetRatio,
            baseline: nextLiveness.centerOffsetBaseline,
            turnThreshold: nextLiveness.effectiveTurnThreshold,
            returnThreshold: nextLiveness.effectiveReturnThreshold,
            progress: nextLiveness.progressStep,
            state: nextLiveness.state,
          })

          if (
            nextLiveness.state !== previousLiveness.state ||
            nextLiveness.progressStep !== previousLiveness.progressStep
          ) {
            setLivenessState(nextLiveness.state)
            setChallengeProgress(nextLiveness.progressStep)
            if (process.env.NODE_ENV !== 'production') {
              console.debug('[liveness]', {
                state: nextLiveness.state,
                progress: nextLiveness.progressStep,
                noseOffset: nextLiveness.currentOffsetRatio,
                baseline: nextLiveness.centerOffsetBaseline,
                turnThreshold: nextLiveness.effectiveTurnThreshold,
                returnThreshold: nextLiveness.effectiveReturnThreshold,
              })
            }
          }

          const displaySize = {
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight,
          }

          const matches = await Promise.all(
            detections.map(async (detection) => {
              const serverMatch = await matchFaceOnServer(detection.descriptor)
              return {
                detection: detection.detection,
                label: serverMatch ? serverMatch.memberName : 'Unknown',
                confidence: serverMatch ? serverMatch.confidence : 0,
                matched: Boolean(serverMatch),
                memberId: serverMatch?.memberId,
                distance: serverMatch?.distance ?? null,
              }
            })
          )

          drawDetections(canvasRef.current, detections, displaySize, matches)

          for (const match of matches) {
            if (match.matched && match.memberId && !todayLogsRef.current.has(match.memberId)) {
              if (livenessRef.current.state !== 'verified') {
                const nowMs = Date.now()
                if (nowMs - lastLivenessToastAtRef.current > 4500) {
                  lastLivenessToastAtRef.current = nowMs
                  toast.warning(
                    'Complete liveness challenge to continue'
                  )
                }
                continue
              }
              await recordAttendance(match.memberId, match.confidence, match.label, match.distance)
            }
          }
        } catch {
          // Ignore transient detection errors so the scanner can keep running.
        }
      }

      loop()
    })
  }, [recordAttendance])

  async function startScanning() {
    setStatus('loading')

    try {
      await loadModels()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      livenessRef.current = createBlinkLivenessContext()
      setChallengeProgress(0)
      setLivenessState('center_calibration')
      setStatus('scanning')
      isRunningRef.current = true
      runDetectionLoop()
    } catch {
      setStatus('error')
      toast.error('Failed to start camera or load models')
    }
  }

  function stopScanning() {
    isRunningRef.current = false

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (videoRef.current?.srcObject) {
      ;(videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }

    setStatus('idle')
    setDetectedCount(0)
    livenessRef.current = createBlinkLivenessContext()
    setChallengeProgress(0)
    setLivenessState('center_calibration')
    setLivenessDebug(null)
    canvasRef.current
      ?.getContext('2d')
      ?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  const attendanceProgress = members.length ? Math.round((todayLogs.size / members.length) * 100) : 0
  const scannerLabel =
    status === 'scanning'
      ? 'Scanning'
      : status === 'loading'
        ? 'Preparing'
        : status === 'error'
          ? 'Attention needed'
          : 'Ready'
  const safeProgress = Math.min(challengeProgress, 3)
  const livenessLabel =
    livenessState === 'verified'
      ? 'Liveness verified. Matching identity...'
      : livenessState === 'failed'
        ? 'Verification timed out'
        : livenessState === 'center_calibration'
          ? 'Look straight at the camera'
        : livenessState === 'move_head'
          ? 'Move your head slightly left or right'
            : livenessState === 'return_center'
              ? 'Look straight again'
            : 'Looking for face'

  return (
    <div className="mx-auto grid w-[calc(100vw-2rem)] min-w-0 grid-cols-1 gap-5 sm:w-full lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
        <Surface className="overflow-hidden p-3">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-950 scanner-grid">
            <video
              ref={videoRef}
              className={`h-full w-full object-cover ${status !== 'scanning' ? 'hidden' : ''}`}
              muted
              playsInline
            />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ display: status === 'scanning' ? 'block' : 'none' }}
            />
            <div className="pointer-events-none absolute inset-0 camera-mask" />

            {status === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-5 text-center">
                <div className="grid h-24 w-24 place-items-center rounded-lg border border-white/10 bg-white/5 text-cyan-200 shadow-[0_20px_80px_rgba(34,211,238,0.12)]">
                  <ScanFace size={42} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">Scanner is ready</p>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-zinc-300 sm:max-w-md">
                    Start the live feed when the entrance desk is active. Registered members will be
                    matched automatically.
                  </p>
                </div>
              </div>
            )}

            {status === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 size={40} className="animate-spin text-cyan-300" />
                <p className="font-medium text-white">Preparing recognition models</p>
                <p className="text-sm text-zinc-400">First load can take a moment.</p>
              </div>
            )}

            {status === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Camera size={30} className="text-rose-300" />
                <p className="font-medium text-rose-100">Camera access failed</p>
                <p className="max-w-sm text-center text-sm text-zinc-400">
                  Check browser permission and make sure another app is not using the camera.
                </p>
                <button
                  type="button"
                  onClick={startScanning}
                  className="cursor-pointer rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                >
                  Try again
                </button>
              </div>
            )}

            {status === 'scanning' && (
              <>
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-white">Live</span>
                  {detectedCount > 0 && (
                    <span className="text-xs font-medium text-emerald-300">
                      {detectedCount} face{detectedCount !== 1 ? 's' : ''} detected
                    </span>
                  )}
                </div>
                <div className="absolute right-4 top-4 rounded-md border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
                  <span className="text-xs font-medium text-white">{todayLogs.size} checked in today</span>
                </div>
                <div className="absolute bottom-4 left-4 right-4 rounded-md border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Eye size={14} className="text-cyan-200" />
                      <span className="text-base font-bold text-white">{livenessLabel}</span>
                    </div>
                    <span className="text-xs font-bold text-cyan-200">
                      {safeProgress === 0 ? '1/3 Face detected' : safeProgress === 1 ? '1/3 Face detected' : safeProgress === 2 ? '2/3 Head movement detected' : '3/3 Verified'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </Surface>

        <div className="flex gap-3">
          {(status === 'idle' || status === 'error') && (
            <button
              type="button"
              onClick={startScanning}
              disabled={members.length === 0}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-cyan-700 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ScanFace size={18} />
              Start Scanner
            </button>
          )}

          {status === 'scanning' && (
            <button
              type="button"
              onClick={stopScanning}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-zinc-950 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:ring-offset-2"
            >
              <StopCircle size={18} />
              Stop Scanner
            </button>
          )}
        </div>

        {members.length === 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-800">
            No members registered yet.{' '}
            <Link href="/members/new" className="underline underline-offset-4">
              Register members first
            </Link>
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Surface className="p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              <Radio size={14} />
              State
            </div>
            <p className="text-lg font-bold text-zinc-950">{scannerLabel}</p>
            <p className="mt-1 text-xs text-zinc-500">Camera and model status</p>
          </Surface>
          <Surface className="p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              <Users size={14} />
              Roster
            </div>
            <p className="text-lg font-bold text-zinc-950">{members.length}</p>
            <p className="mt-1 text-xs text-zinc-500">Active identity profiles</p>
          </Surface>
          <Surface className="p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              <UserCheck size={14} />
              Coverage
            </div>
            <p className="text-lg font-bold text-zinc-950">{attendanceProgress}%</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${attendanceProgress}%` }} />
            </div>
          </Surface>
        </div>

        <Surface className="p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
            <AlertTriangle size={14} />
            Liveness
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-900">{livenessLabel}</p>
            <StatusBadge tone={livenessState === 'verified' ? 'emerald' : livenessState === 'failed' ? 'rose' : 'amber'}>
              {safeProgress}/3
            </StatusBadge>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Attendance is saved only after liveness verification.</p>
          <p className="mt-1 text-xs text-zinc-500">Move your head slightly left or right, then return to center.</p>
          {livenessState === 'failed' && (
            <button
              type="button"
              onClick={() => {
                livenessRef.current = createBlinkLivenessContext()
                setChallengeProgress(0)
                setLivenessState('center_calibration')
              }}
              className="mt-3 cursor-pointer rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-cyan-200 hover:text-cyan-800"
            >
              Retry liveness
            </button>
          )}
          {process.env.NODE_ENV !== 'production' && livenessDebug && (
            <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-[11px] text-zinc-700">
              state: {livenessDebug.state} | progress: {livenessDebug.progress}/3 | offset:{' '}
              {livenessDebug.noseOffset?.toFixed(3) ?? '-'} | baseline:{' '}
              {livenessDebug.baseline?.toFixed(3) ?? '-'} | move:{' '}
              {livenessDebug.turnThreshold.toFixed(3)} | return:{' '}
              {livenessDebug.returnThreshold.toFixed(3)}
            </div>
          )}
        </Surface>
      </div>

      <Surface className="p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
              Verification ledger
            </p>
            <h2 className="mt-2 text-lg font-bold tracking-tight text-zinc-950">Recent Check-ins</h2>
          </div>
          <StatusBadge tone={status === 'scanning' ? 'emerald' : 'zinc'}>
            {status === 'scanning' ? 'Live' : 'Idle'}
          </StatusBadge>
        </div>
        {recentActivity.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/70 p-6 text-center">
            <Activity size={34} className="mb-3 text-zinc-400" />
            <p className="text-sm font-semibold text-zinc-800">No activity yet</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">Verified arrivals will stream here.</p>
            <div className="mt-5 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              <ShieldCheck size={14} />
              Duplicate-safe daily logs
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((record, i) => (
              <div
                key={`${record.member.id}-${i}`}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-cyan-50 text-sm font-bold text-cyan-800 ring-1 ring-cyan-100">
                  {record.member.photo_url ? (
                    <img
                      src={record.member.photo_url}
                      alt={record.member.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    record.member.name[0].toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-950">{record.member.name}</p>
                  <p className="text-xs text-zinc-500">
                    {record.time} - {attendanceStatusLabel[record.attendanceStatus]}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                  <CheckCircle size={14} />
                  <span className="text-xs font-bold">
                    {Math.round(record.confidence * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Surface>
    </div>
  )
}
