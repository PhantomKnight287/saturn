'use server'

import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { authedActionClient } from '@/lib/safe-action'
import { auth } from '@/server/auth'
import { db } from '@/server/db'
import { members } from '@/server/db/schema/auth'
import {
  projectClientAssignments,
  projectMemberAssignments,
} from '@/server/db/schema/project'
import {
  assignClientToProjectSchema,
  removeClientFromOrgSchema,
  removeClientFromProjectSchema,
} from './common'

export const assignClientToProjectAction = authedActionClient
  .inputSchema(assignClientToProjectSchema)
  .action(
    async ({
      parsedInput: { memberId, projectId },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ member: ['create'] }).success) {
        throw new Error('You do not have permission to assign clients')
      }

      const [member] = await db
        .select({
          id: members.id,
          organizationId: members.organizationId,
          role: members.role,
        })
        .from(members)
        .where(eq(members.id, memberId))

      if (!member || member.organizationId !== orgMember.organizationId) {
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
  )

export const removeClientFromProjectAction = authedActionClient
  .inputSchema(removeClientFromProjectSchema)
  .action(
    async ({ parsedInput: { assignmentId }, ctx: { role, orgMember } }) => {
      if (!role.authorize({ member: ['delete'] }).success) {
        throw new Error('You do not have permission to remove clients')
      }

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
            eq(members.organizationId, orgMember.organizationId)
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
  )

export const removeClientFromOrgAction = authedActionClient
  .inputSchema(removeClientFromOrgSchema)
  .action(async ({ parsedInput: { memberId }, ctx: { role, orgMember } }) => {
    if (!role.authorize({ member: ['delete'] }).success) {
      throw new Error('You do not have permission to remove clients')
    }

    const [member] = await db
      .select({
        id: members.id,
        organizationId: members.organizationId,
        role: members.role,
      })
      .from(members)
      .where(eq(members.id, memberId))

    if (!member || member.organizationId !== orgMember.organizationId) {
      throw new Error('Client not found')
    }

    if (member.role !== 'client') {
      throw new Error('Member is not a client')
    }

    // Remove all project assignments first
    await db
      .delete(projectClientAssignments)
      .where(eq(projectClientAssignments.memberId, memberId))

    await db
      .delete(projectMemberAssignments)
      .where(eq(projectMemberAssignments.memberId, memberId))

    // Remove from org
    await auth.api.removeMember({
      headers: await headers(),
      body: { memberIdOrEmail: memberId },
    })

    return { success: true }
  })
