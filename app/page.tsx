import type { Metadata } from 'next'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Fingerprint,
  Gauge,
  LockKeyhole,
  Radio,
  ScanFace,
  ShieldCheck,
  Timer,
  UserCog,
  Users,
} from 'lucide-react'
import {
  BrandMark,
  PrimaryLink,
  SecondaryLink,
  SectionHeader,
  StatTile,
  StatusPill,
  Surface,
} from '@/components/ui/presence-ui'

export const metadata: Metadata = {
  title: 'Workforce Attendance, Verified',
  description:
    'Presence is a workforce attendance platform with face verification, head-movement liveness, shift planning, realtime monitoring, and reports.',
}

const featureItems = [
  {
    title: 'Face verification',
    description: 'Browser camera capture creates an identity signal for enrolled members.',
    icon: ScanFace,
  },
  {
    title: 'Head-movement liveness',
    description: 'The kiosk asks for a small head turn and return before check-in is accepted.',
    icon: Fingerprint,
  },
  {
    title: 'Shift scheduling',
    description: 'Admins can define reusable shift rules and assign members by work date.',
    icon: CalendarClock,
  },
  {
    title: 'Attendance classification',
    description: 'Server-side check-in can classify on time, late, very late, or no shift.',
    icon: Timer,
  },
  {
    title: 'Realtime dashboard',
    description: 'The dashboard includes a live attendance stream scoped to the workspace.',
    icon: Radio,
  },
  {
    title: 'PDF reports',
    description: 'Monthly summaries can be generated and downloaded from the reports module.',
    icon: FileText,
  },
  {
    title: 'Secure server matching',
    description: 'Kiosk matching uses server routes and RPCs instead of broad descriptor reads.',
    icon: ShieldCheck,
  },
]

const roleItems = [
  {
    title: 'Owner',
    description: 'Creates the first workspace account in the current MVP onboarding flow.',
    icon: LockKeyhole,
  },
  {
    title: 'Admin / HR',
    description: 'Manages members, enrollment, shifts, schedules, logs, and monthly reports.',
    icon: UserCog,
  },
  {
    title: 'Member / Employee',
    description: 'Checks in from the public kiosk. No member login is required today.',
    icon: Users,
  },
]

