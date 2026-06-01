'use server'

import { headers } from 'next/headers'
import { teamService } from '@/app/api/teams/service'
import {
  orgScopedActionClient,
  projectScopedActionClient,
} from '@/lib/safe-action'
import { auth } from '@/server/auth'
import {
  addExistingMemberToProjectSchema,
  assignTeamSchema,
  linkInvitationSchema,
  removeClientSchema,
  removeMemberSchema,
  unassignTeamSchema,
} from './common'

async function removeFromOrg(memberId: string) {
  await auth.api.removeMember({
    headers: await headers(),
    body: { memberIdOrEmail: memberId },
  })
}

export const linkInvitationToProjectAction = projectScopedActionClient
  .metadata({ authorize: { member: ['create'] } })
  .inputSchema(linkInvitationSchema)
  .action(({ parsedInput: { invitationId, projectId, type } }) =>
    teamService.linkInvitation({ invitationId, projectId, type })
  )

export const removeMemberAction = orgScopedActionClient
  .metadata({ authorize: { member: ['delete'] } })
  .inputSchema(removeMemberSchema)
  .action(async ({ parsedInput: { assignmentId }, ctx: { orgMember } }) => {
    const { memberId, shouldRemoveFromOrg } =
      await teamService.removeMemberAssignment({ assignmentId, orgMember })
    if (shouldRemoveFromOrg) {
      await removeFromOrg(memberId)
    }
    return { success: true }
  })

export const removeClientAction = orgScopedActionClient
  .metadata({ authorize: { member: ['delete'] } })
  .inputSchema(removeClientSchema)
  .action(async ({ parsedInput: { assignmentId }, ctx: { orgMember } }) => {
    const { memberId, shouldRemoveFromOrg } =
      await teamService.removeClientAssignment({ assignmentId, orgMember })
    if (shouldRemoveFromOrg) {
      await removeFromOrg(memberId)
    }
    return { success: true }
  })

export const assignTeamAction = projectScopedActionClient
  .metadata({ authorize: { team: ['update'] } })
  .inputSchema(assignTeamSchema)
  .action(({ parsedInput: { projectId, teamId }, ctx: { user } }) =>
    teamService.assignTeam({ projectId, teamId, assignedByName: user.name })
  )

export const unassignTeamAction = orgScopedActionClient
  .metadata({ authorize: { team: ['delete'] } })
  .inputSchema(unassignTeamSchema)
  .action(({ parsedInput: { assignmentId }, ctx: { orgMember } }) =>
    teamService.unassignTeam({ assignmentId, orgMember })
  )

export const addExistingMemberToProjectAction = projectScopedActionClient
  .metadata({ authorize: { member: ['create'] } })
  .inputSchema(addExistingMemberToProjectSchema)
  .action(({ parsedInput, ctx: { orgMember, project } }) =>
    teamService.addExistingMember({
      project,
      email: parsedInput.email,
      organizationId: orgMember.organizationId,
      type: parsedInput.type,
      payRate: parsedInput.payRate,
      payCurrency: parsedInput.payCurrency,
      payFrequency: parsedInput.payFrequency,
      billingRate: parsedInput.billingRate,
      billingCurrency: parsedInput.billingCurrency,
      billingFrequency: parsedInput.billingFrequency,
      setAsOrgDefault: parsedInput.setAsOrgDefault,
    })
  )
