import { and, eq } from 'drizzle-orm'
import { memoize } from 'nextjs-better-unstable-cache'
import { polarClient } from '@/lib/polar'
import { db } from '@/server/db'
import { members } from '@/server/db/schema'
import { BillingCacheKeys } from './keys'

const ACTIVE_STATUSES = new Set(['active', 'trialing'])

export const getOrganizationBillingStatus = memoize(
  async (organizationId: string) => {
    const [owner] = await db
      .select()
      .from(members)
      .where(
        and(
          eq(members.role, 'owner'),
          eq(members.organizationId, organizationId)
        )
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
  },
  {
    duration: 3600,
    revalidateTags: (orgId) =>
      BillingCacheKeys.getOrganizationBillingStatus(orgId),
    log: ['verbose'],
    logid: 'Organization Billing Status',
  }
)

export const getUserBillingStatus = memoize(
  async (userId: string) => {
    const data = await polarClient.subscriptions.list({
      metadata: { referenceId: userId },
    })
    const hasActiveSubscription =
      data?.result?.items.some((sub) => ACTIVE_STATUSES.has(sub.status)) ??
      false
    return hasActiveSubscription
  },
  {
    duration: 3600,
    revalidateTags: (orgId) => BillingCacheKeys.getUserBillingStatus(orgId),
    log: ['verbose'],
    logid: 'User Billing Status',
  }
)
