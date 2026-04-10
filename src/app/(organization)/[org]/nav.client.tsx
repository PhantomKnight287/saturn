'use client'

import {
  Briefcase,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  FileText,
  Folder,
  LayoutDashboard,
  Milestone,
  Receipt,
  Settings,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { RouteImpl } from '@/types'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Overview: LayoutDashboard,
  Requirements: ClipboardList,
  Proposals: FileText,
  Milestones: Milestone,
  Timesheets: Clock,
  Expenses: Receipt,
  Invoices: FileSpreadsheet,
  Team: Users,
  Settings,
  Projects: Folder,
  Teams: Users,
  Clients: Briefcase,
}

export default function OrgNavClient({
  tab,
  slug,
}: {
  tab: {
    name: string
    href: string
    visible: boolean
  }
  slug: string
}) {
  const pathname = usePathname()
  const Icon = iconMap[tab.name]
  return (
    <Link
      className={cn(
        'flex items-center gap-1.5 border-b-2 px-3 py-2 font-medium text-sm transition-colors',
        pathname === tab.href ||
          (`/${slug}` !== tab.href && pathname.startsWith(tab.href))
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
      )}
      href={tab.href as RouteImpl}
      key={tab.name}
    >
      {Icon && <Icon className='size-4' />}
      {tab.name}
    </Link>
  )
}
