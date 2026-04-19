import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { projectStatus } from '@/server/db/schema'

export type ProjectStatusValue = (typeof projectStatus.enumValues)[number]

export const PROJECT_STATUS_VARIANTS: Record<
  ProjectStatusValue,
  { label: string; className: string }
> = {
  planning: {
    label: 'Planning',
    className: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
  },
  'in-progress': {
    label: 'In Progress',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  'on-hold': {
    label: 'On Hold',
    className:
      'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  },
  completed: {
    label: 'Completed',
    className:
      'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  },
  archived: {
    label: 'Archived',
    className:
      'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',
  },
}

export default function ProjectStatusBadge({
  status,
}: {
  status: ProjectStatusValue
}) {
  const variant = PROJECT_STATUS_VARIANTS[status]

  return (
    <Badge className={cn(variant.className)} variant='outline'>
      {variant.label}
    </Badge>
  )
}
