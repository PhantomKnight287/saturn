'use server'

import { and, count, eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { authedActionClient } from '@/lib/safe-action'
import { auth } from '@/server/auth'
import { db } from '@/server/db'
import { settings as settingsTable } from '@/server/db/schema'
import { members, teamMembers, teams } from '@/server/db/schema/auth'
import { pendingMemberRates } from '@/server/db/schema/timesheet'
import {
  addTeamMemberSchema,
  changeOrgMemberRoleSchema,
  createTeamSchema,
  deleteTeamSchema,
  inviteOrgMemberSchema,
  removeOrgMemberSchema,
  removeTeamMemberSchema,
  renameTeamSchema,
} from './common'

export const inviteOrgMemberAction = authedActionClient
  .inputSchema(inviteOrgMemberSchema)
  .action(
    async ({
      parsedInput: {
        organizationId,
        email,
        role: inviteRole,
        hourlyRate,
        currency,
        setAsOrgDefault,
      },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ member: ['create'] }).success) {
        throw new Error('You do not have permission to invite members')
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      const result = await auth.api.createInvitation({
        headers: await headers(),
        body: {
          email,
          role: inviteRole,
          organizationId,
        },
      })

      if (hourlyRate !== undefined && currency) {
        await db.insert(pendingMemberRates).values({
          invitationId: result.id,
          organizationId,
          email,
          hourlyRate,
          currency,
        })
      }

      if (setAsOrgDefault && hourlyRate !== undefined && currency) {
        await db
          .insert(settingsTable)
          .values({
            organizationId,
            memberRate: hourlyRate,
            currency,
          })
          .onConflictDoUpdate({
            target: [settingsTable.organizationId],
            targetWhere: sql`${settingsTable.projectId} IS NULL`,
            set: {
              memberRate: hourlyRate,
              currency,
            },
          })
      }

      return { success: true }
    }
  )

export const removeOrgMemberAction = authedActionClient
  .inputSchema(removeOrgMemberSchema)
  .action(async ({ parsedInput: { memberId }, ctx: { role, orgMember } }) => {
    if (!role.authorize({ member: ['delete'] }).success) {
      throw new Error('You do not have permission to remove members')
    }

    const [target] = await db
      .select({ id: members.id, organizationId: members.organizationId })
      .from(members)
      .where(eq(members.id, memberId))

    if (!target || target.organizationId !== orgMember.organizationId) {
      throw new Error('Member not found')
    }

    await auth.api.removeMember({
      headers: await headers(),
      body: { memberIdOrEmail: memberId },
    })

    return { success: true }
  })

export const changeOrgMemberRoleAction = authedActionClient
  .inputSchema(changeOrgMemberRoleSchema)
  .action(
    async ({
      parsedInput: { memberId, role: newRole },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ member: ['update'] }).success) {
        throw new Error('You do not have permission to change roles')
      }

      const [target] = await db
        .select({
          id: members.id,
          organizationId: members.organizationId,
          userId: members.userId,
        })
        .from(members)
        .where(eq(members.id, memberId))

      if (!target || target.organizationId !== orgMember.organizationId) {
        throw new Error('Member not found')
      }

      await auth.api.updateMemberRole({
        headers: await headers(),
        body: {
          memberId,
          role: newRole,
          organizationId: orgMember.organizationId,
        },
      })

      return { success: true }
    }
  )

export const createTeamAction = authedActionClient
  .inputSchema(createTeamSchema)
  .action(
    async ({
      parsedInput: { organizationId, name },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ team: ['create'] }).success) {
        throw new Error('You do not have permission to create teams')
      }
      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      const team = await auth.api.createTeam({
        headers: await headers(),
        body: { name, organizationId },
      })

      return team
    }
  )

export const renameTeamAction = authedActionClient
  .inputSchema(renameTeamSchema)
  .action(
    async ({ parsedInput: { teamId, name }, ctx: { role, orgMember } }) => {
      if (!role.authorize({ team: ['update'] }).success) {
        throw new Error('You do not have permission to rename teams')
      }

      const [team] = await db
        .select({ id: teams.id, organizationId: teams.organizationId })
        .from(teams)
        .where(eq(teams.id, teamId))

      if (!team || team.organizationId !== orgMember.organizationId) {
        throw new Error('Team not found')
      }

      await db.update(teams).set({ name }).where(eq(teams.id, teamId))

      return { success: true }
    }
  )

export const deleteTeamAction = authedActionClient
  .inputSchema(deleteTeamSchema)
  .action(async ({ parsedInput: { teamId }, ctx: { role, orgMember } }) => {
    if (!role.authorize({ team: ['delete'] }).success) {
      throw new Error('You do not have permission to delete teams')
    }

    const [team] = await db
      .select({ id: teams.id, organizationId: teams.organizationId })
      .from(teams)
      .where(eq(teams.id, teamId))

    if (!team || team.organizationId !== orgMember.organizationId) {
      throw new Error('Team not found')
    }

    const [record] = await db
      .select({ teamCount: count() })
      .from(teams)
      .where(eq(teams.organizationId, orgMember.organizationId))

    if (!record || record.teamCount <= 1) {
      throw new Error('Cannot delete the last team in the workspace')
    }

    await db.delete(teams).where(eq(teams.id, teamId))

    return { success: true }
  })

export const addTeamMemberAction = authedActionClient
  .inputSchema(addTeamMemberSchema)
  .action(
    async ({ parsedInput: { teamId, userId }, ctx: { role, orgMember } }) => {
      if (!role.authorize({ team: ['update'] }).success) {
        throw new Error('You do not have permission to manage team members')
      }

      const [team] = await db
        .select({ id: teams.id, organizationId: teams.organizationId })
        .from(teams)
        .where(eq(teams.id, teamId))

      if (!team || team.organizationId !== orgMember.organizationId) {
        throw new Error('Team not found')
      }

      // Verify user is an org member
      const [member] = await db
        .select({ id: members.id })
        .from(members)
        .where(
          and(
            eq(members.userId, userId),
            eq(members.organizationId, orgMember.organizationId)
          )
        )

      if (!member) {
        throw new Error('User is not a member of this organization')
      }

      await auth.api.addTeamMember({
        headers: await headers(),
        body: { teamId, userId },
      })

      return { success: true }
    }
  )

export const removeTeamMemberAction = authedActionClient
  .inputSchema(removeTeamMemberSchema)
  .action(
    async ({ parsedInput: { teamMemberId }, ctx: { role, orgMember } }) => {
      if (!role.authorize({ team: ['update'] }).success) {
        throw new Error('You do not have permission to manage team members')
      }

      const [tm] = await db
        .select({
          id: teamMembers.id,
          teamId: teamMembers.teamId,
        })
        .from(teamMembers)
        .where(eq(teamMembers.id, teamMemberId))

      if (!tm) {
        throw new Error('Team member not found')
      }

      const [team] = await db
        .select({ organizationId: teams.organizationId })
        .from(teams)
        .where(eq(teams.id, tm.teamId))

      if (!team || team.organizationId !== orgMember.organizationId) {
        throw new Error('Team member not found')
      }

      await db.delete(teamMembers).where(eq(teamMembers.id, teamMemberId))

      return { success: true }
    }
  )
