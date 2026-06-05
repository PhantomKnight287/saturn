import { and, eq } from 'drizzle-orm'
import { polarClient } from '@/lib/polar'
import { db } from '@/server/db'
import { members } from '@/server/db/schema'

const ACTIVE_STATUSES = new Set(['active', 'trialing'])

export const getOrganizationBillingStatus = async (organizationId: string) => {
  const [owner] = await db
    .select()
    .from(members)
    .where(
      and(eq(members.role, 'owner'), eq(members.organizationId, organizationId))
    )
  if (!owner) {
    return null
  }
  const data = await polarClient.subscriptions.list({
    metadata: { referenceId: owner.userId },
  })
  const hasActiveSubscription = data?.result?.items.some((sub) =>
    ACTIVE_STATUSES.has(sub.status)
  )
  return hasActiveSubscription
}

export const getUserBillingStatus = async (userId: string) => {
  const data = await polarClient.subscriptions.list({
    metadata: { referenceId: userId },
  })
  const hasActiveSubscription =
    data?.result?.items.some((sub) => ACTIVE_STATUSES.has(sub.status)) ?? false
  return hasActiveSubscription
}
