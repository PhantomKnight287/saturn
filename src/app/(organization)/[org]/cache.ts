import { and, eq, inArray } from 'drizzle-orm'
import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
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

export const getCachedUserSession = cache(async () => {
  const session = await getSession()
  return session?.user
})

export const getCachedOrganization = cache(
  async (slug: string, headers: ReadonlyHeaders) => {
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
)

export const getCachedActiveOrgMember = cache(
  async (headers: ReadonlyHeaders, _cacheBustKey?: string) => {
    const member = await authClient.organization.getActiveMember({
      fetchOptions: { headers },
    })
    if (!member.data) {
      const orgs = await authClient.organization.list({
        fetchOptions: { headers },
      })
      await authClient.organization.setActive({
        organizationId: orgs.data?.[0]?.id,
      })
      const member = await authClient.organization.getActiveMember({
        fetchOptions: { headers },
      })
      return member.data!
      // The above code is duplicated because calling the function recurseively inside cache throws: Chaining cycle detected for promise #<Promise>
    }
    return member.data!
  }
)

/**
 * Resolves and validates the full org context for a page.
 * Redirects if session, org, or membership is missing.
 * Returns session, organization, orgMember, and resolved role.
 */
export const resolveOrgContext = cache(async (orgSlug: string) => {
  const session = await getCachedUserSession()

  if (!session) {
    redirect(`/auth/sign-in?redirectTo=${encodeURIComponent(`/${orgSlug}`)}`)
  }

  const h = await headers()

  const organization = await getCachedOrganization(orgSlug, h)

  if (!organization) {
    redirect(`/error?message=${encodeURIComponent('Workspace not found')}`)
  }

  const orgMember = await getCachedActiveOrgMember(h)

  if (!orgMember) {
    redirect(
      `/error?message=${encodeURIComponent('You are not a member of this workspace')}`
    )
  }

  const role = roles[orgMember.role as keyof typeof roles]

  return { session, organization, orgMember, role }
})
/**
 * Resolves org context AND verifies the user has access to the given project.
 * Access is granted if:
 *   1. User is an owner or admin of the organization, OR
 *   2. User is individually assigned to the project (member or client), OR
 *   3. User belongs to a team that is assigned to the project.
 * Redirects if the project is not found or the user has no access.
 */
export const resolveProjectContext = cache(
  async (orgSlug: string, projectSlug: string) => {
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
      redirect(`/error?message=${encodeURIComponent('Project not found')}`)
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
      `/error?message=${encodeURIComponent('You do not have access to this project')}`
    )
  }
)
