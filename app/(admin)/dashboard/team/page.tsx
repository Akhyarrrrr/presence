import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAdminContext } from '@/lib/supabase/organization'
import TeamClient from './TeamClient'

export default async function TeamPage() {
  const supabase = await createClient()
  const context = await getCurrentAdminContext(supabase)
  if (!context) redirect('/login')
  const [{ data: admins }, { data: invitations }] = await Promise.all([
    supabase.from('admin_users').select('id, user_id, role, created_at').eq('organization_id', context.organization.id).order('created_at'),
    supabase.from('admin_invitations').select('id, email, role, expires_at, accepted_at, created_at').eq('organization_id', context.organization.id).order('created_at', { ascending: false }),
  ])
  return <TeamClient organizationName={context.organization.name} owner={context.adminUser.role === 'owner'} admins={admins || []} invitations={invitations || []} />
}
