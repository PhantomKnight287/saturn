export const BillingCacheKeys = {
  getOrganizationBillingStatus: (orgId: string) => [`subscription-${orgId}`],
  getUserBillingStatus: (userId: string) => [`user-billing-${userId}`],
}
