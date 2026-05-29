import type { Metadata } from 'next'
import { ArrowRight, Clock3, ShieldCheck, Sparkles, Users } from 'lucide-react'
import AttendanceScanner from '@/components/camera/AttendanceScanner'
import { BrandMark, SecondaryLink, StatusBadge, Surface } from '@/components/ui/presence-ui'

export const metadata: Metadata = {
  title: 'Attendance Scanner',
  description: 'Face recognition attendance check-in',
}

export default function AttendancePage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <nav className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/86 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-[calc(100vw-2rem)] max-w-7xl items-center justify-between gap-3 sm:w-full sm:px-6">
          <BrandMark />
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:block">
              <StatusBadge tone="emerald">Server-verified matching</StatusBadge>
            </div>
            <SecondaryLink href="/login" className="px-3 py-2">
              Admin
              <ArrowRight size={14} />
            </SecondaryLink>
          </div>
        </div>
      </nav>

      <main id="main-content" className="mx-auto w-full max-w-7xl px-0 py-8 sm:px-6 lg:py-10">
        <div className="mx-auto mb-8 grid w-[calc(100vw-2rem)] min-w-0 gap-5 sm:w-full lg:grid-cols-[1fr_420px] lg:items-end">
          <div className="min-w-0">
            <p className="mb-3 inline-flex items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-cyan-800">
              <Sparkles size={13} />
              Kiosk mode
            </p>
            <p className="mb-2 text-sm font-semibold text-cyan-900">Employee check-in station. No login required.</p>
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-zinc-950 md:text-5xl">
              Fast, calm, and auditable attendance check-in.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600 md:text-base">
              Presence verifies a live person, confirms identity securely, and records only
              today&apos;s attendance result.
            </p>
          </div>

          <Surface className="grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-1">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-950">Privacy first</p>
                <p className="text-xs text-zinc-500">Identity verification is secured end to end.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                <Clock3 size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-950">One scan per day</p>
                <p className="text-xs text-zinc-500">Duplicate entries are blocked.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                <Users size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-950">Live roster</p>
                <p className="text-xs text-zinc-500">Active members only.</p>
              </div>
            </div>
          </Surface>
        </div>

        <AttendanceScanner />
      </main>
    </div>
  )
}
