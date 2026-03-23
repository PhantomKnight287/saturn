import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'

export default async function ProjectPage({
  params,
}: PageProps<'/[org]/[project]'>) {
  const { org, project: projectSlug } = await params
  const { role } = await resolveProjectContext(org, projectSlug)

  if (!role.authorize({ project: ['read'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to view projects')}`
    )
  }

  return null
}
