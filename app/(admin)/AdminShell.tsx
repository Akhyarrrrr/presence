'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2,
  ChevronRight,
  ClipboardList,
  CalendarDays,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  FileText,
  ScanFace,
  Timer,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { BrandMark, StatusPill } from '@/components/ui/presence-ui'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', helper: 'Live overview', icon: LayoutDashboard, exact: true },
  { href: '/members', label: 'Members', helper: 'Identity roster', icon: Users },
  { href: '/dashboard/shifts', label: 'Shifts', helper: 'Work rules', icon: Timer },
  { href: '/dashboard/schedules', label: 'Schedules', helper: 'Daily planning', icon: CalendarDays },
  { href: '/dashboard/reports', label: 'Reports', helper: 'Monthly export', icon: FileText },
  { href: '/logs', label: 'Attendance Logs', helper: 'Audit trail', icon: ClipboardList },
]

export default function AdminShell({
  children,
  user,
}: Readonly<{ children: React.ReactNode; user: User }>) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  const activeItem = navItems.find((item) => isActive(item.href, item.exact)) ?? navItems[0]
  const ActiveIcon = activeItem.icon
  const userLabel = user.email?.split('@')[0] || 'Admin'

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200/80 px-5 py-5">
        <BrandMark />
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 md:hidden"
        >
          <X size={16} />
        </button>
      </div>

      <div className="px-4 pt-4">
        <div className="rounded-lg border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white px-3 py-3 shadow-[0_16px_50px_rgba(14,116,144,0.08)]">
          <div className="flex items-center justify-between gap-2">
            <StatusPill tone="emerald">Secure session</StatusPill>
            <ScanFace size={15} className="text-cyan-700" />
          </div>
          <p className="mt-3 truncate text-sm font-semibold text-zinc-950">{userLabel}</p>
          <p className="mt-0.5 truncate text-xs font-medium text-zinc-600">{user.email}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5" aria-label="Admin navigation">
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
          Operations
        </p>
        <div className="flex flex-col gap-1.5">
          {navItems.map(({ href, label, helper, icon: Icon, exact }) => {
            const active = isActive(href, exact)

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2',
                  active
                    ? 'bg-zinc-950 text-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                )}
              >
                <span
                  className={cn(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-md transition',
                    active
                      ? 'bg-white/10 text-cyan-100'
                      : 'bg-white text-zinc-500 ring-1 ring-zinc-200 group-hover:text-cyan-700'
                  )}
                >
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{label}</span>
                  <span className={cn('block truncate text-[11px] font-medium', active ? 'text-zinc-300' : 'text-zinc-400')}>
                    {helper}
                  </span>
                </span>
                {active && <ChevronRight size={14} className="shrink-0 text-cyan-100" />}
              </Link>
            )
          })}
        </div>

        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
            <Building2 size={13} />
            Workspace
          </div>
          <p className="mt-2 text-sm font-semibold text-zinc-950">Admin command center</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Manage identities, shifts, attendance, and reports from one surface.
          </p>
        </div>

        <Link
          href="/attendance"
          target="_blank"
          className="mt-3 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-700 shadow-[0_12px_36px_rgba(15,23,42,0.04)] transition duration-200 hover:border-cyan-200 hover:text-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
            <ExternalLink size={16} />
          </span>
          <span>
            <span className="block">Kiosk Scanner</span>
            <span className="block text-[11px] font-medium text-zinc-400">Open station</span>
          </span>
        </Link>
      </nav>

      <div className="border-t border-zinc-200 p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-zinc-600 transition duration-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(8,145,178,0.08),transparent_34rem),linear-gradient(180deg,#fafafa,#f4f4f5)]">
      <aside className="fixed hidden h-full w-72 shrink-0 flex-col border-r border-zinc-200/80 bg-white/92 backdrop-blur-xl md:flex">
        {sidebar}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 cursor-pointer bg-zinc-950/35 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 border-r border-zinc-200 bg-white">{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 md:ml-72">
        <div className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-zinc-200 bg-white/88 px-4 backdrop-blur-xl md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="cursor-pointer rounded-md p-2 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
          >
            <Menu size={18} />
          </button>
          <ScanFace size={18} className="text-cyan-700" />
          <span className="min-w-0 truncate text-sm font-bold text-zinc-950">Presence Command</span>
        </div>

        <header className="sticky top-0 z-10 hidden h-16 items-center justify-between border-b border-zinc-200/80 bg-white/78 px-8 backdrop-blur-xl md:flex lg:px-10">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-zinc-950 text-cyan-100">
              <ActiveIcon size={17} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                Current workspace
              </p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-950">
                {activeItem.label}
                <span className="ml-2 font-medium text-zinc-400">{activeItem.helper}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill tone="cyan">Admin command</StatusPill>
            <Link
              href="/attendance"
              target="_blank"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-cyan-200 hover:text-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
            >
              Kiosk
              <ExternalLink size={14} />
            </Link>
          </div>
        </header>

        <main id="main-content" className="mx-auto max-w-7xl p-4 md:p-8 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  )
}
