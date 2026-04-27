import { and, eq, inArray } from 'drizzle-orm'
import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { getSession } from '@/server/auth'
import { roles } from '@/server/auth/permissions'
import { db } from '@/server/db'
import {
  projectClientAssignments,
  projectMemberAssignments,
  projects,
  projectTeamAssignments,
  teamMembers,
} from '@/server/db/schema'

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

  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, organization.id),
        eq(projects.slug, projectSlug)
      )
    )

  if (!project) {
    redirect(`/error/404?message=${encodeURIComponent('Project not found')}`)
  }

  // Owners and admins have access to all projects in the org
  if (orgMember.role === 'owner' || orgMember.role === 'admin') {
    return { ...orgContext, project }
  }

  // Check direct member assignment
  const [memberAssignment] = await db
    .select({ id: projectMemberAssignments.id })
    .from(projectMemberAssignments)
    .where(
      and(
        eq(projectMemberAssignments.projectId, project.id),
        eq(projectMemberAssignments.memberId, orgMember.id)
      )
    )

  if (memberAssignment) {
    return { ...orgContext, project }
  }

  // Check direct client assignment
  const [clientAssignment] = await db
    .select({ id: projectClientAssignments.id })
    .from(projectClientAssignments)
    .where(
      and(
        eq(projectClientAssignments.projectId, project.id),
        eq(projectClientAssignments.memberId, orgMember.id)
      )
    )

  if (clientAssignment) {
    return { ...orgContext, project }
  }

  // Check team-based assignment: user's teams → project team assignments
  const userTeams = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, orgMember.userId))

  if (userTeams.length > 0) {
    const teamIds = userTeams.map((t) => t.teamId)
    const [teamAssignment] = await db
      .select({ id: projectTeamAssignments.id })
      .from(projectTeamAssignments)
      .where(
        and(
          eq(projectTeamAssignments.projectId, project.id),
          inArray(projectTeamAssignments.teamId, teamIds)
        )
      )

    if (teamAssignment) {
      return { ...orgContext, project }
    }
  }

  redirect(
    `/error/403?message=${encodeURIComponent('You do not have access to this project')}`
  )
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
