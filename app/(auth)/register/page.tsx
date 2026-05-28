'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, ShieldCheck, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { BrandMark, StatusBadge, Surface } from '@/components/ui/presence-ui'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Account created. Check your email to confirm.')
    router.push('/login')
  }

  return (
    <main id="main-content" className="grid min-h-screen place-items-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="hidden lg:block">
          <BrandMark />
          <h1 className="mt-8 max-w-xl text-4xl font-bold tracking-tight text-zinc-950">
            Set up the attendance command center for your team.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-600">
            Start with an admin account, then enroll departments and member identities from the
            protected dashboard.
          </p>
          <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <Building2 size={18} className="text-cyan-700" />
              <p className="mt-3 text-sm font-semibold text-zinc-950">Department-ready</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Roster data stays structured.</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <ShieldCheck size={18} className="text-emerald-700" />
              <p className="mt-3 text-sm font-semibold text-zinc-950">Protected admin</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Supabase authentication handles access.</p>
            </div>
          </div>
        </div>

        <Surface className="p-6">
          <div className="mb-7">
            <div className="mb-5 lg:hidden">
              <BrandMark />
            </div>
            <StatusBadge tone="emerald">
              <UserPlus size={12} />
              New workspace
            </StatusBadge>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-950">Create admin account</h2>
            <p className="mt-2 text-sm text-zinc-500">One account manages the attendance system.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-zinc-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-3 text-sm font-medium text-zinc-950 transition focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-zinc-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-3 text-sm font-medium text-zinc-950 transition focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-cyan-700 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-zinc-500">
            Already have one?{' '}
            <Link href="/login" className="font-semibold text-cyan-700 transition hover:text-cyan-800">
              Sign in
            </Link>
          </p>
        </Surface>
      </div>
    </main>
  )
}
