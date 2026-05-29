import { createClient } from '@/lib/supabase/server'
import { getCurrentAdminContext } from '@/lib/supabase/organization'
import { EmptyState, PageHeader } from '@/components/ui/presence-ui'
import { UserPlus } from 'lucide-react'
import RegisterMemberClient from './RegisterMemberClient'

export default async function NewMemberPage() {
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

  const { data: departments } = await supabase.from('departments').select('*').order('name')

  return (
    <div>
      <PageHeader
        eyebrow="Enrollment"
        title="Register member"
        description="Capture a high-quality face descriptor, then attach member details for kiosk recognition."
      />
      <RegisterMemberClient
        departments={departments || []}
        organizationId={adminContext.organization.id}
      />
    </div>
  )
}
