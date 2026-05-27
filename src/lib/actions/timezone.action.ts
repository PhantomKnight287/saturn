'use server'

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { actionClient } from '@/lib/safe-action'
import { getSession } from '@/server/auth'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'

// Auth-only (not authedActionClient): a freshly signed-up user has no active
// organization yet, but still needs their timezone recorded.
export const updateTimezoneAction = actionClient
  .inputSchema(z.object({ timezone: z.string().min(1).max(64) }))
  .action(async ({ parsedInput: { timezone } }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('Not authenticated')
    }
    await db
      .update(users)
      .set({ timezone })
      .where(eq(users.id, session.user.id))
  })