const workflowItems = [
  'Admin enrolls the member profile and face descriptor.',
  'Member opens the public attendance kiosk.',
  'The kiosk verifies liveness, matches identity, and records check-in.',
  'Dashboard, logs, schedules, and reports give HR operational visibility.',
]

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/88 backdrop-blur-xl">
        <nav
          aria-label="Primary navigation"
          className="mx-auto flex h-16 w-[calc(100vw-2rem)] max-w-7xl items-center justify-between gap-4 sm:w-full sm:px-6"
        >
          <BrandMark />
          <div className="hidden items-center gap-2 md:flex">
            <SecondaryLink href="/attendance" className="px-3 py-2">
              Attendance Kiosk
            </SecondaryLink>
            <SecondaryLink href="/login" className="px-3 py-2">
              Login
            </SecondaryLink>
            <PrimaryLink href="/register" className="px-3 py-2">
              Create Organization
            </PrimaryLink>
          </div>
          <PrimaryLink href="/attendance" className="px-3 py-2 md:hidden">
            Kiosk
          </PrimaryLink>
        </nav>
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden border-b border-zinc-200/80">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(14,116,144,0.12),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.74),rgba(246,248,247,0.96))]" />
          <div className="mx-auto grid w-[calc(100vw-2rem)] max-w-7xl gap-10 py-12 sm:w-full sm:px-6 lg:py-16">
            <div className="max-w-4xl">
              <StatusPill tone="cyan" icon={ShieldCheck}>
                Identity-first attendance operations
              </StatusPill>
              <h1 className="mt-6 max-w-5xl text-4xl font-bold tracking-tight text-zinc-950 md:text-6xl">
                Presence {'\u2014'} Workforce Attendance, Verified.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 md:text-lg">
                A modern attendance platform for teams that need kiosk check-ins, biometric
                verification, schedule planning, live visibility, and clean reporting without making
                employees manage accounts.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <PrimaryLink href="/attendance" className="min-h-11 px-5">
                  Start Attendance Kiosk
                  <ArrowRight size={16} />
                </PrimaryLink>
                <SecondaryLink href="/login" className="min-h-11 px-5">
                  Workspace Login
                </SecondaryLink>
                <SecondaryLink href="/register" className="min-h-11 px-5">
                  Create Organization
                </SecondaryLink>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <Surface className="reveal-up overflow-hidden p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
                      Live operations
                    </p>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-zinc-950">
                      Today&apos;s attendance posture
                    </h2>
                  </div>
                  <StatusPill tone="emerald">Realtime stream ready</StatusPill>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <StatTile label="Verified" value="38" description="Recorded check-ins" icon={CheckCircle2} tone="emerald" />
                  <StatTile label="Open" value="7" description="Awaiting arrival" icon={Gauge} tone="amber" />
                  <StatTile label="Late" value="3" description="Needs review" icon={Timer} tone="rose" />
                </div>
                <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-zinc-900">Arrival feed</span>
                    <span className="text-xs font-semibold text-zinc-500">Kiosk station</span>
                  </div>
                  <div className="grid gap-2">
                    {['Face verified', 'Liveness passed', 'Shift classified'].map((item) => (
                      <div key={item} className="flex items-center justify-between rounded-md bg-white px-3 py-2 ring-1 ring-zinc-200/80">
                        <span className="text-sm font-medium text-zinc-700">{item}</span>
                        <CheckCircle2 size={15} className="text-emerald-600" />
                      </div>
                    ))}
                  </div>
                </div>
              </Surface>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                <StatTile label="Current route" value="/attendance" description="Public kiosk without member login" icon={ScanFace} />
                <StatTile label="Admin scope" value="Workspace" description="Protected dashboard routes" icon={LockKeyhole} tone="zinc" />
                <StatTile label="Reports" value="PDF" description="Downloadable monthly summaries" icon={FileText} tone="amber" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-[calc(100vw-2rem)] max-w-7xl py-14 sm:w-full sm:px-6" aria-labelledby="problem-heading">
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <SectionHeader
              eyebrow="Problem / Solution"
              titleId="problem-heading"
              title="Manual attendance leaves HR with blind spots."
              description="Presence replaces loose sign-in workflows with a public kiosk, verified identity, duplicate-safe check-ins, and an admin workspace that stays close to daily operations."
              className="reveal-up"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Surface className="reveal-up p-5">
                <p className="text-sm font-semibold text-zinc-950">Before</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Spreadsheet attendance, unverifiable arrivals, late visibility, and reports that
                  require manual cleanup.
                </p>
              </Surface>
              <Surface className="reveal-up p-5">
                <p className="text-sm font-semibold text-zinc-950">With Presence</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Verified kiosk check-ins, liveness gating, shift planning, status-aware logs, and
                  downloadable summaries in one workspace.
                </p>
              </Surface>
            </div>
          </div>
        </section>

        <section className="border-y border-zinc-200/80 bg-white/60 py-14" aria-labelledby="workflow-heading">
          <div className="mx-auto w-[calc(100vw-2rem)] max-w-7xl sm:w-full sm:px-6">
            <SectionHeader
              eyebrow="How it works"
              titleId="workflow-heading"
              title="A clean path from enrollment to attendance evidence."
              description="The current MVP keeps members out of account management while giving admins the tools to enroll, schedule, monitor, and report."
              className="mb-8 reveal-up"
            />
            <ol className="grid gap-4 md:grid-cols-4">
              {workflowItems.map((item, index) => (
                <li key={item} className="reveal-up rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_14px_42px_rgba(15,23,42,0.04)]">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-50 text-sm font-bold text-cyan-800 ring-1 ring-cyan-100">
                    {index + 1}
                  </span>
                  <p className="mt-4 text-sm font-semibold leading-6 text-zinc-800">{item}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto w-[calc(100vw-2rem)] max-w-7xl py-14 sm:w-full sm:px-6" aria-labelledby="features-heading">
          <SectionHeader
            eyebrow="Core features"
            titleId="features-heading"
            title="Built for real attendance operations, not camera demos."
            description="These surfaces exist in the product today, with the database and security roadmap documented separately for future hardening."
            className="mb-8 reveal-up"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureItems.map(({ title, description, icon: Icon }) => (
              <Surface key={title} className="reveal-up p-5" hover>
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                  <Icon size={18} />
                </div>
                <h3 className="mt-4 text-base font-bold text-zinc-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
              </Surface>
            ))}
          </div>
        </section>

        <section className="border-y border-zinc-200/80 bg-zinc-950 py-14 text-white" aria-labelledby="roles-heading">
          <div className="mx-auto w-[calc(100vw-2rem)] max-w-7xl sm:w-full sm:px-6">
            <div className="mb-8 max-w-3xl">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Roles</p>
              <h2 id="roles-heading" className="text-2xl font-bold tracking-tight md:text-3xl">
                Clear responsibilities for every attendance workflow.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {roleItems.map(({ title, description, icon: Icon }) => (
                <div key={title} className="reveal-up rounded-lg border border-white/10 bg-white/[0.045] p-5">
                  <Icon size={20} className="text-cyan-200" />
                  <h3 className="mt-4 text-base font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-[calc(100vw-2rem)] max-w-7xl py-14 sm:w-full sm:px-6" aria-labelledby="trust-heading">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <SectionHeader
              eyebrow="Security / Trust"
              titleId="trust-heading"
              title="Designed around biometric caution."
              description="Presence separates current behavior from proposed work in its documentation, keeps sensitive matching behind server paths, and preserves compatibility while security hardening continues."
              className="reveal-up"
            />
            <Surface className="reveal-up p-5">
              <div className="grid gap-3">
                {[
                  'Browser clients use the Supabase anon key, not service-role secrets.',
                  'Kiosk check-in is duplicate-safe for the work date.',
                  'Server routes validate check-in and matching requests.',
                  'Legacy members.face_descriptor remains for compatibility and must not be removed in this phase.',
                ].map((item) => (
                  <div key={item} className="flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
                    <ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-700" />
                    <p className="text-sm leading-6 text-zinc-700">{item}</p>
                  </div>
                ))}
              </div>
            </Surface>
          </div>
        </section>

        <section className="mx-auto w-[calc(100vw-2rem)] max-w-7xl pb-16 sm:w-full sm:px-6">
          <Surface className="reveal-up overflow-hidden p-6 md:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <StatusPill tone="cyan" icon={ClipboardList}>Ready for attendance day</StatusPill>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-950 md:text-3xl">
                  Open the kiosk, or sign into the workspace to manage operations.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                  Employees check in from the kiosk. Owners and admins use the workspace for roster,
                  shift, schedule, log, and report workflows.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <PrimaryLink href="/attendance">
                  Start Attendance Kiosk
                  <ArrowRight size={16} />
                </PrimaryLink>
                <SecondaryLink href="/login">Workspace Login</SecondaryLink>
                <SecondaryLink href="/register">Create Organization</SecondaryLink>
              </div>
            </div>
          </Surface>
        </section>
      </main>
    </div>
  )
}
