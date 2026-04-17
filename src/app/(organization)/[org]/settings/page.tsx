import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { projectsService } from '@/app/api/projects/service'
import { createMetadata } from '@/lib/metadata'
import { resolveOrgContext } from '../cache'
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

  if (!role.authorize({ organization: ['update'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to view settings')}`
    )
  }

  const canDelete = role.authorize({ organization: ['delete'] }).success

  const settings = await projectsService.getSettings(organization.id)

  return (
    <SettingsPageClient
      canDelete={canDelete}
      defaultCurrency={settings.defaultCurrency}
      defaultMemberRate={settings.defaultMemberRate}
      defaultTimesheetDuration={settings.defaultTimesheetDuration}
      organization={organization}
      orgSlug={org}
    />
  )
}
