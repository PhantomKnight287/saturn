import { and, eq, inArray, notInArray } from 'drizzle-orm'
import { db } from '@/server/db'
import { members, teamMembers, teams, users } from '@/server/db/schema/auth'
import {
  projectClientAssignments,
  projectMemberAssignments,
  projects,
  projectTeamAssignments,
} from '@/server/db/schema/project'

export const PROJECT_TEAM_CACHE_TAG = 'project-team'

interface UnifiedProjectMember {
  assignedAt: Date
  assignmentId: string | null
  memberId: string
  orgRole: string
  projectRole: string
  source: 'direct' | 'team' | `org-role-${string}`
  teamName?: string
  userEmail: string
  userId: string
  userImage: string | null
  userName: string
}

const getProjectMembers = async (projectId: string) => {
  const seen = new Map<string, UnifiedProjectMember>()

  const [project] = await db
    .select({ organizationId: projects.organizationId })
    .from(projects)
    .where(eq(projects.id, projectId))

  if (!project) {
    return []
  }

  const [directMembers, orgAdmins, teamAssignments] = await Promise.all([
    db
      .select({
        assignmentId: projectMemberAssignments.id,
        memberId: projectMemberAssignments.memberId,
        projectRole: projectMemberAssignments.role,
        assignedAt: projectMemberAssignments.assignedAt,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
        orgRole: members.role,
      })
      .from(projectMemberAssignments)
      .innerJoin(members, eq(projectMemberAssignments.memberId, members.id))
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(projectMemberAssignments.projectId, projectId)),

    db
      .select({
        memberId: members.id,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
        orgRole: members.role,
        createdAt: members.createdAt,
      })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(
        and(
          eq(members.organizationId, project.organizationId),
          inArray(members.role, ['owner', 'admin'])
        )
      ),

    db
      .select({
        teamId: projectTeamAssignments.teamId,
        teamName: teams.name,
        assignedAt: projectTeamAssignments.assignedAt,
      })
      .from(projectTeamAssignments)
      .innerJoin(teams, eq(projectTeamAssignments.teamId, teams.id))
      .where(eq(projectTeamAssignments.projectId, projectId)),
  ])

  for (const m of directMembers) {
    seen.set(m.memberId, {
      assignmentId: m.assignmentId,
      memberId: m.memberId,
      projectRole: m.projectRole,
      assignedAt: m.assignedAt,
      userId: m.userId,
      userName: m.userName,
      userEmail: m.userEmail,
      userImage: m.userImage,
      orgRole: m.orgRole,
      source: 'direct',
    })
  }

  for (const m of orgAdmins) {
    if (!seen.has(m.memberId)) {
      seen.set(m.memberId, {
        assignmentId: null,
        memberId: m.memberId,
        projectRole: m.orgRole,
        assignedAt: m.createdAt,
        userId: m.userId,
        userName: m.userName,
        userEmail: m.userEmail,
        userImage: m.userImage,
        orgRole: m.orgRole,
        source: `org-role-${m.orgRole}`,
      })
    }
  }

  if (teamAssignments.length > 0) {
    const teamIds = teamAssignments.map((t) => t.teamId)
    const teamNameMap = new Map(teamAssignments.map((t) => [t.teamId, t]))

    const tmRows = await db
      .select({
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        memberId: members.id,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
        orgRole: members.role,
        createdAt: members.createdAt,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .innerJoin(
        members,
        and(
          eq(members.userId, teamMembers.userId),
          eq(members.organizationId, project.organizationId)
        )
      )
      .where(inArray(teamMembers.teamId, teamIds))

    for (const tm of tmRows) {
      if (!seen.has(tm.memberId)) {
        const teamInfo = teamNameMap.get(tm.teamId)
        seen.set(tm.memberId, {
          assignmentId: null,
          memberId: tm.memberId,
          projectRole: 'member',
          assignedAt: teamInfo?.assignedAt ?? tm.createdAt,
          userId: tm.userId,
          userName: tm.userName,
          userEmail: tm.userEmail,
          userImage: tm.userImage,
          orgRole: tm.orgRole,
          source: 'team',
          teamName: teamInfo?.teamName,
        })
      }
    }
  }

  return [...seen.values()]
}

const getProjectClients = async (projectId: string) => {
  return await db
    .select({
      assignmentId: projectClientAssignments.id,
      memberId: projectClientAssignments.memberId,
      assignedAt: projectClientAssignments.assignedAt,
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
    })
    .from(projectClientAssignments)
    .innerJoin(members, eq(projectClientAssignments.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(projectClientAssignments.projectId, projectId))
}
const getProjectTeams = async (projectId: string) => {
  const assignments = await db
    .select({
      assignmentId: projectTeamAssignments.id,
      teamId: projectTeamAssignments.teamId,
      assignedAt: projectTeamAssignments.assignedAt,
      teamName: teams.name,
    })
    .from(projectTeamAssignments)
    .innerJoin(teams, eq(projectTeamAssignments.teamId, teams.id))
    .where(eq(projectTeamAssignments.projectId, projectId))

  // Fetch team members for each team
  const teamsWithMembers = await Promise.all(
    assignments.map(async (assignment) => {
      const tmembers = await db
        .select({
          userId: users.id,
          userName: users.name,
          userEmail: users.email,
          userImage: users.image,
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(teamMembers.teamId, assignment.teamId))

      return { ...assignment, members: tmembers }
    })
  )

  return teamsWithMembers
}

const getOrgTeams = async (organizationId: string) => {
  return await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
    })
    .from(teams)
    .where(eq(teams.organizationId, organizationId))
}

const getClientMemberById = async (memberId: string) => {
  const [clientMember] = await db
    .select()
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(and(eq(members.id, memberId), eq(members.role, 'client')))

  if (!clientMember) {
    return null
  }

  return clientMember
}
export const getAdminAndOwners = async (organizationId: string) => {
  return await db
    .select()
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(
      and(
        eq(members.organizationId, organizationId),
        inArray(members.role, ['admin', 'owner'])
      )
    )
}

const getOrgMembers = async (
  organizationId: string,
  excludeClients = false
) => {
  return await db
    .select({
      memberId: members.id,
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      role: members.role,
      createdAt: members.createdAt,
    })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(
      and(
        eq(members.organizationId, organizationId),
        notInArray(members.role, excludeClients ? ['client'] : [])
      )
    )
}

const getOrgTeamsWithMembers = async (organizationId: string) => {
  const orgTeams = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      createdAt: teams.createdAt,
    })
    .from(teams)
    .where(eq(teams.organizationId, organizationId))

  const teamsWithMembers = await Promise.all(
    orgTeams.map(async (team) => {
      const tMembers = await db
        .select({
          teamMemberId: teamMembers.id,
          userId: users.id,
          userName: users.name,
          userEmail: users.email,
          userImage: users.image,
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(teamMembers.teamId, team.teamId))

      return { ...team, members: tMembers }
    })
  )

  return teamsWithMembers
}

const getOrgClients = async (organizationId: string) => {
  const clients = await db
    .select({
      memberId: members.id,
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      createdAt: members.createdAt,
    })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(
      and(
        eq(members.organizationId, organizationId),
        eq(members.role, 'client')
      )
    )

  const clientsWithProjects = await Promise.all(
    clients.map(async (client) => {
      const assignments = await db
        .select({
          assignmentId: projectClientAssignments.id,
          projectId: projects.id,
          projectName: projects.name,
          projectSlug: projects.slug,
        })
        .from(projectClientAssignments)
        .innerJoin(
          projects,
          eq(projectClientAssignments.projectId, projects.id)
        )
        .where(eq(projectClientAssignments.memberId, client.memberId))

      return { ...client, projects: assignments }
    })
  )

  return clientsWithProjects
}

export const teamService = {
  getProjectMembers,
  getProjectClients,
  getProjectTeams,
  getOrgTeams,
  getOrgMembers,
  getOrgTeamsWithMembers,
  getClientMemberById,
  getAdminAndOwners,
  getOrgClients,
}
