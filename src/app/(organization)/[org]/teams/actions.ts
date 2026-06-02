'use server'

import { headers } from 'next/headers'
import { teamService } from '@/app/api/teams/service'
import { orgScopedActionClient } from '@/lib/safe-action'
import { auth } from '@/server/auth'
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

export const inviteOrgMemberAction = orgScopedActionClient
  .metadata({ authorize: { member: ['create'] } })
  .inputSchema(inviteOrgMemberSchema)
  .action(
    async ({
      parsedInput: {
        organizationId,
        email,
        role: inviteRole,
        payRate,
        payCurrency,
        payFrequency,
        billingRate,
        billingCurrency,
        billingFrequency,
        setAsOrgDefault,
      },
    }) => {
      if ((payRate !== undefined) !== !!payCurrency) {
        throw new Error('Pay rate and currency must be provided together')
      }
      const result = await auth.api.createInvitation({
        headers: await headers(),
        body: { email, role: inviteRole, organizationId },
      })
      if (payRate !== undefined && payCurrency) {
        await teamService.recordInvitePendingRate({
          invitationId: result.id,
          organizationId,
          email,
          payRate,
          payCurrency,
          payFrequency,
          billingRate,
          billingCurrency,
          billingFrequency,
          setAsOrgDefault,
        })
      }

      return { success: true }
    }
  )

export const removeOrgMemberAction = orgScopedActionClient
  .metadata({ authorize: { member: ['delete'] } })
  .inputSchema(removeOrgMemberSchema)
  .action(async ({ parsedInput: { memberId }, ctx: { orgMember } }) => {
    await teamService.assertMemberInOrg(memberId, orgMember.organizationId)

    await auth.api.removeMember({
      headers: await headers(),
      body: { memberIdOrEmail: memberId },
    })

    return { success: true }
  })

export const changeOrgMemberRoleAction = orgScopedActionClient
  .metadata({ authorize: { member: ['update'] } })
  .inputSchema(changeOrgMemberRoleSchema)
  .action(
    async ({
      parsedInput: { memberId, role: newRole },
      ctx: { orgMember },
    }) => {
      await teamService.assertMemberInOrg(memberId, orgMember.organizationId)

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

export const createTeamAction = orgScopedActionClient
  .metadata({ authorize: { team: ['create'] } })
  .inputSchema(createTeamSchema)
  .action(async ({ parsedInput: { organizationId, name } }) => {
    const team = await auth.api.createTeam({
      headers: await headers(),
      body: { name, organizationId },
    })

    return team
  })

export const renameTeamAction = orgScopedActionClient
  .metadata({ authorize: { team: ['update'] } })
  .inputSchema(renameTeamSchema)
  .action(({ parsedInput: { teamId, name }, ctx: { orgMember } }) =>
    teamService.renameTeam({
      teamId,
      name,
      organizationId: orgMember.organizationId,
    })
  )

export const deleteTeamAction = orgScopedActionClient
  .metadata({ authorize: { team: ['delete'] } })
  .inputSchema(deleteTeamSchema)
  .action(({ parsedInput: { teamId }, ctx: { orgMember } }) =>
    teamService.deleteTeam({ teamId, organizationId: orgMember.organizationId })
  )

export const addTeamMemberAction = orgScopedActionClient
  .metadata({ authorize: { team: ['update'] } })
  .inputSchema(addTeamMemberSchema)
  .action(async ({ parsedInput: { teamId, userId }, ctx: { orgMember } }) => {
    await teamService.assertTeamMemberAddable({
      teamId,
      userId,
      organizationId: orgMember.organizationId,
    })

    await auth.api.addTeamMember({
      headers: await headers(),
      body: { teamId, userId },
    })

    return { success: true }
  })

export const removeTeamMemberAction = orgScopedActionClient
  .metadata({ authorize: { team: ['update'] } })
  .inputSchema(removeTeamMemberSchema)
  .action(({ parsedInput: { teamMemberId }, ctx: { orgMember } }) =>
    teamService.removeTeamMember({
      teamMemberId,
      organizationId: orgMember.organizationId,
    })
  )
