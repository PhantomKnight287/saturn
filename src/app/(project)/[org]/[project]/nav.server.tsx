import { headers } from 'next/headers'
import { getCachedActiveOrgMember } from '@/app/(organization)/[org]/cache'
import OrgNavClient from '@/app/(organization)/[org]/nav.client'
import { authClient } from '@/lib/auth-client'

export default async function OrgNavServer({ slug }: { slug: string }) {
  let member: Awaited<ReturnType<typeof getCachedActiveOrgMember>>
  member = await getCachedActiveOrgMember(await headers(), '0')
  if (member == null) {
    await authClient.organization.setActive({
      organizationSlug: slug,
      fetchOptions: {
        headers: await headers(),
      },
    })
    member = await getCachedActiveOrgMember(await headers(), '1')
  }

  const role = member?.role as string

  const navTabs = [
    { name: 'Overview', href: `/${slug}`, visible: true },
    {
      name: 'Requirements',
      href: `/${slug}/requirements`,
      visible: ['owner', 'admin', 'member', 'client'].includes(role),
    },
    {
      name: 'Proposals',
      href: `/${slug}/proposals`,
      visible: ['owner', 'admin', 'member', 'client'].includes(role),
    },
    {
      name: 'Milestones',
      href: `/${slug}/milestones`,
      visible: ['owner', 'admin', 'member', 'client'].includes(role),
    },
    {
      name: 'Timesheets',
      href: `/${slug}/timesheets`,
      visible: ['owner', 'admin', 'member', 'client'].includes(role),
    },
    {
      name: 'Expenses',
      href: `/${slug}/expenses`,
      visible: ['owner', 'admin', 'client', 'member'].includes(role),
    },
    {
      name: 'Invoices',
      href: `/${slug}/invoices`,
      visible: ['owner', 'admin', 'client'].includes(role),
    },
    {
      name: 'Team',
      href: `/${slug}/team`,
      visible: ['owner', 'admin', 'member'].includes(role),
    },
    {
      name: 'Settings',
      href: `/${slug}/settings`,
      visible: ['owner', 'admin'].includes(role),
    },
  ]
  if (!member) {
    return null
  }

  return (
    <nav className='flex w-full flex-row items-center justify-start gap-2 border-border border-b bg-secondary px-4'>
      {navTabs
        .filter((tab) => tab.visible)
        .map((tab) => (
          <OrgNavClient key={tab.name} slug={slug} tab={tab} />
        ))}
    </nav>
  )
}
