import { render } from '@react-email/render'
import { and, count, eq, inArray, notInArray, sql } from 'drizzle-orm'
import { projectsService } from '@/app/api/projects/service'
import TeamAssignedToProjectEmail from '@/emails/templates/team-assigned-to-project'
import { sendEmailsToRecipients } from '@/lib/notifications'
import { todayDateOnly } from '@/lib/utils'
import type { Project } from '@/server/access/project-access'
import {
  type ActiveMember,
  projectAccess,
} from '@/server/access/project-access'
import { db } from '@/server/db'
import { settings as settingsTable } from '@/server/db/schema'
import { members, teamMembers, teams, users } from '@/server/db/schema/auth'
import {
  projectClientAssignments,
  projectInvitations,
  projectMemberAssignments,
  projects,
  projectTeamAssignments,
} from '@/server/db/schema/project'
import { memberRates, pendingMemberRates } from '@/server/db/schema/timesheet'

type Frequency = typeof memberRates.$inferInsert.payFrequency

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

const getProjectClients = async (projectId: string) =>
  await db
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

const getOrgTeams = async (organizationId: string) =>
  await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
    })
    .from(teams)
    .where(eq(teams.organizationId, organizationId))

const getMemberById = async (
  organizationId: string,
  memberId: string,
  roles: string[]
) => {
  const [member] = await db
    .select()
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(
      and(
        eq(members.id, memberId),
        inArray(members.role, roles),
        eq(members.organizationId, organizationId)
      )
    )
  return member ?? null
}

const getClientMemberById = async (organizationId: string, memberId: string) =>
  await getMemberById(organizationId, memberId, ['client'])

export const getAdminAndOwners = async (organizationId: string) =>
  await db
    .select()
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(
      and(
        eq(members.organizationId, organizationId),
        inArray(members.role, ['admin', 'owner'])
      )
    )

const getOrgMembers = async (organizationId: string, excludeClients = false) =>
  await db
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

const getOrgMemberCounts = async (organizationId: string) => {
  const rows = await db
    .select({ id: members.id, role: members.role })
    .from(members)
    .where(eq(members.organizationId, organizationId))

  let team = 0
  let client = 0
  for (const row of rows) {
    if (row.role === 'client') {
      client++
    } else {
      team++
    }
  }
  return { team, client }
}

/**
 * Whether a member has no remaining project (member or client) assignments —
 * the signal the caller uses to decide org removal (an auth concern that needs
 * request headers, so it stays in the action).
 */
const hasNoRemainingAssignments = async (memberId: string) => {
  const [memberAssignment] = await db
    .select({ id: projectMemberAssignments.id })
    .from(projectMemberAssignments)
    .where(eq(projectMemberAssignments.memberId, memberId))
    .limit(1)

  const [clientAssignment] = await db
    .select({ id: projectClientAssignments.id })
    .from(projectClientAssignments)
    .where(eq(projectClientAssignments.memberId, memberId))
    .limit(1)

  return !(memberAssignment || clientAssignment)
}

const linkInvitation = async ({
  invitationId,
  projectId,
  type,
}: {
  invitationId: string
  projectId: string
  type: 'member' | 'client'
}) => {
  const [record] = await db
    .insert(projectInvitations)
    .values({ invitationId, projectId, type })
    .onConflictDoNothing()
    .returning()

  return record
}

const removeMemberAssignment = async ({
  assignmentId,
  orgMember,
}: {
  assignmentId: string
  orgMember: ActiveMember
}) => {
  const [assignment] = await db
    .select({
      memberId: projectMemberAssignments.memberId,
      projectId: projectMemberAssignments.projectId,
    })
    .from(projectMemberAssignments)
    .where(eq(projectMemberAssignments.id, assignmentId))

  if (!assignment) {
    throw new Error('Assignment not found')
  }
  await projectAccess.assert(
    assignment.projectId,
    orgMember,
    'Assignment not found'
  )

  await db
    .delete(projectMemberAssignments)
    .where(eq(projectMemberAssignments.id, assignmentId))

  return {
    memberId: assignment.memberId,
    shouldRemoveFromOrg: await hasNoRemainingAssignments(assignment.memberId),
  }
}

