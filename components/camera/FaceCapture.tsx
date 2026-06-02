'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Camera, CheckCircle, Loader2, RefreshCw, ScanFace, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { getFaceDescriptor, loadModels } from '@/lib/face-api'
import { StatusBadge, Surface } from '@/components/ui/presence-ui'

interface FaceCaptureProps {
  onCapture: (descriptor: number[], photoDataUrl: string) => void
  isLoading?: boolean
}

type CaptureStatus = 'idle' | 'loading-models' | 'ready' | 'detecting' | 'success' | 'error'

export default function FaceCapture({ onCapture, isLoading }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<CaptureStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('Click "Start Camera" to begin')
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  async function startCamera() {
    setStatus('loading-models')
    setStatusMessage('Loading face recognition models…')

    try {
      await loadModels()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setStatus('ready')
      setStatusMessage('Position your face in the frame, then click Capture')
    } catch {
      setStatus('error')
      setStatusMessage('Camera access denied or models failed to load')
      toast.error('Failed to access camera')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  async function captureAndDetect() {
    if (!videoRef.current || !canvasRef.current) return

    setStatus('detecting')
    setStatusMessage('Detecting face…')

    for (let i = 3; i >= 1; i -= 1) {
      setCountdown(i)
      await new Promise((resolve) => setTimeout(resolve, 700))
    }

    setCountdown(null)

    try {
      const descriptor = await getFaceDescriptor(videoRef.current)

      if (!descriptor) {
        setStatus('ready')
        setStatusMessage('No face detected. Make sure your face is clearly visible.')
        toast.error('No face detected. Try better lighting or move closer.')
        return
      }

      const canvas = canvasRef.current
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8)

      setStatus('success')
      setStatusMessage('Face captured successfully.')
      stopCamera()
      onCapture(Array.from(descriptor), photoDataUrl)
    } catch {
      setStatus('ready')
      setStatusMessage('Detection failed. Please try again.')
      toast.error('Face detection failed')
    }
  }

  function reset() {
    setStatus('idle')
    setStatusMessage('Click "Start Camera" to begin')
    stopCamera()
  }

  return (
    <div className="space-y-4">
      <Surface className="overflow-hidden p-3">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-950 scanner-grid">
          <video
            ref={videoRef}
            className={`h-full w-full object-cover ${
              status === 'idle' || status === 'loading-models' ? 'hidden' : ''
            }`}
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="pointer-events-none absolute inset-0 camera-mask" />

        {(status === 'idle' || status === 'loading-models') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="grid h-20 w-20 place-items-center rounded-lg border border-white/10 bg-white/5 text-cyan-200">
              {status === 'loading-models' ? (
                <Loader2 size={32} className="animate-spin" />
              ) : (
                <Camera size={32} />
              )}
            </div>
            <p className="px-4 text-center text-sm font-medium text-zinc-200">{statusMessage}</p>
          </div>
        )}

        {(status === 'ready' || status === 'detecting') && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={`relative h-56 w-48 rounded-[42%] border-2 transition-colors ${
                status === 'detecting' ? 'border-cyan-300' : 'border-white/50'
              }`}
            >
              {status === 'detecting' && (
                <div className="pulse-ring absolute inset-0 rounded-[42%] border-2 border-cyan-300" />
              )}
            </div>
          </div>
        )}

        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl font-bold text-white drop-shadow-lg">{countdown}</span>
          </div>
        )}

        {status === 'success' && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/15">
            <div className="text-center">
              <CheckCircle size={48} className="mx-auto mb-2 text-emerald-200" />
              <p className="font-semibold text-emerald-100">Face captured</p>
            </div>
          </div>
        )}

        {status === 'detecting' && (
          <div className="scan-line absolute inset-0" />
        )}

          {(status === 'ready' || status === 'detecting') && (
            <div className="absolute left-4 top-4">
              <StatusBadge tone={status === 'detecting' ? 'cyan' : 'emerald'} className="border-white/10 bg-black/45 text-white backdrop-blur">
                {status === 'detecting' ? 'Detecting' : 'Camera ready'}
              </StatusBadge>
            </div>
          )}
        </div>
      </Surface>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
            <ScanFace size={16} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Capture gate</p>
            <p className="text-sm font-semibold text-zinc-900">Single visible face</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <ShieldCheck size={16} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Quality</p>
            <p className="text-sm font-semibold text-zinc-900">Even light, centered face</p>
          </div>
        </div>
      </div>

      <Surface className="p-3">
        <ol className="grid gap-1 text-xs leading-5 text-zinc-600">
          <li>1. Start the camera and keep only one face in the frame.</li>
          <li>2. Hold a steady position until the countdown finishes.</li>
          <li>3. Retake the photo if it is blurry or poorly framed.</li>
        </ol>
      </Surface>

      <div
        role="status"
        aria-live="polite"
        className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${
          status === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : status === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : status === 'detecting'
                ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
                : 'border-zinc-200 bg-white text-zinc-600'
        }`}
      >
        {status === 'detecting' && <Loader2 size={14} className="shrink-0 animate-spin" />}
        {status === 'success' && <CheckCircle size={14} className="shrink-0" />}
        {status === 'error' && <AlertCircle size={14} className="shrink-0" />}
        <span>{statusMessage}</span>
      </div>

      <div className="flex gap-3">
        {status === 'idle' && (
          <button
            type="button"
            onClick={startCamera}
            disabled={isLoading}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-cyan-700 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Camera size={16} />
            Start Camera
          </button>
        )}

        {status === 'ready' && (
          <button
            type="button"
            onClick={captureAndDetect}
            disabled={isLoading}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-cyan-700 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Capture Face
          </button>
        )}

        {status === 'success' && (
          <button
            type="button"
            onClick={reset}
            disabled={isLoading}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-cyan-200 hover:text-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={14} />
            Retake
          </button>
        )}

        {status === 'error' && (
          <button
            type="button"
            onClick={startCamera}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-zinc-950 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}
