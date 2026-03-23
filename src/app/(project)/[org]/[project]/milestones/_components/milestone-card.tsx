import { differenceInDays, format, formatDistanceToNow, isPast } from 'date-fns'
import {
  AlertOctagon,
  AlertTriangleIcon,
  CheckCircle2,
  Circle,
  CircleCheckIcon,
  Clock,
  ClockIcon,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { milestones } from '@/server/db/schema'

type Milestone = typeof milestones.$inferSelect & {
  progress: { total: number; signed: number }
}

function StatusIndicator({ status }: { status: Milestone['status'] }) {
  const config = {
    pending: {
      label: 'Pending',
      icon: Circle,
      className: 'bg-muted text-muted-foreground',
    },
    in_progress: {
      label: 'In Progress',
      icon: Loader2,
      className:
        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    },
    completed: {
      label: 'Completed',
      icon: CheckCircle2,
      className:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    blocked: {
      label: 'Blocked',
      icon: AlertOctagon,
      className: 'bg-destructive/10 text-destructive',
    },
  } as const

  const s = config[status]
  const Icon = s.icon

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-medium text-xs',
        s.className
      )}
    >
      <Icon className='size-3' />
      {s.label}
    </div>
  )
}

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

export function MilestoneCard({
  milestone,
  orgSlug,
  projectSlug,
}: {
  milestone: Milestone
  orgSlug: string
  projectSlug: string
  canUpdate: boolean
  canComplete: boolean
  canDelete: boolean
}) {
  const progressPercent =
    milestone.progress.total > 0
      ? Math.round((milestone.progress.signed / milestone.progress.total) * 100)
      : 0

  return (
    <Link
      className='h-full'
      href={`/${orgSlug}/${projectSlug}/milestones/${milestone.id}`}
    >
      <Card className='flex h-full cursor-pointer flex-col gap-0 p-4 transition-colors hover:border-primary/50'>
        <div className='flex items-center justify-between gap-2'>
          <h3 className='truncate font-semibold'>{milestone.name}</h3>
          <StatusIndicator status={milestone.status} />
        </div>

        <p className='mt-1.5 line-clamp-2 flex-1 text-muted-foreground text-sm'>
          {milestone.description || 'No description'}
        </p>

        {milestone.status === 'blocked' && milestone.blockReason && (
          <p className='mt-2 line-clamp-1 text-destructive text-xs'>
            Blocked: {milestone.blockReason}
          </p>
        )}

        {milestone.progress.total > 0 && (
          <div className='mt-3'>
            <div className='mb-1 flex items-center justify-between text-xs'>
              <span className='text-muted-foreground'>
                {milestone.progress.signed}/{milestone.progress.total}{' '}
                requirements signed
              </span>
              <span className='font-medium'>{progressPercent}%</span>
            </div>
            <div className='h-1.5 w-full overflow-hidden rounded-full bg-secondary'>
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary'
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className='mt-3 flex items-center gap-3'>
          {milestone.dueDate && (
            <DueDateBadge dueDate={new Date(milestone.dueDate)} />
          )}
          {milestone.budgetAmountCents != null && (
            <span className='inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs'>
              ${(milestone.budgetAmountCents / 100).toLocaleString()}
            </span>
          )}
          {milestone.budgetMinutes != null && (
            <span className='inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs'>
              <Clock className='size-3' />
              {Math.floor(milestone.budgetMinutes / 60)}h{' '}
              {milestone.budgetMinutes % 60}m
            </span>
          )}
        </div>
      </Card>
    </Link>
  )
}
