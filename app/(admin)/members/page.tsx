import { UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAdminContext } from '@/lib/supabase/organization'
import type { Member } from '@/types'
import { EmptyState, PageHeader, PrimaryLink } from '@/components/ui/presence-ui'
import MembersClient from './MembersClient'

export default async function MembersPage() {
  const supabase = await createClient()
  const adminContext = await getCurrentAdminContext(supabase)

  if (!adminContext) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Organization access is not ready"
        description="Your admin account is not linked to an organization yet. Apply the Phase 1 SQL migration and sign in again."
      />
    )
  }

  const organizationId = adminContext.organization.id
  const { data: members } = await supabase
    .from('members')
    .select('*, departments(name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        eyebrow="Identity roster"
        title="Members"
        description={`${members?.length || 0} registered identity profiles ready for recognition. Members are employees managed by HR/Admin and do not need login access for kiosk attendance.`}
        action={
          <PrimaryLink href="/members/new" className="shrink-0">
            <UserPlus size={15} />
            Register Member
          </PrimaryLink>
        }
      />

      <MembersClient initialMembers={(members || []) as Member[]} organizationId={organizationId} />
    </div>
  )
}
