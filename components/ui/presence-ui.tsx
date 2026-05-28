import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ScanFace } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'cyan' | 'emerald' | 'amber' | 'rose' | 'zinc'

const toneMap: Record<
  Tone,
  {
    icon: string
    iconBg: string
    badge: string
    line: string
    progress: string
  }
> = {
  cyan: {
    icon: 'text-cyan-700',
    iconBg: 'bg-cyan-50 ring-cyan-100',
    badge: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    line: 'bg-cyan-600',
    progress: 'bg-cyan-600',
  },
  emerald: {
    icon: 'text-emerald-700',
    iconBg: 'bg-emerald-50 ring-emerald-100',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    line: 'bg-emerald-500',
    progress: 'bg-emerald-500',
  },
  amber: {
    icon: 'text-amber-700',
    iconBg: 'bg-amber-50 ring-amber-100',
    badge: 'border-amber-200 bg-amber-50 text-amber-800',
    line: 'bg-amber-500',
    progress: 'bg-amber-500',
  },
  rose: {
    icon: 'text-rose-700',
    iconBg: 'bg-rose-50 ring-rose-100',
    badge: 'border-rose-200 bg-rose-50 text-rose-800',
    line: 'bg-rose-500',
    progress: 'bg-rose-500',
  },
  zinc: {
    icon: 'text-zinc-700',
    iconBg: 'bg-zinc-100 ring-zinc-200',
    badge: 'border-zinc-200 bg-zinc-50 text-zinc-700',
    line: 'bg-zinc-500',
    progress: 'bg-zinc-500',
  },
}

export function BrandMark({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cyan-200 bg-white text-cyan-700 shadow-[0_10px_30px_rgba(14,116,144,0.12)]">
        <ScanFace size={18} />
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight text-zinc-950">Presence</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Identity Ops
          </p>
        </div>
      )}
    </div>
  )
}

export function StatusBadge({
  children,
  tone = 'cyan',
  className,
}: Readonly<{ children: React.ReactNode; tone?: Tone; className?: string }>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold',
        toneMap[tone].badge,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', toneMap[tone].line)} />
      {children}
    </span>
  )
}

export function Surface({
  children,
  className,
  hover = false,
}: Readonly<{ children: React.ReactNode; className?: string; hover?: boolean }>) {
  return (
    <div
      className={cn(
        'spotlight-card w-full min-w-0 rounded-lg border border-zinc-200/80 bg-white/90 shadow-[0_18px_70px_rgba(15,23,42,0.06)]',
        hover && 'transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_22px_80px_rgba(14,116,144,0.10)]',
        className
      )}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: Readonly<{
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
}>) {
  return (
    <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-700">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 md:text-3xl">{title}</h1>
        {description && <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'cyan',
  helper,
  progress,
}: Readonly<{
  label: string
  value: React.ReactNode
  icon: LucideIcon
  tone?: Tone
  helper?: string
  progress?: number
}>) {
  const safeProgress = Math.max(0, Math.min(100, progress ?? 0))

  return (
    <Surface className="p-4" hover>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-950">{value}</p>
        </div>
        <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1', toneMap[tone].iconBg)}>
          <Icon size={18} className={toneMap[tone].icon} />
        </div>
      </div>
      {helper && <p className="mt-3 text-sm text-zinc-500">{helper}</p>}
      {progress !== undefined && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div className={cn('h-full rounded-full', toneMap[tone].progress)} style={{ width: `${safeProgress}%` }} />
        </div>
      )}
    </Surface>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: Readonly<{
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}>) {
  return (
    <Surface className="grid min-h-64 place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200">
          <Icon size={22} />
        </div>
        <h2 className="mt-4 text-base font-semibold text-zinc-950">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </Surface>
  )
}

export function PrimaryLink({
  href,
  children,
  className,
  target,
}: Readonly<{
  href: string
  children: React.ReactNode
  className?: string
  target?: string
}>) {
  return (
    <Link
      href={href}
      target={target}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 focus:ring-offset-white',
        className
      )}
    >
      {children}
    </Link>
  )
}

export function SecondaryLink({
  href,
  children,
  className,
  target,
}: Readonly<{
  href: string
  children: React.ReactNode
  className?: string
  target?: string
}>) {
  return (
    <Link
      href={href}
      target={target}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition duration-200 hover:border-cyan-200 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 focus:ring-offset-white',
        className
      )}
    >
      {children}
    </Link>
  )
}
