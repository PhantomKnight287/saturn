import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ApplicationHeader } from '@/components/application-header'
import { Separator } from '@/components/ui/separator'
import { authClient } from '@/lib/auth-client'
import { getCachedOrganization, getCachedUserSession } from './cache'
import OrgNavServer from './nav.server'

export default async function OrganizationLayout({
  children,
  params,
}: LayoutProps<'/[org]'>) {
  const { org } = await params
  const session = await getCachedUserSession()
  if (!session) {
    return redirect(`/auth/sign-in?redirectTo=${encodeURIComponent(`/${org}`)}`)
  }
  const organization = await getCachedOrganization(org, await headers())

  if (!organization) {
    redirect(`/onboarding?redirectTo=/${org}`)
  }

  const allOrganizations = await authClient.organization.list(
    {},
    { headers: await headers() }
  )

  return (
    <div className='flex flex-1 flex-col'>
      <header className='flex w-full shrink-0 flex-col items-center bg-secondary transition-[width,height] ease-linear'>
        <div className='flex w-full items-center gap-2 px-4'>
          <ApplicationHeader
            allOrganizations={allOrganizations.data}
            allProjects={[]}
            organizationId={organization?.id}
            organizationName={organization?.name}
            organizationSlug={org}
            projectName={null}
          />
        </div>
        <Separator className='w-full bg-accent' />

        <OrgNavServer slug={org} />
      </header>
      <div className='flex w-full items-center justify-center'>
        <div className='flex max-w-7xl flex-1 items-center justify-center p-4'>
          {children}
        </div>
      </div>
    </div>
  )
}
