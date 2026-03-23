import { redirect } from 'next/navigation'
import { resolveOrgContext } from '../cache'
import { SettingsPageClient } from './page.client'

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
  const metadata = organization.metadata
    ? JSON.parse(organization.metadata as string)
    : {}

  return (
    <SettingsPageClient
      canDelete={canDelete}
      defaultCurrency={metadata.defaultCurrency ?? 'USD'}
      defaultMemberRate={metadata.defaultMemberRate ?? 0}
      organization={{
        id: organization.id,
        name: organization.name,
        slug: organization.slug ?? '',
      }}
      orgSlug={org}
    />
  )
}