const removeClientAssignment = async ({
  assignmentId,
  orgMember,
}: {
  assignmentId: string
  orgMember: ActiveMember
}) => {
  const [assignment] = await db
    .select({
      memberId: projectClientAssignments.memberId,
      projectId: projectClientAssignments.projectId,
    })
    .from(projectClientAssignments)
    .where(eq(projectClientAssignments.id, assignmentId))

  if (!assignment) {
    throw new Error('Assignment not found')
  }
  await projectAccess.assert(
    assignment.projectId,
    orgMember,
    'Assignment not found'
  )

  await db
    .delete(projectClientAssignments)
    .where(eq(projectClientAssignments.id, assignmentId))

  return {
    memberId: assignment.memberId,
    shouldRemoveFromOrg: await hasNoRemainingAssignments(assignment.memberId),
  }
}

const unassignTeam = async ({
  assignmentId,
  orgMember,
}: {
  assignmentId: string
  orgMember: ActiveMember
}) => {
  const [teamAssignment] = await db
    .select({ projectId: projectTeamAssignments.projectId })
    .from(projectTeamAssignments)
    .where(eq(projectTeamAssignments.id, assignmentId))
  if (!teamAssignment) {
    throw new Error('Assignment not found')
  }
  await projectAccess.assert(
    teamAssignment.projectId,
    orgMember,
    'Assignment not found'
  )

  await db
    .delete(projectTeamAssignments)
    .where(eq(projectTeamAssignments.id, assignmentId))

  return { success: true }
}

const assignTeam = async ({
  projectId,
  teamId,
  assignedByName,
}: {
  projectId: string
  teamId: string
  assignedByName: string | null
}) => {
  const [assignment] = await db
    .insert(projectTeamAssignments)
    .values({ projectId, teamId })
    .onConflictDoNothing()
    .returning()

  if (!assignment) {
    throw new Error('Team is already assigned to this project')
  }

  const [team] = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.id, teamId))

  const projectDetails = await projectsService.getProjectDetails(projectId)

  if (team && projectDetails.projectName) {
    const tMembers = await db
      .select({ name: users.name, email: users.email })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId))

    await sendEmailsToRecipients(tMembers, async (recipient) => {
      const html = await render(
        TeamAssignedToProjectEmail({
          recipientName: recipient.name ?? 'Team Member',
          teamName: team.name,
          projectName: projectDetails.projectName,
          organizationName: projectDetails.orgName,
          assignedByName: assignedByName ?? 'there',
          orgSlug: projectDetails.orgSlug ?? '',
          projectSlug: projectDetails.projectSlug ?? '',
        })
      )
      return {
        to: recipient.email,
        subject: `Your team "${team.name}" has been assigned to ${projectDetails.projectName}`,
        html,
      }
    })
  }

  return assignment
}

const addExistingMember = async ({
  project,
  email,
  organizationId,
  type,
  payRate,
  payCurrency,
  payFrequency,
  billingRate,
  billingCurrency,
  billingFrequency,
  setAsOrgDefault,
}: {
  project: Project
  email: string
  organizationId: string
  type: 'member' | 'client'
  payRate?: number
  payCurrency?: string
  payFrequency?: typeof memberRates.$inferInsert.payFrequency
  billingRate?: number
  billingCurrency?: string
  billingFrequency?: typeof memberRates.$inferInsert.billingFrequency
  setAsOrgDefault?: boolean
}) => {
  const projectId = project.id
  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))

  if (!targetUser) {
    throw new Error('User not found')
  }

  const [member] = await db
    .select({ id: members.id })
    .from(members)
    .where(
      and(
        eq(members.userId, targetUser.id),
        eq(members.organizationId, organizationId)
      )
    )

  if (!member) {
    throw new Error('User is not a member of this organization')
  }

  if (type === 'client') {
    await db
      .insert(projectClientAssignments)
      .values({ projectId, memberId: member.id })
      .onConflictDoNothing()
  } else {
    await db
      .insert(projectMemberAssignments)
      .values({ projectId, memberId: member.id })
      .onConflictDoNothing()
  }

  // Set member rate if provided. Billing columns fall back to pay values.
  if (payRate !== undefined && payCurrency && type !== 'client') {
    await db
      .insert(memberRates)
      .values({
        memberId: member.id,
        payRate,
        payCurrency,
        payFrequency: payFrequency ?? 'hourly',
        billingRate: billingRate ?? payRate,
        billingCurrency: billingCurrency ?? payCurrency,
        billingFrequency: billingFrequency ?? payFrequency ?? 'hourly',
        effectiveFrom: todayDateOnly(),
      })
      .onConflictDoNothing()
  }

  // Update workspace wide defaults if checkbox was checked
  if (setAsOrgDefault && payRate !== undefined && payCurrency) {
    const defaults = {
      payRate,
      payCurrency,
      payFrequency: payFrequency ?? 'hourly',
      billingRate: billingRate ?? payRate,
      billingCurrency: billingCurrency ?? payCurrency,
      billingFrequency: billingFrequency ?? payFrequency ?? 'hourly',
    }
    await db
      .insert(settingsTable)
      .values({
        organizationId,
        ...defaults,
      })
      .onConflictDoUpdate({
        target: [settingsTable.organizationId],
        targetWhere: sql`${settingsTable.projectId} IS NULL`,
        set: defaults,
      })
  }

  return { success: true }
}

