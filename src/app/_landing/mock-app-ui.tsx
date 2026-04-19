import {
  Briefcase,
  ChevronDown,
  Clock,
  FileSpreadsheet,
  Folder,
  LayoutDashboard,
  Users,
} from 'lucide-react'
import Image from 'next/image'
import ProjectBanner from '@/app/(organization)/[org]/projects/_components/project-banner'
import { SaturnLogo } from '@/components/icons/saturn-logo'

function MockNav() {
  const tabs = [
    { name: 'Overview', icon: LayoutDashboard, active: false },
    { name: 'Projects', icon: Folder, active: true },
    { name: 'Teams', icon: Users, active: false },
    { name: 'Clients', icon: Briefcase, active: false },
    { name: 'Invoices', icon: FileSpreadsheet, active: false },
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

function MockProjectCard({
  name,
  slug,
  desc,
  due,
}: {
  name: string
  slug: string
  desc: string
  due?: string
}) {
  return (
    <div className='overflow-hidden rounded-xl border border-border bg-muted/30 transition-colors'>
      <ProjectBanner className='h-24 w-full rounded-t-xl' seed={name} />
      <div className='p-3.5'>
        <div className='flex items-center justify-between gap-2'>
          <span className='truncate font-semibold text-foreground text-sm'>
            {name}
          </span>
          <span className='shrink-0 font-mono text-[10px] text-muted-foreground/60'>
            {slug}
          </span>
        </div>
        <p className='mt-1 line-clamp-2 text-muted-foreground text-xs'>
          {desc}
        </p>
        {due && (
          <div className='mt-2.5 inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground'>
            <Clock className='size-2.5' />
            Due {due}
          </div>
        )}
      </div>
    </div>
  )
}

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
        <div className='grid grid-cols-2 gap-3'>
          <MockProjectCard
            desc='Complete overhaul of the company website with new branding'
            due='Apr 18'
            name='Website Redesign'
            slug='web-rdsn'
          />
          <MockProjectCard
            desc='Cross-platform mobile application for client portal'
            due='May 2'
            name='Mobile App MVP'
            slug='mob-mvp'
          />
        </div>
      </div>
    </div>
  )
}
