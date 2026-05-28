import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/presence-ui'
import RegisterMemberClient from './RegisterMemberClient'

export default async function NewMemberPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: departments } = await supabase.from('departments').select('*').order('name')

  return (
    <div>
      <PageHeader
        eyebrow="Enrollment"
        title="Register member"
        description="Capture a high-quality face descriptor, then attach member details for kiosk recognition."
      />
      <RegisterMemberClient departments={departments || []} />
    </div>
  )
}