const assignClientToProject = async ({
  memberId,
  projectId,
  organizationId,
}: {
  memberId: string
  projectId: string
  organizationId: string
}) => {
  const [member] = await db
    .select({
      id: members.id,
      organizationId: members.organizationId,
      role: members.role,
    })
    .from(members)
    .where(eq(members.id, memberId))

  if (!member || member.organizationId !== organizationId) {
    throw new Error('Client not found')
  }
  if (member.role !== 'client') {
    throw new Error('Member is not a client')
  }

  const [assignment] = await db
    .insert(projectClientAssignments)
    .values({ projectId, memberId })
    .onConflictDoNothing()
    .returning()

  if (!assignment) {
    throw new Error('Client is already assigned to this project')
  }

  return { success: true }
}

const removeClientFromProject = async ({
  assignmentId,
  organizationId,
}: {
  assignmentId: string
  organizationId: string
}) => {
  const [assignment] = await db
    .select({
      id: projectClientAssignments.id,
      memberId: projectClientAssignments.memberId,
    })
    .from(projectClientAssignments)
    .innerJoin(members, eq(projectClientAssignments.memberId, members.id))
    .where(
      and(
        eq(projectClientAssignments.id, assignmentId),
        eq(members.organizationId, organizationId)
      )
    )

  if (!assignment) {
    throw new Error('Assignment not found')
  }

  await db
    .delete(projectClientAssignments)
    .where(eq(projectClientAssignments.id, assignmentId))

  return { success: true }
}

/**
 * Clear a client's project assignments. The org-membership removal itself is an
 * auth concern (needs request headers) and stays in the action.
 */
const clearClientAssignments = async ({
  memberId,
  organizationId,
}: {
  memberId: string
  organizationId: string
}) => {
  const [member] = await db
    .select({
      id: members.id,
      organizationId: members.organizationId,
      role: members.role,
    })
    .from(members)
    .where(eq(members.id, memberId))

  if (!member || member.organizationId !== organizationId) {
    throw new Error('Client not found')
  }
  if (member.role !== 'client') {
    throw new Error('Member is not a client')
  }

  await db
    .delete(projectClientAssignments)
    .where(eq(projectClientAssignments.memberId, memberId))

  await db
    .delete(projectMemberAssignments)
    .where(eq(projectMemberAssignments.memberId, memberId))

  return { success: true }
}

/** Verify a member belongs to the org (gate before an auth-api mutation). */
const assertMemberInOrg = async (memberId: string, organizationId: string) => {
  const [target] = await db
    .select({ id: members.id })
    .from(members)
    .where(
      and(eq(members.id, memberId), eq(members.organizationId, organizationId))
    )
  if (!target) {
    throw new Error('Member not found')
  }
}

/**
 * Persist the rate for an invited member (and optionally the org default). The
 * invitation itself is created via auth-api in the action.
 */
