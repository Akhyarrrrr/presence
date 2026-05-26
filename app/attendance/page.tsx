import type { Metadata } from 'next'
import Link from 'next/link'
import { ScanFace, ShieldCheck } from 'lucide-react'
import AttendanceScanner from '@/components/camera/AttendanceScanner'

export const metadata: Metadata = {
  title: 'Attendance Scanner',
  description: 'Face recognition attendance check-in',
}

export default function AttendancePage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="sticky top-0 z-10 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/20">
              <ScanFace size={16} className="text-indigo-400" />
            </div>
            <span className="font-semibold text-white">Presence</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1.5 text-xs text-emerald-400 sm:flex">
              <ShieldCheck size={13} />
              <span>Face processing stays on your device</span>
            </div>
            <Link href="/login" className="text-sm text-gray-500 transition hover:text-white">
              Admin
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Attendance Check-in</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Look at the camera to check in. Face recognition runs locally, and only the attendance
            result is recorded.
          </p>
        </div>
        <AttendanceScanner />
      </main>
    </div>
  )
}
