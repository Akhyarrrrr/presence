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
} from 'lucide-react'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

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
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-gray-800 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/20">
          <ScanFace size={16} className="text-indigo-400" />
        </div>
        <span className="font-semibold text-white">Presence</span>
        <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-600">admin</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-4">
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              isActive(href, exact)
                ? 'bg-indigo-500/10 font-medium text-indigo-400'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}

        <Link
          href="/attendance"
          target="_blank"
          className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 transition hover:bg-gray-800 hover:text-white"
        >
          <ExternalLink size={16} />
          Open Scanner
        </Link>
      </nav>

      <div className="border-t border-gray-800 p-4">
        <p className="mb-2 truncate text-xs text-gray-600">{user.email}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition hover:bg-red-400/5 hover:text-red-400"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-gray-950">
      <aside className="fixed hidden h-full w-56 shrink-0 flex-col border-r border-gray-800 bg-gray-900/30 md:flex">
        {sidebar}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 cursor-pointer bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-56 border-r border-gray-800 bg-gray-900">{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 md:ml-56">
        <div className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-gray-800 bg-gray-900/50 px-4 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-800 hover:text-white"
          >
            <Menu size={18} />
          </button>
          <ScanFace size={18} className="text-indigo-400" />
          <span className="text-sm font-semibold text-white">Presence Admin</span>
        </div>

        <main className="mx-auto max-w-5xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
