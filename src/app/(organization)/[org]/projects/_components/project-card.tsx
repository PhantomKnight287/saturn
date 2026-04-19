import { differenceInDays, format, formatDistanceToNow, isPast } from 'date-fns'
import { AlertTriangleIcon, CircleCheckIcon, ClockIcon } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { projects } from '@/server/db/schema'
import ProjectBanner from './project-banner'
import ProjectStatusBadge from './project-status-badge'

function DueDateBadge({ dueDate }: { dueDate: Date }) {
  const now = new Date()
  const overdue = isPast(dueDate)
  const daysLeft = differenceInDays(dueDate, now)
  const urgent = !overdue && daysLeft <= 7

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-medium text-xs',
        overdue && 'bg-destructive/10 text-destructive',
        urgent &&
          !overdue &&
          'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        !(overdue || urgent) && 'bg-muted text-muted-foreground'
      )}
    >
      {overdue ? (
        <AlertTriangleIcon className='size-3' />
      ) : urgent ? (
        <ClockIcon className='size-3' />
      ) : (
        <CircleCheckIcon className='size-3' />
      )}
      <span>
        {overdue
          ? `Overdue by ${formatDistanceToNow(dueDate)}`
          : `Due ${format(dueDate, 'MMM d')}`}
      </span>
    </div>
  )
}

export default function ProjectCard({
  project,
  orgSlug,
}: {
  project: typeof projects.$inferSelect
  orgSlug: string
}) {
  return (
    <Link className='h-full' href={`/${orgSlug}/${project.slug}`}>
      <Card className='flex h-full cursor-pointer flex-col gap-0 overflow-hidden py-0 transition-colors hover:border-primary/50'>
        <ProjectBanner seed={project.id} />
        <div className='flex flex-1 flex-col p-4'>
          <div className='flex items-center justify-between gap-2'>
            <h3 className='truncate font-semibold'>{project.name}</h3>
            <span className='shrink-0 font-mono text-muted-foreground text-xs'>
              {project.slug}
            </span>
          </div>
          <p className='mt-1.5 line-clamp-2 flex-1 text-muted-foreground text-sm'>
            {project.description || 'No description'}
          </p>
          <div className='mt-1.5 flex max-h-6 flex-row items-end gap-2'>
            {project.dueDate &&
              (project.status === 'in-progress' ||
                project.status === 'planning') && (
                <div className='mt-3'>
                  <DueDateBadge dueDate={new Date(project.dueDate)} />
                </div>
              )}
            <ProjectStatusBadge status={project.status!} />
          </div>
        </div>
      </Card>
    </Link>
  )
}
