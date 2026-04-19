import { and, eq } from 'drizzle-orm'
import { memoize } from 'nextjs-better-unstable-cache'
import { polarClient } from '@/lib/polar'
import { db } from '@/server/db'
import { members } from '@/server/db/schema'
import { BillingCacheKeys } from './keys'

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
    return data
  },
  {
    /// 1 hr
    duration: 3600,
    revalidateTags: (orgId) =>
      BillingCacheKeys.getOrganizationBillingStatus(orgId),
    log: ['verbose'],
    logid: 'Organization Billing Status',
  }
)
