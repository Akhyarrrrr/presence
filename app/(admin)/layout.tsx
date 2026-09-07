import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminShell from './AdminShell'
import { getCurrentAdminContext } from '@/lib/supabase/organization'

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient()
  const context = await getCurrentAdminContext(supabase)
  if (!context) redirect('/login')
  return <AdminShell user={context.user} organizationSlug={context.organization.slug}>{children}</AdminShell>
}
