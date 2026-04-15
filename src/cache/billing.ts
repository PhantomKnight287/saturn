import { memoize } from 'nextjs-better-unstable-cache'
import { polarClient } from '@/lib/polar'

export const getOrganizationBillingStatus = memoize(
  async (organizationId: string) => {
    const data = await polarClient.subscriptions.list({
      metadata: { referenceId: organizationId },
    })
    return data
  },
  {
    /// 1 hr
    duration: 3600,
    revalidateTags: (orgId) => [`subsciption-${orgId}`],
    log: ['verbose'],
    logid: 'Organization Billing Status',
  }
)
