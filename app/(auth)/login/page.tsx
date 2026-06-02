'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, ClipboardList, LockKeyhole, ScanFace, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { BrandMark, Button, Field, StatusPill, Surface, TextInput } from '@/components/ui/presence-ui'
import { MotionPage } from '@/components/ui/motion'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main id="main-content" className="grid min-h-screen place-items-center px-4 py-8 md:py-12">
      <MotionPage className="grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center">
        <section className="hidden lg:block" aria-labelledby="login-intro">
          <BrandMark />
          <StatusPill tone="cyan" icon={LockKeyhole} className="mt-10">
            Owner / Admin workspace
          </StatusPill>
          <h1 id="login-intro" className="mt-5 max-w-2xl font-display text-5xl font-semibold tracking-tight text-zinc-950">
            Operational control for workforce attendance.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-600">
            Monitor arrivals in real time, manage member identity, and review attendance evidence
            from one secure workspace designed for daily HR execution.
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              { title: 'Kiosk control', detail: 'Public check-in route', icon: ScanFace },
              { title: 'Audit trail', detail: 'Duplicate-safe logs', icon: ClipboardList },
              { title: 'Secure access', detail: 'Supabase Auth', icon: ShieldCheck },
            ].map(({ title, detail, icon: Icon }) => (
              <div key={title} className="rounded-lg border border-zinc-200 bg-white/88 p-4 shadow-[0_14px_44px_rgba(15,23,42,0.05)]">
                <Icon size={18} className="text-cyan-700" />
                <p className="mt-3 text-sm font-semibold text-zinc-950">{title}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <Surface className="p-6 md:p-7">
          <div className="mb-7">
            <div className="mb-6 lg:hidden">
              <BrandMark />
            </div>
            <StatusPill tone="cyan" icon={LockKeyhole}>
              Workspace Login
            </StatusPill>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-950">Owner/Admin sign in</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Access the protected workspace for roster, schedule, log, and report workflows.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Field id="email" label="Email">
              <TextInput
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                spellCheck={false}
              />
            </Field>

            <Field id="password" label="Password">
              <TextInput
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </Field>

            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? 'Signing in…' : 'Sign in to workspace'}
              {!loading && <ArrowRight size={15} />}
            </Button>
          </form>

          <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-sm leading-6 text-zinc-600">
              Need the first workspace account?{' '}
              <Link href="/register" className="font-semibold text-cyan-700 transition hover:text-cyan-800">
                Create an owner account
              </Link>
              .
            </p>
          </div>
        </Surface>
      </MotionPage>
    </main>
  )
}
