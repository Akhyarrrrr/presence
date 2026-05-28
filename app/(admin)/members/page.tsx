import { UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Member } from '@/types'
import { PageHeader, PrimaryLink } from '@/components/ui/presence-ui'
import MembersClient from './MembersClient'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: members } = await supabase
    .from('members')
    .select('*, departments(name)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        eyebrow="Identity roster"
        title="Members"
        description={`${members?.length || 0} registered identity profiles ready for recognition.`}
        action={
          <PrimaryLink href="/members/new" className="shrink-0">
            <UserPlus size={15} />
            Register Member
          </PrimaryLink>
        }
      />

      <MembersClient initialMembers={(members || []) as Member[]} />
    </div>
  )
}
