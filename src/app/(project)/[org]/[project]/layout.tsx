import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  getCachedActiveOrgMember,
  getCachedOrganization,
  getCachedUserSession,
} from '@/app/(organization)/[org]/cache'
import { projectsService } from '@/app/api/projects/service'
import { ApplicationHeader } from '@/components/application-header'
import { FloatingTimer } from '@/components/floating-timer'
import { Separator } from '@/components/ui/separator'
import { authClient } from '@/lib/auth-client'
import OrgNavServer from './nav.server'

export default async function ProjectLayout({
  children,
  params,
}: LayoutProps<'/[org]/[project]'>) {
  const { org, project: projectSlug } = await params
  const session = await getCachedUserSession()
  if (!session) {
    return redirect(
      `/auth/sign-in?redirectTo=${encodeURIComponent(`/${org}/${projectSlug}`)}`
    )
  }

  const organization = await getCachedOrganization(org, await headers())
  if (!organization) {
    return redirect(
      `/error/404?message=${encodeURIComponent('Workspace not found')}`
    )
  }

  const orgMember = await getCachedActiveOrgMember(await headers())
  if (!orgMember) {
    return redirect(
      `/error/403?message=${encodeURIComponent('You are not a member of this workspace')}`
    )
  }

  const [allOrganizations, allProjects, currentProject] = await Promise.all([
    authClient.organization.list({}, { headers: await headers() }),
    projectsService.listAccessible(organization.id, orgMember),
    projectsService.getBySlug(organization.id, projectSlug),
  ])

  if (!currentProject) {
    return redirect(
      `/error/404?message=${encodeURIComponent('Project not found')}`
    )
  }

  return (
    <div className='flex flex-1 flex-col'>
      <header className='flex w-full shrink-0 flex-col items-center bg-secondary transition-[width,height] ease-linear'>
        <div className='flex w-full items-center gap-2 px-4'>
          <ApplicationHeader
            allOrganizations={allOrganizations.data}
            allProjects={allProjects}
            organizationId={organization.id}
            organizationName={organization.name}
            organizationSlug={org}
            projectName={currentProject.name}
          />
        </div>
        <Separator className='w-full bg-accent' />
        <OrgNavServer slug={`${org}/${projectSlug}`} />
      </header>
      <div className='flex w-full items-center justify-center'>
        <div className='flex max-w-7xl flex-1 items-center justify-center p-4'>
          {children}
        </div>
      </div>
      <FloatingTimer />
    </div>
  )
}
