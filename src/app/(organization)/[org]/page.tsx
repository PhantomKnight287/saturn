import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { getSession } from '@/server/auth'

export default async function OrganizationPage(props: PageProps<'/[org]'>) {
  const { org } = await props.params
  const session = await getSession()
  if (!session) {
    redirect(`/auth/sign-in?callback=${encodeURIComponent(`/${org}`)}`)
  }

  console.log('org', org)
  const organization = await authClient.organization.getFullOrganization(
    {
      query: { organizationSlug: org },
    },
    { headers: await headers() }
  )
  if (!organization.data) {
    return notFound()
  }
  const teams = await authClient.organization.listTeams(
    {
      query: { organizationId: organization.data?.id },
    },
    { headers: await headers() }
  )
  if (teams.data?.length === 0) {
    return redirect(
      `/error?message=${encodeURIComponent('No teams found. Please ask your admin to add you to a team')}`
    )
  }
  return <div>OrganizationPage</div>
}
