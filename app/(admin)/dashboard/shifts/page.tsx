import { Timer } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/ui/presence-ui'
import { getCurrentAdminContext } from '@/lib/supabase/organization'
import { createClient } from '@/lib/supabase/server'
import type { Shift } from '@/types'
import ShiftsClient from './ShiftsClient'

export default async function ShiftsPage() {
  const supabase = await createClient()
  const adminContext = await getCurrentAdminContext(supabase)

  if (!adminContext) {
    return (
      <EmptyState
        icon={Timer}
        title="Organization access is not ready"
        description="Your admin account is not linked to an organization yet. Apply the Phase 1 SQL migration and sign in again."
      />
    )
  }

  const { data: shifts } = await supabase
    .from('shifts')
    .select('*')
    .eq('organization_id', adminContext.organization.id)
    .order('start_time', { ascending: true })

  return (
    <div>
      <PageHeader
        eyebrow="Workforce planning"
        title="Shifts"
        description="Create reusable shift rules for attendance classification without changing the kiosk flow yet."
      />

      <ShiftsClient
        initialShifts={(shifts || []) as Shift[]}
        organizationId={adminContext.organization.id}
      />
    </div>
  )
}
