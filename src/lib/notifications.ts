import { and, eq, inArray } from 'drizzle-orm'
import { createLogger } from 'evlog'
import { db } from '@/server/db'
import { members, users } from '@/server/db/schema'
import { emailService } from '@/services/email.service'

const log = createLogger({ module: 'notifications' })

/**
 * Fetch all admin and owner members for an organization with their email/name.
 */
export async function getAdminsAndOwners(organizationId: string) {
  return await db
    .select({ email: users.email, name: users.name })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(
      and(
        eq(members.organizationId, organizationId),
        inArray(members.role, ['admin', 'owner'])
      )
    )
}

/**
 * Send an email to each recipient, logging failures instead of silently swallowing them.
 * Uses Promise.allSettled so individual failures don't block others.
 */
export async function sendEmailsToRecipients(
  recipients: Array<{ email: string; name: string | null }>,
  buildEmail: (recipient: {
    email: string
    name: string | null
  }) => Promise<{ to: string; subject: string; html: string }>
) {
  const results = await Promise.allSettled(
    recipients.map(async (recipient) => {
      const emailParams = await buildEmail(recipient)
      return emailService.sendEmail(emailParams)
    })
  )

  for (const result of results) {
    if (result.status === 'rejected') {
      log.error('Failed to send notification email', {
        error: String(result.reason),
      })
    }
  }
}
