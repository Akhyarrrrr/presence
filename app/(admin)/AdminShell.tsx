'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanFace,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { BrandMark, StatusBadge } from '@/components/ui/presence-ui'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/logs', label: 'Attendance Logs', icon: ClipboardList },
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

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-5 py-5">
        <BrandMark />
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 md:hidden"
        >
          <X size={16} />
        </button>
      </div>

      <div className="px-4 pt-4">
        <div className="rounded-lg border border-cyan-100 bg-cyan-50/70 px-3 py-3">
          <StatusBadge tone="emerald">Secure session</StatusBadge>
          <p className="mt-3 truncate text-xs font-medium text-zinc-600">{user.email}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Admin navigation">
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition duration-200',
              isActive(href, exact)
                ? 'bg-zinc-950 text-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}

        <Link
          href="/attendance"
          target="_blank"
          className="mt-3 flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-700 transition duration-200 hover:border-cyan-200 hover:text-cyan-800"
        >
          <ExternalLink size={16} />
          Kiosk Scanner
        </Link>
      </nav>

      <div className="border-t border-zinc-200 p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-zinc-600 transition duration-200 hover:bg-rose-50 hover:text-rose-700"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <aside className="fixed hidden h-full w-72 shrink-0 flex-col border-r border-zinc-200 bg-white/88 backdrop-blur-xl md:flex">
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
            className="cursor-pointer rounded-md p-2 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
          >
            <Menu size={18} />
          </button>
          <ScanFace size={18} className="text-cyan-700" />
          <span className="text-sm font-bold text-zinc-950">Presence Command</span>
        </div>

        <main id="main-content" className="mx-auto max-w-7xl p-4 md:p-8 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  )
}
