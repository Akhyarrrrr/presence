'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, ShieldCheck, UserCog, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { BrandMark, Button, Field, StatusPill, Surface, TextInput } from '@/components/ui/presence-ui'
import { MotionPage } from '@/components/ui/motion'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [ownerName, setOwnerName] = useState('')
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
    <main id="main-content" className="grid min-h-screen place-items-center px-4 py-8 md:py-12">
      <MotionPage className="grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_450px] lg:items-center">
        <section className="hidden lg:block" aria-labelledby="register-intro">
          <BrandMark />
          <StatusPill tone="emerald" icon={Building2} className="mt-10">
            Workspace setup
          </StatusPill>
          <h1 id="register-intro" className="mt-5 max-w-2xl font-display text-5xl font-semibold tracking-tight text-zinc-950">
            Set up your workspace with a secure owner identity.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-600">
            The current MVP signs up the owner through Supabase Auth. Organization and owner profile
            fields help the UI read correctly today, but they are not persisted by this form yet.
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              { title: 'Owner account', detail: 'First admin sign-in', icon: UserCog },
              { title: 'Managed members', detail: 'Employees do not self-register', icon: Users },
              { title: 'Future invites', detail: 'Approval flow is planned', icon: ShieldCheck },
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
            <StatusPill tone="emerald" icon={UserPlus}>
              Create Organization
            </StatusPill>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-950">Create Owner Account</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              This creates the initial owner login in the current MVP flow. Organization profile
              fields remain UI-only for now.
            </p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <Field
              id="organization-name"
              label="Organization Name"
              hint="UI-only in the current MVP registration flow."
            >
              <TextInput
                id="organization-name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="e.g. Northline Operations…"
                autoComplete="organization"
              />
            </Field>

            <Field
              id="owner-name"
              label="Owner Name"
              hint="UI-only today; future profile persistence can attach this to the owner record."
            >
              <TextInput
                id="owner-name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Operations Owner…"
                autoComplete="name"
              />
            </Field>

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

            <Field id="password" label="Password" hint="Use at least 6 characters.">
              <TextInput
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </Field>

            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? 'Creating account…' : 'Create account'}
              {!loading && <ArrowRight size={15} />}
            </Button>
          </form>

          <div className="mt-5 grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs leading-5 text-zinc-600">
            <p>Members do not self-register; HR/Admin creates member profiles for kiosk attendance.</p>
            <p>Additional admin invite or approval is a future phase, not part of this form today.</p>
            <p>Organization name and owner name are currently UI-only and are not sent to Supabase.</p>
          </div>

          <p className="mt-5 text-center text-sm text-zinc-500">
            Already have workspace access?{' '}
            <Link href="/login" className="font-semibold text-cyan-700 transition hover:text-cyan-800">
              Sign in
            </Link>
          </p>
        </Surface>
      </MotionPage>
    </main>
  )
}
