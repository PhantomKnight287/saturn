import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/server/db'
import {
  projectClientAssignments,
  projectMemberAssignments,
  projects,
  projectTeamAssignments,
  teamMembers,
} from '@/server/db/schema'
import type { Role } from '@/types'

export type Project = typeof projects.$inferSelect

/** The member facts the access decision needs — a subset of the active org member. */
export interface AccessMember {
  id: string
  role: Role
  userId: string
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

export const projectAccess = { resolveById, resolveBySlug, hasAccess, check }
