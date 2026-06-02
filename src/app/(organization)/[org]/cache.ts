import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { projectAccess } from '@/server/access/project-access'
import { getSession } from '@/server/auth'
import { roles } from '@/server/auth/permissions'
import type { Role as MemberRole } from '@/types'

export const getCachedUserSession = async () => {
  const session = await getSession()
  return session?.user
}

export const getCachedOrganization = async (
  slug: string,
  headers: ReadonlyHeaders
) => {
  const session = await getCachedUserSession()
  if (!session) {
    return null
  }
  const organization = await authClient.organization.getFullOrganization(
    {
      query: { organizationSlug: slug },
    },
    { headers }
  )
  if (organization.data) {
    return organization.data
  }
  return null
}

export const getCachedActiveOrgMember = async (
  headers: ReadonlyHeaders,
  _cacheBustKey?: string
) => {
  const member = await authClient.organization.getActiveMember({
    fetchOptions: { headers },
  })
  if (!member.data) {
    const orgs = await authClient.organization.list({
      fetchOptions: { headers },
    })
    await authClient.organization.setActive({
      organizationId: orgs.data?.[0]?.id,
      fetchOptions: { headers },
    })
    const member = await authClient.organization.getActiveMember({
      fetchOptions: { headers },
    })
    return member.data!
    // The above code is duplicated because calling the function recurseively inside cache throws: Chaining cycle detected for promise #<Promise>
  }
  return member.data!
}

/**
 * Resolves and validates the full org context for a page.
 * Redirects if session, org, or membership is missing.
 * Returns session, organization, orgMember, and resolved role.
 */
export const resolveOrgContext = async (orgSlug: string) => {
  const session = await getCachedUserSession()

  if (!session) {
    redirect(`/auth/sign-in?redirectTo=${encodeURIComponent(`/${orgSlug}`)}`)
  }

  const h = await headers()

  const organization = await getCachedOrganization(orgSlug, h)

  if (!organization) {
    redirect(`/error/404?message=${encodeURIComponent('Workspace not found')}`)
  }

  const orgMember = await getCachedActiveOrgMember(h)

  if (!orgMember) {
    redirect(
      `/error/403?message=${encodeURIComponent('You are not a member of this workspace')}`
    )
  }

  const role = roles[orgMember.role as keyof typeof roles]

  return { session, organization, orgMember, role }
}
/**
 * Resolves org context AND verifies the user has access to the given project.
 * Access is granted if:
 *   1. User is an owner or admin of the organization, OR
 *   2. User is individually assigned to the project (member or client), OR
 *   3. User belongs to a team that is assigned to the project.
 * Redirects if the project is not found or the user has no access.
 */
export const resolveProjectContext = async (
  orgSlug: string,
  projectSlug: string
) => {
  const orgContext = await resolveOrgContext(orgSlug)
  const { organization, orgMember } = orgContext

  const project = await projectAccess.resolveBySlug(
    projectSlug,
    organization.id
  )

  if (!project) {
    redirect(`/error/404?message=${encodeURIComponent('Project not found')}`)
  }

  const granted = await projectAccess.hasAccess(project, {
    id: orgMember.id,
    userId: orgMember.userId,
    role: orgMember.role as MemberRole,
  })

  if (!granted) {
    redirect(
      `/error/403?message=${encodeURIComponent('You do not have access to this project')}`
    )
  }

  return { ...orgContext, project }
}

type Role = (typeof roles)[keyof typeof roles]
type AuthorizeArg = Parameters<Role['authorize']>[0]

/**
 * Redirects to the 403 error page if the role does not satisfy the given
 * permissions. Use at the top of `/[org]/*` and `/[org]/[project]/*` pages
 * after resolving the org/project context.
 */
export const requirePermission = (
  role: Role,
  permissions: AuthorizeArg,
  message = 'You do not have permission to view this page'
) => {
  if (!role.authorize(permissions).success) {
    redirect(`/error/403?message=${encodeURIComponent(message)}`)
  }
}
