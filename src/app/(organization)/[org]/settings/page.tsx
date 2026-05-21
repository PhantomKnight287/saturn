import { and, asc, eq, isNull } from 'drizzle-orm'
import type { Metadata } from 'next'
import { projectsService } from '@/app/api/projects/service'
import type { CustomFieldDefinition } from '@/lib/custom-fields'
import { createMetadata } from '@/lib/metadata'
import { db } from '@/server/db'
import { customFields } from '@/server/db/schema'
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

  const orgCustomFields: CustomFieldDefinition[] = await db
    .select()
    .from(customFields)
    .where(
      and(
        eq(customFields.organizationId, organization.id),
        isNull(customFields.projectId)
      )
    )
    .orderBy(asc(customFields.createdAt))

  return (
    <SettingsPageClient
      canDelete={canDelete}
      clientInvolvement={settings.clientInvolvement}
      customFields={orgCustomFields}
      defaultCurrency={settings.currency}
      defaultMemberRate={settings.memberRate}
      defaultTimesheetDuration={settings.timesheetDuration}
      invoiceNumberTemplate={settings.invoiceNumberTemplate}
      invoiceTimeUnit={settings.invoiceTimeUnit}
      organization={organization}
      orgSlug={org}
    />
  )
}
