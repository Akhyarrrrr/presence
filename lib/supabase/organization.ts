import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { AdminUser, Organization } from '@/types'

export const DEFAULT_ORGANIZATION_NAME = 'Default Organization'

export interface CurrentAdminContext {
  user: User
  adminUser: AdminUser
  organization: Organization
}

interface AdminUserWithOrganization extends Omit<AdminUser, 'organizations'> {
  organizations: Organization | Organization[] | null
}

interface OrganizationScopedQuery {
  eq(column: string, value: string): unknown
}

export async function getCurrentAdminContext(
  supabase: SupabaseClient
): Promise<CurrentAdminContext | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  const { data, error } = await supabase
    .from('admin_users')
    .select(
      'id, user_id, organization_id, role, created_at, updated_at, organizations(id, name, timezone, created_at, updated_at)'
    )
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return null

  const row = data as unknown as AdminUserWithOrganization
  const { organizations, ...adminUser } = row
  const organization = Array.isArray(organizations) ? organizations[0] : organizations

  if (!organization) return null

  return {
    user,
    adminUser,
    organization,
  }
}

export async function getCurrentAdminProfile(
  supabase: SupabaseClient
): Promise<Pick<CurrentAdminContext, 'user' | 'adminUser'> | null> {
  const context = await getCurrentAdminContext(supabase)

  if (!context) return null

  return {
    user: context.user,
    adminUser: context.adminUser,
  }
}

export async function getCurrentOrganization(
  supabase: SupabaseClient
): Promise<Organization | null> {
  const context = await getCurrentAdminContext(supabase)
  return context?.organization ?? null
}

export function scopeToOrganization<TQuery extends OrganizationScopedQuery>(
  query: TQuery,
  organizationId: string | null | undefined
): TQuery {
  return organizationId ? (query.eq('organization_id', organizationId) as TQuery) : query
}
