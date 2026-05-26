import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminShell from './AdminShell'

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <AdminShell user={user}>{children}</AdminShell>
}