const recordInvitePendingRate = async ({
  invitationId,
  organizationId,
  email,
  payRate,
  payCurrency,
  payFrequency,
  billingRate,
  billingCurrency,
  billingFrequency,
  setAsOrgDefault,
}: {
  invitationId: string
  organizationId: string
  email: string
  payRate: number
  payCurrency: string
  payFrequency?: Frequency
  billingRate?: number
  billingCurrency?: string
  billingFrequency?: Frequency
  setAsOrgDefault?: boolean
}) => {
  const usePayForBilling = billingRate === undefined
  const rateValues = {
    payRate,
    payCurrency,
    payFrequency: payFrequency ?? 'hourly',
    billingRate: usePayForBilling ? payRate : billingRate,
    billingCurrency: usePayForBilling
      ? payCurrency
      : (billingCurrency ?? payCurrency),
    billingFrequency: usePayForBilling
      ? (payFrequency ?? 'hourly')
      : (billingFrequency ?? payFrequency ?? 'hourly'),
  }

  await db.insert(pendingMemberRates).values({
    invitationId,
    organizationId,
    email,
    ...rateValues,
  })

  if (setAsOrgDefault) {
    await db
      .insert(settingsTable)
      .values({ organizationId, ...rateValues })
      .onConflictDoUpdate({
        target: [settingsTable.organizationId],
        targetWhere: sql`${settingsTable.projectId} IS NULL`,
        set: rateValues,
      })
  }
}

const renameTeam = async ({
  teamId,
  name,
  organizationId,
}: {
  teamId: string
  name: string
  organizationId: string
}) => {
  const [team] = await db
    .select({ id: teams.id, organizationId: teams.organizationId })
    .from(teams)
    .where(eq(teams.id, teamId))

  if (!team || team.organizationId !== organizationId) {
    throw new Error('Team not found')
  }

  await db.update(teams).set({ name }).where(eq(teams.id, teamId))

  return { success: true }
}

const deleteTeam = async ({
  teamId,
  organizationId,
}: {
  teamId: string
  organizationId: string
}) => {
  const [team] = await db
    .select({ id: teams.id, organizationId: teams.organizationId })
    .from(teams)
    .where(eq(teams.id, teamId))

  if (!team || team.organizationId !== organizationId) {
    throw new Error('Team not found')
  }

  const [record] = await db
    .select({ teamCount: count() })
    .from(teams)
    .where(eq(teams.organizationId, organizationId))

  if (!record || record.teamCount <= 1) {
    throw new Error('Cannot delete the last team in the workspace')
  }

  await db.delete(teams).where(eq(teams.id, teamId))

  return { success: true }
}

/** Gate before auth-api addTeamMember: team + user must belong to the org. */
const assertTeamMemberAddable = async ({
  teamId,
  userId,
  organizationId,
}: {
  teamId: string
  userId: string
  organizationId: string
}) => {
  const [team] = await db
    .select({ id: teams.id, organizationId: teams.organizationId })
    .from(teams)
    .where(eq(teams.id, teamId))

  if (!team || team.organizationId !== organizationId) {
    throw new Error('Team not found')
  }

  const [member] = await db
    .select({ id: members.id })
    .from(members)
    .where(
      and(
        eq(members.userId, userId),
        eq(members.organizationId, organizationId)
      )
    )

  if (!member) {
    throw new Error('User is not a member of this organization')
  }
}

const removeTeamMember = async ({
  teamMemberId,
  organizationId,
}: {
  teamMemberId: string
  organizationId: string
}) => {
  const [tm] = await db
    .select({ id: teamMembers.id, teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.id, teamMemberId))

  if (!tm) {
    throw new Error('Team member not found')
  }

  const [team] = await db
    .select({ organizationId: teams.organizationId })
    .from(teams)
    .where(eq(teams.id, tm.teamId))

  if (!team || team.organizationId !== organizationId) {
    throw new Error('Team member not found')
  }

  await db.delete(teamMembers).where(eq(teamMembers.id, teamMemberId))

  return { success: true }
}

export const teamService = {
  getProjectMembers,
  getProjectClients,
  getProjectTeams,
  getOrgTeams,
  getMemberById,
  getOrgMembers,
  getOrgMemberCounts,
  getOrgTeamsWithMembers,
  getClientMemberById,
  getAdminAndOwners,
  getOrgClients,
  linkInvitation,
  removeMemberAssignment,
  removeClientAssignment,
  unassignTeam,
  assignTeam,
  addExistingMember,
  assignClientToProject,
  removeClientFromProject,
  clearClientAssignments,
  assertMemberInOrg,
  recordInvitePendingRate,
  renameTeam,
  deleteTeam,
  assertTeamMemberAddable,
  removeTeamMember,
}
