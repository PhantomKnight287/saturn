'use client'

import { ChevronsUpDown, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth-client'
import { logo } from '@/lib/constants'
import type { projects } from '@/server/db/schema'
import { NavUser } from './nav-user'

interface ApplicationHeaderProps {
  allOrganizations:
    | {
        id: string
        name: string
        createdAt: Date
        slug: string
        metadata?: Record<string, unknown>
        logo?: string | null | undefined
      }[]
    | null

  allProjects: (typeof projects.$inferSelect)[] | null
  organizationId: string
  organizationName: string
  organizationSlug: string
  projectName?: string | null
}

export function ApplicationHeader({
  organizationName,
  projectName,
  allOrganizations,
  allProjects,
  organizationSlug,
}: ApplicationHeaderProps) {
  const router = useRouter()
  const handleAddProject = () => {
    router.push(`/${organizationSlug}/projects?newProject=1`)
  }

  return (
    <div className='flex w-full items-center'>
      <div className='mr-2'>{logo}</div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label='Open workspace switcher'
            className='flex h-8 items-center gap-2 px-2 text-sm'
            size='sm'
            variant='ghost'
          >
            <Avatar className='h-5 w-5'>
              <AvatarFallback className='text-xs'>
                {organizationName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className='max-w-[120px] truncate font-medium text-sm'>
              {organizationName}
            </span>
            <ChevronsUpDown className='ml-1 h-4 w-4 opacity-70' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-56' sideOffset={4}>
          <DropdownMenuLabel className='text-muted-foreground text-xs'>
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {allOrganizations?.map((organization) => (
            <DropdownMenuItem
              asChild
              className='w-full gap-2 p-2'
              key={organization.id}
            >
              <Button
                className='flex w-full items-center justify-start gap-2 outline-none ring-0'
                onClick={async () => {
                  await authClient.organization.setActive({
                    organizationSlug: organization.slug,
                  })
                  router.replace(`/${organization.slug}`)
                }}
                variant={'ghost'}
              >
                <Avatar className='h-5 w-5'>
                  <AvatarFallback className='text-xs'>
                    {organization.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {organization.name}
              </Button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem asChild>
            <Link className='gap-2 p-2' href='/onboarding'>
              <Plus className='h-4 w-4' />
              Add Organization
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {projectName && (
        <>
          <span className='mx-1 select-none font-light text-muted-foreground/50 text-xl'>
            /
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label='Open team switcher'
                className='flex h-8 items-center gap-2 px-2 text-sm'
                size='sm'
                variant='ghost'
              >
                <div className='h-2 w-2 rounded-full bg-blue-500' />
                <span className='max-w-[120px] truncate font-medium text-sm'>
                  {projectName}
                </span>
                <ChevronsUpDown className='ml-1 h-4 w-4 opacity-70' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='w-56' sideOffset={4}>
              <DropdownMenuLabel className='text-muted-foreground text-xs'>
                Projects
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allProjects?.map((project) => (
                <DropdownMenuItem className='w-full gap-2 p-2' key={project.id}>
                  <Link
                    className='w-full'
                    href={`/${organizationSlug}/${project.slug}`}
                  >
                    {project.name}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                className='cursor-pointer gap-2 p-2'
                onClick={handleAddProject}
              >
                <Plus className='h-4 w-4' />
                Add Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      <div className='ml-auto'>
        <NavUser />
      </div>
    </div>
  )
}
