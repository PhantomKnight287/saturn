import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/server/db'
import {
  members,
  organizations,
  projectClientAssignments,
  projectMemberAssignments,
  projects,
} from '@/server/db/schema'

const ORG_ACCESS_CACHE_KEY = 'ORG_ACCESS'
const PROJECT_ACCESS_CACHE_KEY = 'PROJECT_ACCESS'

const checkProjectAccess = async (
  organizationId: string,
  projectId: string,
  currentUserId: string
) => {
  // Verify org exists and project belongs to it in one query
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .innerJoin(organizations, eq(projects.organizationId, organizations.id))
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organizationId)
      )
    )

  if (!project) {
    return { success: false, error: 'No project found in org with given id' }
  }

  // Get the member record for the current user in this org
  const [member] = await db
    .select({ id: members.id, role: members.role })
    .from(members)
    .where(
      and(
        eq(members.organizationId, organizationId),
        eq(members.userId, currentUserId)
      )
    )

  if (!member) {
    return {
      success: false,
      error: 'User is not a member of this organization',
    }
  }

  // Admins and owners have access to all projects
  if (member.role === 'owner' || member.role === 'admin') {
    return { success: true, error: null }
  }

  // Check if user is assigned as a project member or client in a single query
  const [assignment] = await db
    .select({ found: sql<number>`1` })
    .from(projectMemberAssignments)
    .where(
      and(
        eq(projectMemberAssignments.projectId, projectId),
        eq(projectMemberAssignments.memberId, member.id)
      )
    )
    .union(
      db
        .select({ found: sql<number>`1` })
        .from(projectClientAssignments)
        .where(
          and(
            eq(projectClientAssignments.projectId, projectId),
            eq(projectClientAssignments.memberId, member.id)
          )
        )
    )
    .limit(1)

  if (assignment) {
    return { success: true, error: null }
  }

  return {
    success: false,
    error: 'User does not have access to project',
  }
}

export const authService = {
  checkProjectAccess,
  ORG_ACCESS_CACHE_KEY,
  PROJECT_ACCESS_CACHE_KEY,
}
