import { format, isPast } from 'date-fns'
import { Milestone as MilestoneIcon } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { RouteImpl } from '@/types'
import { MilestoneStatusDot } from './milestone-status-dot'

interface Milestone {
  dueDate: Date | null
  id: string
  name: string
  progress: { signed: number; total: number }
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
}

export function ActiveMilestonesCard({
  milestones,
  basePath,
}: {
  milestones: Milestone[]
  basePath: string
}) {
  return (
    <Card>
      <CardHeader className='flex-row items-center justify-between'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <MilestoneIcon className='size-4 text-muted-foreground' />
          Active Milestones
        </CardTitle>
        <Link
          className='text-muted-foreground text-xs hover:text-foreground'
          href={`${basePath}/milestones` as RouteImpl}
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className='space-y-3'>
        {milestones.slice(0, 5).map((m) => {
          const progressPercent =
            m.progress.total > 0
              ? Math.round((m.progress.signed / m.progress.total) * 100)
              : 0
          const overdue = m.dueDate && isPast(new Date(m.dueDate))
          return (
            <Link
              className='flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50'
              href={`${basePath}/milestones/${m.id}` as RouteImpl}
              key={m.id}
            >
              <MilestoneStatusDot status={m.status} />
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-2'>
                  <span className='truncate font-medium text-sm'>{m.name}</span>
                  {overdue && (
                    <Badge className='shrink-0' variant='destructive'>
                      Overdue
                    </Badge>
                  )}
                </div>
                {m.dueDate && !overdue && (
                  <p className='text-muted-foreground text-xs'>
                    Due {format(new Date(m.dueDate), 'MMM d')}
                  </p>
                )}
                {m.progress.total > 0 && (
                  <div className='mt-1 flex items-center gap-2'>
                    <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-secondary'>
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          progressPercent === 100
                            ? 'bg-emerald-500'
                            : 'bg-primary'
                        )}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className='shrink-0 text-muted-foreground text-xs'>
                      {m.progress.signed}/{m.progress.total}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}
