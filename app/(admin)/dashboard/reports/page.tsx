import { FileText } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/ui/presence-ui'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAdminContext } from '@/lib/supabase/organization'
import ReportsClient from './ReportsClient'

function getDefaultMonth() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export default async function ReportsPage() {
  const supabase = await createClient()
  const adminContext = await getCurrentAdminContext(supabase)

  if (!adminContext) {
    return (
      <EmptyState
        icon={FileText}
        title="Organization access is not ready"
        description="Your admin account is not linked to an organization yet. Apply the Phase 1 SQL migration and sign in again."
      />
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Monthly analytics"
        title="Attendance Reports"
        description="Generate downloadable monthly attendance summaries for your organization."
      />
      <ReportsClient
        organizationId={adminContext.organization.id}
        organizationName={adminContext.organization.name}
        defaultMonth={getDefaultMonth()}
      />
    </div>
  )
}
