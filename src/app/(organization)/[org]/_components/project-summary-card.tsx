import { format, formatDistanceToNow, isPast } from 'date-fns'
import { AlertTriangleIcon, CalendarIcon, TrendingUp } from 'lucide-react'
import Link from 'next/link'

import {
  formatCurrency,
  sumByCurrency,
} from '@/components/dashboard/format-currency'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { RouteImpl } from '@/types'

interface Invoice {
  currency: string
  dueDate: Date | null
  status: string
  totalAmount: string
}

interface Milestone {
  status: string
}

interface Props {
  invoices: Invoice[]
  milestones: Milestone[]
  orgSlug: string
  project: {
    id: string
    name: string
    slug: string
    dueDate: Date | null
  }
}

export function ProjectSummaryCard({
  orgSlug,
  project,
  invoices,
  milestones,
}: Props) {
  const paid = invoices.filter((i) => i.status === 'paid')
  const overdue = invoices.filter(
    (i) => i.status === 'sent' && i.dueDate && isPast(new Date(i.dueDate))
  )
  const completed = milestones.filter((m) => m.status === 'completed').length
  const progress = milestones.length
    ? Math.round((completed / milestones.length) * 100)
    : null

  const paidTotals = sumByCurrency(paid, (i) => Number(i.totalAmount))
  const primaryPaid = Object.entries(paidTotals).sort((a, b) => b[1] - a[1])[0]

  const due = project.dueDate && new Date(project.dueDate)

  return (
    <Link
      className='flex flex-col gap-2 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50'
      href={`/${orgSlug}/${project.slug}` as RouteImpl}
    >
      <div className='flex items-start justify-between gap-2'>
        <span className='truncate font-medium text-sm'>{project.name}</span>
        {overdue.length > 0 && (
          <Badge className='shrink-0' variant='destructive'>
            {overdue.length} overdue
          </Badge>
        )}
      </div>
      {progress !== null && (
        <div className='flex items-center gap-2'>
          <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-secondary'>
            <div
              className={cn(
                'h-full rounded-full transition-all',
                progress === 100 ? 'bg-emerald-500' : 'bg-primary'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className='shrink-0 text-muted-foreground text-xs tabular-nums'>
            {completed}/{milestones.length}
          </span>
        </div>
      )}
      <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs'>
        {primaryPaid && (
          <span className='inline-flex items-center gap-1'>
            <TrendingUp className='size-3 text-emerald-600 dark:text-emerald-400' />
            {formatCurrency(primaryPaid[1], primaryPaid[0])}
          </span>
        )}
        {due && (
          <span
            className={cn(
              'inline-flex items-center gap-1',
              isPast(due) && 'text-destructive'
            )}
          >
            {isPast(due) ? (
              <AlertTriangleIcon className='size-3' />
            ) : (
              <CalendarIcon className='size-3' />
            )}
            {isPast(due)
              ? `Overdue ${formatDistanceToNow(due)}`
              : `Due ${format(due, 'MMM d')}`}
          </span>
        )}
      </div>
    </Link>
  )
}
