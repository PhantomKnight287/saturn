'use server'

import { eq } from 'drizzle-orm'
import { createSafeActionClient } from 'next-safe-action'
import z from 'zod'
import { getSession } from '@/server/auth'
import { db } from '@/server/db'
import { members } from '@/server/db/schema/auth'
import {
  projectClientAssignments,
  projectInvitations,
  projectMemberAssignments,
} from '@/server/db/schema/project'

const authedClient = createSafeActionClient().use(async ({ next }) => {
  const session = await getSession()
  if (!session) {
    throw new Error('Not authenticated')
  }
  return next({ ctx: { user: session.user } })
})

const acceptInviteSchema = z.object({
  invitationId: z.string().min(1),
  projectId: z.string().min(1),
  type: z.enum(['member', 'client']),
})

export const acceptInviteAction = authedClient
  .inputSchema(acceptInviteSchema)
  .action(async ({ parsedInput: { invitationId, projectId, type }, ctx }) => {
    // Find the member record for this user in the org
    // (Better Auth just created it via acceptInvitation)
    const memberRecords = await db
      .select()
      .from(members)
      .where(eq(members.userId, ctx.user.id))

    // Find which member belongs to the same org as the project
    // We pick the most recently created one since it was just added
    const sortedMembers = memberRecords.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
    const member = sortedMembers[0]

    if (!member) {
      throw new Error('Could not find your membership')
    }

    await db.transaction(async (tx) => {
      if (type === 'client') {
        await tx
          .insert(projectClientAssignments)
          .values({ projectId, memberId: member.id })
          .onConflictDoNothing()
      } else {
        await tx
          .insert(projectMemberAssignments)
          .values({ projectId, memberId: member.id })
          .onConflictDoNothing()
      }

      // Clean up the invitation link
      await tx
        .delete(projectInvitations)
        .where(eq(projectInvitations.invitationId, invitationId))
    })

    return { success: true }
  })
