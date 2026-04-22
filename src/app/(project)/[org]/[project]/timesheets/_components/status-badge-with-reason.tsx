import StatusBadge from '@/components/status-badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { TimeEntry } from '../types'

interface Props {
  entry: Pick<TimeEntry, 'status' | 'rejectReason'>
  isClientInvolved?: boolean
}

export function StatusBadgeWithReason({ entry, isClientInvolved }: Props) {
  if (entry.status === 'admin_rejected' && entry.rejectReason) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <StatusBadge
            isClientInvolved={isClientInvolved}
            status={entry.status}
          />
        </TooltipTrigger>
        <TooltipContent className='max-w-xs' side='left'>
          <p className='font-medium'>Reason:</p>
          <p>{entry.rejectReason}</p>
        </TooltipContent>
      </Tooltip>
    )
  }
  return (
    <StatusBadge isClientInvolved={isClientInvolved} status={entry.status} />
  )
}
