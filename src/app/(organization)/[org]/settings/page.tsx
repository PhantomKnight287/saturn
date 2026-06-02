import type { Metadata } from 'next'
import { projectsService } from '@/app/api/projects/service'
import { createMetadata } from '@/lib/metadata'
import { customFieldsService } from '@/server/custom-fields/service'
import { requirePermission, resolveOrgContext } from '../cache'
import { SettingsPageClient } from './page.client'

export const metadata: Metadata = createMetadata({
  title: 'Workspace Settings',
  description: 'Configure workspace defaults, billing, and preferences.',
  openGraph: {
    images: ['/api/og?page=Settings'],
  },
  twitter: {
    images: ['/api/og?page=Settings'],
  },
})

export default async function SettingsPage({
  params,
}: PageProps<'/[org]/settings'>) {
  const { org } = await params
  const { organization, role } = await resolveOrgContext(org)

  requirePermission(
    role,
    { organization: ['update'] },
    'You do not have permission to view settings'
  )

  const canDelete = role.authorize({ organization: ['delete'] }).success

  const settings = await projectsService.getSettings(organization.id)

  const orgCustomFields = await customFieldsService.getOrgFields(
    organization.id
  )

  return (
    <SettingsPageClient
      canDelete={canDelete}
      clientInvolvement={settings.clientInvolvement}
      customFields={orgCustomFields}
      defaultBillingCurrency={settings.billingCurrency}
      defaultBillingFrequency={settings.billingFrequency}
      defaultBillingRate={settings.billingRate}
      defaultPayCurrency={settings.payCurrency}
      defaultPayFrequency={settings.payFrequency}
      defaultPayRate={settings.payRate}
      defaultTimesheetDuration={settings.timesheetDuration}
      invoiceFromAddress={settings.invoiceFromAddress}
      invoiceFromName={settings.invoiceFromName}
      invoiceNumberTemplate={settings.invoiceNumberTemplate}
      invoiceTimeUnit={settings.invoiceTimeUnit}
      organization={organization}
      orgSlug={org}
    />
  )
}
