import { cn } from '@/lib/utils'

type Status = 'pending' | 'in_progress' | 'completed' | 'blocked'

export function MilestoneStatusDot({ status }: { status: Status }) {
  return (
    <div
      className={cn(
        'size-2.5 shrink-0 rounded-full',
        status === 'completed' && 'bg-emerald-500',
        status === 'in_progress' && 'bg-blue-500',
        status === 'pending' && 'bg-muted-foreground/40',
        status === 'blocked' && 'bg-destructive'
      )}
    />
  )
}
