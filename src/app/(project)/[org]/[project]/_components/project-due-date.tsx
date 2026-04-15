import { format, formatDistanceToNow, isPast } from 'date-fns'
import { AlertTriangleIcon, CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProjectDueDate({ dueDate }: { dueDate: Date }) {
  const overdue = isPast(dueDate)

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-medium text-xs',
        overdue
          ? 'bg-destructive/10 text-destructive'
          : 'bg-muted text-muted-foreground'
      )}
    >
      {overdue ? (
        <AlertTriangleIcon className='size-3' />
      ) : (
        <CalendarIcon className='size-3' />
      )}
      {overdue
        ? `Overdue by ${formatDistanceToNow(dueDate)}`
        : `Due ${format(dueDate, 'MMM d, yyyy')}`}
    </div>
  )
}
