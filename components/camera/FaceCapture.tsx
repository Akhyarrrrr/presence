'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Camera, CheckCircle, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { getFaceDescriptor, loadModels } from '@/lib/face-api'

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
    setStatusMessage('Loading face recognition models...')

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
  }

  async function captureAndDetect() {
    if (!videoRef.current || !canvasRef.current) return

    setStatus('detecting')
    setStatusMessage('Detecting face...')

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
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
        <video
          ref={videoRef}
          className={`h-full w-full object-cover ${
            status === 'idle' || status === 'loading-models' ? 'hidden' : ''
          }`}
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />

        {(status === 'idle' || status === 'loading-models') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-800">
              {status === 'loading-models' ? (
                <Loader2 size={32} className="animate-spin text-indigo-400" />
              ) : (
                <Camera size={32} className="text-gray-600" />
              )}
            </div>
            <p className="px-4 text-center text-sm text-gray-500">{statusMessage}</p>
          </div>
        )}

        {(status === 'ready' || status === 'detecting') && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={`relative h-56 w-48 rounded-full border-2 transition-colors ${
                status === 'detecting' ? 'border-indigo-400' : 'border-gray-600'
              }`}
            >
              {status === 'detecting' && (
                <div className="pulse-ring absolute inset-0 rounded-full border-2 border-indigo-400" />
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
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/10">
            <div className="text-center">
              <CheckCircle size={48} className="mx-auto mb-2 text-emerald-400" />
              <p className="font-medium text-emerald-400">Face Captured</p>
            </div>
          </div>
        )}

        {status === 'detecting' && (
          <div className="scan-line absolute left-0 right-0 h-0.5 bg-indigo-400/60" />
        )}
      </div>

      <div
        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${
          status === 'success'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
            : status === 'error'
              ? 'border-red-500/20 bg-red-500/10 text-red-400'
              : status === 'detecting'
                ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400'
                : 'border-gray-800 bg-gray-900 text-gray-400'
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
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Capture Face
          </button>
        )}

        {status === 'success' && (
          <button
            type="button"
            onClick={reset}
            disabled={isLoading}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-700 px-4 py-2.5 text-sm text-gray-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={14} />
            Retake
          </button>
        )}

        {status === 'error' && (
          <button
            type="button"
            onClick={startCamera}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-800 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}
