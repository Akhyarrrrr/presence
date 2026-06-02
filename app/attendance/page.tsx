import type { Metadata } from 'next'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Info,
  Eye,
  Fingerprint,
  Home,
  RotateCcw,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import AttendanceScanner from '@/components/camera/AttendanceScanner'
import {
  BrandMark,
  SecondaryLink,
  StatusPill,
  Surface,
} from '@/components/ui/presence-ui'
import { MotionPage } from '@/components/ui/motion'

export const metadata: Metadata = {
  title: 'Attendance Scanner',
  description: 'Face recognition attendance check-in',
}

const checkInSteps = [
  {
    title: 'Stable face',
    description: 'Face the camera and hold still for a moment.',
    icon: Eye,
  },
  {
    title: 'Slight head turn',
    description: 'Move your head a little left or right.',
    icon: RotateCcw,
  },
  {
    title: 'Return center',
    description: 'Look straight again to complete liveness.',
    icon: UserRoundCheck,
  },
  {
    title: 'Verified check-in',
    description: 'Presence records attendance after identity is matched.',
    icon: CheckCircle2,
  },
]

const quickTips = [
  'Keep your face centered and avoid strong backlighting.',
  'Remove masks or accessories that cover your face during verification.',
  'Move your head slowly; exaggerated movement is not needed.',
  'Wait for the success notification before leaving the kiosk.',
]

export default function AttendancePage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <nav className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-[calc(100vw-2rem)] max-w-7xl items-center justify-between gap-3 sm:w-full sm:px-6">
          <BrandMark />
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden md:block">
              <StatusPill tone="emerald" icon={ShieldCheck}>
                Server-verified matching
              </StatusPill>
            </div>
            <SecondaryLink href="/" className="hidden px-3 py-2 sm:inline-flex">
              <Home size={14} />
              Home
            </SecondaryLink>
            <SecondaryLink href="/login" className="px-3 py-2">
              Admin
              <ArrowRight size={14} />
            </SecondaryLink>
          </div>
        </div>
      </nav>

      <main id="main-content" className="mx-auto w-full max-w-7xl px-0 py-7 sm:px-6 lg:py-10">
        <MotionPage>
        <section className="reveal-stagger mx-auto mb-7 grid w-[calc(100vw-2rem)] min-w-0 gap-5 sm:w-full lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div className="reveal-left min-w-0">
            <StatusPill tone="cyan" icon={Fingerprint}>
              Kiosk mode
            </StatusPill>
            <p className="mt-4 text-sm font-semibold text-cyan-900">
              Employee check-in station. No login required.
            </p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold tracking-tight text-zinc-950 md:text-6xl">
              Stand in frame. Prove liveness. Check in with confidence.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600 md:text-base">
              Presence verifies a live person, matches the enrolled identity through the server, and
              records today&apos;s attendance result once the check-in is accepted.
            </p>
          </div>

          <Surface className="p-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-950">Privacy-aware kiosk</p>
                  <p className="text-xs leading-5 text-zinc-500">
                    Employees check in without workspace accounts.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                  <Clock3 size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-950">Duplicate-safe day</p>
                  <p className="text-xs leading-5 text-zinc-500">
                    One accepted check-in per member for the work date.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                  <Users size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-950">Active roster only</p>
                  <p className="text-xs leading-5 text-zinc-500">
                    The kiosk works from enrolled active identity profiles.
                  </p>
                </div>
              </div>
            </div>
          </Surface>
        </section>

        <section
          aria-labelledby="check-in-flow-heading"
          className="reveal-stagger mx-auto mb-6 grid w-[calc(100vw-2rem)] gap-3 sm:w-full md:grid-cols-4"
        >
          <h2 id="check-in-flow-heading" className="sr-only">
            Check-in flow
          </h2>
          {checkInSteps.map(({ title, description, icon: Icon }, index) => (
            <div
              key={title}
              className="reveal-scale rounded-lg border border-zinc-200 bg-white/86 p-4 shadow-[0_12px_42px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                  <Icon size={16} />
                </div>
                <span className="font-mono text-xs font-bold text-zinc-400">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <p className="mt-4 text-sm font-semibold text-zinc-950">{title}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
            </div>
          ))}
        </section>

        <section
          aria-labelledby="kiosk-guidance-heading"
          className="reveal-stagger mx-auto mb-6 grid w-[calc(100vw-2rem)] gap-4 sm:w-full lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        >
          <div className="reveal-left rounded-lg border border-zinc-200 bg-white/88 p-5 shadow-[0_14px_42px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex items-center gap-2">
              <Info size={16} className="text-cyan-700" />
              <h2 id="kiosk-guidance-heading" className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-700">
                How to use the kiosk
              </h2>
            </div>
            <ol className="grid gap-2 text-sm leading-6 text-zinc-600">
              <li>1. Stand about one arm&apos;s length from the camera.</li>
              <li>2. Keep your face visible, then follow the on-screen head movement instructions.</li>
              <li>3. Wait for the success status before entering the work area.</li>
            </ol>
          </div>
          <div className="reveal-right rounded-lg border border-zinc-200 bg-zinc-50/80 p-5">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-700">Quick verification tips</p>
            <ul className="reveal-stagger mt-3 grid gap-2 text-sm leading-6 text-zinc-600">
              {quickTips.map((tip) => (
                <li key={tip} className="reveal-up flex gap-2">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <AttendanceScanner />
        </MotionPage>
      </main>
    </div>
  )
}
