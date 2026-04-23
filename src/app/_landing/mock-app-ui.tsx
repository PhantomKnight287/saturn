import {
  Briefcase,
  ChevronDown,
  Folder,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react'
import Image from 'next/image'
import ProjectCard from '@/app/(organization)/[org]/projects/_components/project-card'
import { SaturnLogo } from '@/components/icons/saturn-logo'
import type { projects } from '@/server/db/schema'

function MockNav() {
  const tabs = [
    { name: 'Overview', icon: LayoutDashboard, active: false },
    { name: 'Projects', icon: Folder, active: true },
    { name: 'Teams', icon: Users, active: false },
    { name: 'Clients', icon: Briefcase, active: false },
    { name: 'Settings', icon: Settings, active: false },
  ]

  return (
    <div className='flex flex-col'>
      <div className='flex items-center gap-2 border-border/60 border-b bg-muted/30 px-4 py-2.5'>
        <SaturnLogo className='size-4' />
        <span className='flex items-center gap-1.5 rounded-md px-2 py-1 text-foreground/80 text-sm hover:bg-muted/50'>
          Acme Agency
          <ChevronDown className='size-3 opacity-50' />
        </span>
        <div className='ml-auto flex items-center gap-2'>
          <Image
            alt=''
            className='size-7 rounded-full'
            height={28}
            src='https://github.com/phantomknight287.png'
            width={28}
          />
        </div>
      </div>
      <nav className='flex items-center gap-1 border-border/60 border-b bg-muted/30 px-4'>
        {tabs.map((tab) => (
          <span
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 font-medium text-xs transition-colors ${
              tab.active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            }`}
            key={tab.name}
          >
            <tab.icon className='size-3.5' />
            {tab.name}
          </span>
        ))}
      </nav>
    </div>
  )
}

type MockProject = typeof projects.$inferSelect

const now = new Date()
const daysFromNow = (days: number) =>
  new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

const mockProjects: MockProject[] = [
  {
    id: 'id-1',
    name: 'Website Redesign',
    description: 'Complete overhaul of the company website with new branding.',
    slug: 'web-rdsn',
    organizationId: 'org_mock',
    status: 'in-progress',
    dueDate: daysFromNow(5),
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'another-id-2',
    name: 'Mobile App MVP',
    description: 'Cross-platform mobile application for the client portal.',
    slug: 'mob-mvp',
    organizationId: 'org_mock',
    status: 'in-progress',
    dueDate: daysFromNow(21),
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-id-3',
    name: 'Brand Identity',
    description: 'Logo system, typography, and guidelines for launch.',
    slug: 'brand-id',
    organizationId: 'org_mock',
    status: 'planning',
    dueDate: daysFromNow(40),
    createdAt: now,
    updatedAt: now,
  },
]

export function MockAppUI() {
  return (
    <div className='hidden overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10 md:block'>
      <MockNav />
      <div className='p-6'>
        <div className='mb-5 flex items-center justify-between'>
          <span className='font-semibold text-base text-foreground'>
            Projects
          </span>
          <span className='rounded-md bg-primary/15 px-2.5 py-1 font-medium text-primary text-xs'>
            + New Project
          </span>
        </div>
        <div
          aria-hidden
          className='pointer-events-none grid grid-cols-2 gap-3 lg:grid-cols-3 [&_a]:cursor-default'
        >
          {mockProjects.map((project) => (
            <ProjectCard key={project.id} orgSlug='acme' project={project} />
          ))}
        </div>
      </div>
    </div>
  )
}
