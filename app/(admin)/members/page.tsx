import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Member } from '@/types'
import MembersClient from './MembersClient'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: members } = await supabase
    .from('members')
    .select('*, departments(name)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Members</h1>
          <p className="mt-0.5 text-sm text-gray-500">{members?.length || 0} registered</p>
        </div>
        <Link
          href="/members/new"
          className="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          <UserPlus size={15} />
          Register Member
        </Link>
      </div>

      <MembersClient initialMembers={(members || []) as Member[]} />
    </div>
  )
}
