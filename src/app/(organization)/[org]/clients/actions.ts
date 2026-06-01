'use server'

import { headers } from 'next/headers'
import { teamService } from '@/app/api/teams/service'
import { orgScopedActionClient } from '@/lib/safe-action'
import { auth } from '@/server/auth'
import {
  assignClientToProjectSchema,
  removeClientFromOrgSchema,
  removeClientFromProjectSchema,
} from './common'

export const assignClientToProjectAction = orgScopedActionClient
  .metadata({ authorize: { member: ['create'] } })
  .inputSchema(assignClientToProjectSchema)
  .action(({ parsedInput: { memberId, projectId }, ctx: { orgMember } }) =>
    teamService.assignClientToProject({
      memberId,
      projectId,
      organizationId: orgMember.organizationId,
    })
  )

export const removeClientFromProjectAction = orgScopedActionClient
  .metadata({ authorize: { member: ['delete'] } })
  .inputSchema(removeClientFromProjectSchema)
  .action(({ parsedInput: { assignmentId }, ctx: { orgMember } }) =>
    teamService.removeClientFromProject({
      assignmentId,
      organizationId: orgMember.organizationId,
    })
  )

export const removeClientFromOrgAction = orgScopedActionClient
  .metadata({ authorize: { member: ['delete'] } })
  .inputSchema(removeClientFromOrgSchema)
  .action(async ({ parsedInput: { memberId }, ctx: { orgMember } }) => {
    await teamService.clearClientAssignments({
      memberId,
      organizationId: orgMember.organizationId,
    })

    await auth.api.removeMember({
      headers: await headers(),
      body: { memberIdOrEmail: memberId },
    })

    return { success: true }
  })
