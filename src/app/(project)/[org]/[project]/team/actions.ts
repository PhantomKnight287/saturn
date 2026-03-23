'use server'

import { render } from '@react-email/render'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { authService } from '@/app/api/auth/service'
import { projectsService } from '@/app/api/projects/service'
// import { PROJECT_TEAM_CACHE_TAG } from '@/api/team/service'
import TeamAssignedToProjectEmail from '@/emails/templates/team-assigned-to-project'
import { sendEmailsToRecipients } from '@/lib/notifications'
import { authedActionClient } from '@/lib/safe-action'
import { auth } from '@/server/auth'
import { db } from '@/server/db'
import { members, teamMembers, teams, users } from '@/server/db/schema/auth'
import {
  projectClientAssignments,
  projectInvitations,
  projectMemberAssignments,
  projectTeamAssignments,
} from '@/server/db/schema/project'
import {
  addExistingMemberToProjectSchema,
  assignTeamSchema,
  linkInvitationSchema,
  removeClientSchema,
  removeMemberSchema,
  unassignTeamSchema,
} from './common'

export const linkInvitationToProjectAction = authedActionClient
  .inputSchema(linkInvitationSchema)
  .action(
    async ({
      parsedInput: { invitationId, projectId, type },
      ctx: { role, user, orgMember },
    }) => {
      if (!role.authorize({ member: ['create'] }).success) {
        throw new Error('You do not have permission to invite')
      }
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('You do not have access to this project')
      }

      const [record] = await db
        .insert(projectInvitations)
        .values({ invitationId, projectId, type })
        .onConflictDoNothing()
        .returning()

      return record
    }
  )

async function removeFromOrgIfNoAssignments(memberId: string) {
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

  if (!(memberAssignment || clientAssignment)) {
    await auth.api.removeMember({
      headers: await headers(),
      body: { memberIdOrEmail: memberId },
    })
  }
}

export const removeMemberAction = authedActionClient
  .inputSchema(removeMemberSchema)
  .action(
    async ({
      parsedInput: { assignmentId },
      ctx: { role, user, orgMember },
    }) => {
      if (!role.authorize({ member: ['delete'] }).success) {
        throw new Error('You do not have permission to remove members')
      }

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
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        assignment.projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('Assignment not found')
      }

      await db
        .delete(projectMemberAssignments)
        .where(eq(projectMemberAssignments.id, assignmentId))

      // If member has no remaining project assignments, remove from org
      if (assignment) {
        await removeFromOrgIfNoAssignments(assignment.memberId)
      }

      return { success: true }
    }
  )

export const removeClientAction = authedActionClient
  .inputSchema(removeClientSchema)
  .action(
    async ({
      parsedInput: { assignmentId },
      ctx: { role, user, orgMember },
    }) => {
      if (!role.authorize({ member: ['delete'] }).success) {
        throw new Error('You do not have permission to remove stakeholders')
      }

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
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        assignment.projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('Assignment not found')
      }

      await db
        .delete(projectClientAssignments)
        .where(eq(projectClientAssignments.id, assignmentId))

      // If member has no remaining project assignments, remove from org
      if (assignment) {
        await removeFromOrgIfNoAssignments(assignment.memberId)
      }

      return { success: true }
    }
  )

export const assignTeamAction = authedActionClient
  .inputSchema(assignTeamSchema)
  .action(
    async ({
      parsedInput: { projectId, teamId },
      ctx: { user, role, orgMember },
    }) => {
      if (!role.authorize({ team: ['update'] }).success) {
        throw new Error('You do not have permission to assign teams')
      }
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('You do not have access to this project')
      }

      const [assignment] = await db
        .insert(projectTeamAssignments)
        .values({ projectId, teamId })
        .onConflictDoNothing()
        .returning()

      if (!assignment) {
        throw new Error('Team is already assigned to this project')
      }

      // Send emails to all team members
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
              assignedByName: user.name ?? 'there',
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
  )

export const unassignTeamAction = authedActionClient
  .inputSchema(unassignTeamSchema)
  .action(
    async ({
      parsedInput: { assignmentId },
      ctx: { role, user, orgMember },
    }) => {
      if (!role.authorize({ team: ['delete'] }).success) {
        throw new Error('You do not have permission to unassign teams')
      }

      const [teamAssignment] = await db
        .select({ projectId: projectTeamAssignments.projectId })
        .from(projectTeamAssignments)
        .where(eq(projectTeamAssignments.id, assignmentId))
      if (!teamAssignment) {
        throw new Error('Assignment not found')
      }
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        teamAssignment.projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('Assignment not found')
      }

      await db
        .delete(projectTeamAssignments)
        .where(eq(projectTeamAssignments.id, assignmentId))

      return { success: true }
    }
  )

export const addExistingMemberToProjectAction = authedActionClient
  .inputSchema(addExistingMemberToProjectSchema)
  .action(
    async ({
      parsedInput: { email, projectId, organizationId, type },
      ctx: { role, user, orgMember },
    }) => {
      if (!role.authorize({ member: ['create'] }).success) {
        throw new Error('You do not have permission to add members')
      }
      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('You do not have access to this project')
      }

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

      // Insert into the appropriate project assignment table
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

      return { success: true }
    }
  )
