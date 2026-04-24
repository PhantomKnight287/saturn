import type { Metadata } from 'next'
import { projectsService } from '@/app/api/projects/service'
import { createMetadata } from '@/lib/metadata'
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

  return (
    <SettingsPageClient
      canDelete={canDelete}
      clientInvolvement={settings.clientInvolvement}
      defaultCurrency={settings.currency}
      defaultMemberRate={settings.memberRate}
      defaultTimesheetDuration={settings.timesheetDuration}
      invoiceNumberTemplate={settings.invoiceNumberTemplate}
      organization={organization}
      orgSlug={org}
    />
  )
}
