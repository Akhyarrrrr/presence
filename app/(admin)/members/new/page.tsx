import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
      <h1 className="mb-2 text-2xl font-bold text-white">Register Member</h1>
      <p className="mb-8 text-sm text-gray-500">Capture a face photo to enroll a new member</p>
      <RegisterMemberClient departments={departments || []} />
    </div>
  )
}
