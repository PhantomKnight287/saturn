export const BillingCacheKeys = {
  getOrganizationBillingStatus: (orgId: string) => [`subscription-${orgId}`],
}
