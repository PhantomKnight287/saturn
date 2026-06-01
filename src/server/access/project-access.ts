import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/server/db'
import {
  projectClientAssignments,
  projectMemberAssignments,
  projects,
  projectTeamAssignments,
  teamMembers,
} from '@/server/db/schema'

export type Project = typeof projects.$inferSelect

/** The member facts the access decision needs — a subset of the active org member. */
export interface AccessMember {
  id: string
  role: string
  userId: string
}

/**
 * The active org member as the domain layer consumes it: a superset of
 * [[AccessMember]] carrying the org it's scoped to and the user's display name
 * (for notifications). `ctx.orgMember` from a scoped action client satisfies it.
 */
export interface ActiveMember extends AccessMember {
  organizationId: string
  user: { name: string | null }
}

const resolveById = async (projectId: string, organizationId: string) => {
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organizationId)
      )
    )
  return project ?? null
}

const resolveBySlug = async (slug: string, organizationId: string) => {
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.slug, slug), eq(projects.organizationId, organizationId))
    )
  return project ?? null
}

const hasAccess = async (project: Project, member: AccessMember) => {
  if (member.role === 'owner' || member.role === 'admin') {
    return true
  }

  const [memberAssignment] = await db
    .select({ id: projectMemberAssignments.id })
    .from(projectMemberAssignments)
    .where(
      and(
        eq(projectMemberAssignments.projectId, project.id),
        eq(projectMemberAssignments.memberId, member.id)
      )
    )
  if (memberAssignment) {
    return true
  }

  const [clientAssignment] = await db
    .select({ id: projectClientAssignments.id })
    .from(projectClientAssignments)
    .where(
      and(
        eq(projectClientAssignments.projectId, project.id),
        eq(projectClientAssignments.memberId, member.id)
      )
    )
  if (clientAssignment) {
    return true
  }

  const userTeams = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, member.userId))
  if (userTeams.length === 0) {
    return false
  }

  const [teamAssignment] = await db
    .select({ id: projectTeamAssignments.id })
    .from(projectTeamAssignments)
    .where(
      and(
        eq(projectTeamAssignments.projectId, project.id),
        inArray(
          projectTeamAssignments.teamId,
          userTeams.map((t) => t.teamId)
        )
      )
    )
  return Boolean(teamAssignment)
}

/**
 * Convenience for entity-scoped callers that hold a `projectId` (resolved from
 * the entity they're acting on) rather than receiving it as action input:
 * resolves the project within the org and returns whether the member has access.
 */
const check = async (
  projectId: string,
  organizationId: string,
  member: AccessMember
) => {
  const project = await resolveById(projectId, organizationId)
  if (!project) {
    return false
  }
  return hasAccess(project, member)
}

/**
 * Entity-scoped guard: verify `member` may touch `projectId` within its own org,
 * throwing `notFoundMessage` otherwise. The single home for the "load entity →
 * check access" preamble every service write shares.
 */
const assert = async (
  projectId: string,
  member: ActiveMember,
  notFoundMessage: string
) => {
  const granted = await check(projectId, member.organizationId, member)
  if (!granted) {
    throw new Error(notFoundMessage)
  }
}

export const projectAccess = {
  resolveById,
  resolveBySlug,
  hasAccess,
  check,
  assert,
}
