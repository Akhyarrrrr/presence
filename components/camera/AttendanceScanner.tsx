'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle, Loader2, ScanFace } from 'lucide-react'
import { toast } from 'sonner'
import { drawDetections, getAllFaceDetections, loadModels, matchFace } from '@/lib/face-api'
import { createClient } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils'
import type { Member } from '@/types'

interface RecentRecord {
  member: Member
  confidence: number
  time: string
}

export default function AttendanceScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number | null>(null)
  const isRunningRef = useRef(false)
  const lastDetectionTime = useRef(0)

  const [members, setMembers] = useState<Member[]>([])
  const [todayLogs, setTodayLogs] = useState<Set<string>>(new Set())
  const [recentActivity, setRecentActivity] = useState<RecentRecord[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'scanning' | 'error'>('idle')
  const [detectedCount, setDetectedCount] = useState(0)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      const [{ data: membersData }, { data: logsData }] = await Promise.all([
        supabase.from('members').select('*').eq('is_active', true),
        supabase.from('attendance_logs').select('member_id').eq('date', today),
      ])

      if (membersData) setMembers(membersData as Member[])
      if (logsData) setTodayLogs(new Set(logsData.map((log) => log.member_id)))
    }

    loadData()
  }, [])

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
    async (memberId: string, confidence: number, memberName: string) => {
      setTodayLogs((prev) => new Set([...prev, memberId]))

      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      const { error } = await supabase.from('attendance_logs').insert({
        member_id: memberId,
        confidence,
        date: today,
      })

      if (error && error.code !== '23505') {
        console.error(error)
        return
      }

      const member = members.find((item) => item.id === memberId)
      if (member) {
        setRecentActivity((prev) => [
          {
            member,
            confidence,
            time: formatTime(new Date().toISOString()),
          },
          ...prev.slice(0, 9),
        ])
        toast.success(`${memberName} checked in`, { duration: 3000 })
      }
    },
    [members]
  )

  const runDetectionLoop = useCallback(function loop() {
    if (!isRunningRef.current) return

    animFrameRef.current = requestAnimationFrame(async () => {
      const now = Date.now()

      if (now - lastDetectionTime.current > 800 && videoRef.current && canvasRef.current) {
        lastDetectionTime.current = now

        try {
          const detections = await getAllFaceDetections(videoRef.current)
          setDetectedCount(detections.length)

          const displaySize = {
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight,
          }

          const matches = detections.map((detection) => {
            const match = matchFace(detection.descriptor, members)
            return {
              detection: detection.detection,
              label: match ? match.memberName : 'Unknown',
              confidence: match ? match.confidence : 0,
              matched: Boolean(match),
              memberId: match?.memberId,
            }
          })

          drawDetections(canvasRef.current, detections, displaySize, matches)

          for (const match of matches) {
            if (match.matched && match.memberId && !todayLogs.has(match.memberId)) {
              await recordAttendance(match.memberId, match.confidence, match.label)
            }
          }
        } catch {
          // Ignore transient detection errors so the scanner can keep running.
        }
      }

      loop()
    })
  }, [members, recordAttendance, todayLogs])

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
    canvasRef.current
      ?.getContext('2d')
      ?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
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

          {status === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-700 bg-gray-800">
                <ScanFace size={40} className="text-gray-600" />
              </div>
              <div className="text-center">
                <p className="font-medium text-white">Scanner Ready</p>
                <p className="mt-1 text-sm text-gray-500">{members.length} members registered</p>
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 size={40} className="animate-spin text-indigo-400" />
              <p className="text-gray-400">Loading face recognition models...</p>
              <p className="text-sm text-gray-600">This may take a moment on first load</p>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Camera size={28} className="text-red-400" />
              <p className="text-red-400">Camera access failed</p>
              <button
                type="button"
                onClick={startScanning}
                className="cursor-pointer text-sm text-indigo-400 transition hover:text-indigo-300"
              >
                Try again
              </button>
            </div>
          )}

          {status === 'scanning' && (
            <>
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <span className="text-xs font-medium text-white">LIVE</span>
                {detectedCount > 0 && (
                  <span className="text-xs text-emerald-400">
                    {detectedCount} face{detectedCount !== 1 ? 's' : ''} detected
                  </span>
                )}
              </div>
              <div className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
                <span className="text-xs text-white">{todayLogs.size} checked in today</span>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3">
          {(status === 'idle' || status === 'error') && (
            <button
              type="button"
              onClick={startScanning}
              disabled={members.length === 0}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ScanFace size={18} />
              Start Face Scanner
            </button>
          )}

          {status === 'scanning' && (
            <button
              type="button"
              onClick={stopScanning}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-800 py-3 font-medium text-white transition hover:bg-gray-700"
            >
              Stop Scanner
            </button>
          )}
        </div>

        {members.length === 0 && (
          <p className="rounded-xl border border-amber-400/10 bg-amber-400/5 py-3 text-center text-sm text-amber-400">
            No members registered yet.{' '}
            <a href="/members/new" className="underline">
              Register members first
            </a>
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">Recent Check-ins</h2>
        {recentActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ScanFace size={32} className="mb-3 text-gray-700" />
            <p className="text-sm text-gray-600">No activity yet</p>
            <p className="mt-1 text-xs text-gray-700">Check-ins will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((record, i) => (
              <div key={`${record.member.id}-${i}`} className="flex items-center gap-3 rounded-xl bg-gray-800/50 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-400">
                  {record.member.photo_url ? (
                    <img
                      src={record.member.photo_url}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    record.member.name[0].toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{record.member.name}</p>
                  <p className="text-xs text-gray-500">{record.time}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span className="text-xs text-emerald-400">
                    {Math.round(record.confidence * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
