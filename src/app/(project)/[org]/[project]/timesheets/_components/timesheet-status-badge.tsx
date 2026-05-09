import { Badge } from '@/components/ui/badge'
import type { timesheetReportStatusEnum } from '@/server/db/schema'

type Status = (typeof timesheetReportStatusEnum.enumValues)[number]

const statusConfig: Record<
  Status,
  {
    clientLabel?: string
    label: string
    variant: 'secondary' | 'outline' | 'default' | 'destructive'
  }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent: {
    label: 'Awaiting Review',
    clientLabel: 'Awaiting Your Review',
    variant: 'outline',
  },
  approved: {
    label: 'Client Approved',
    clientLabel: 'Approved',
    variant: 'default',
  },
  disputed: {
    label: 'Disputed',
    clientLabel: 'You Reported an Issue',
    variant: 'destructive',
  },
}

export default function TimesheetStatusBadge({
  status,
  role,
}: {
  status: Status
  role?: 'client' | 'sender'
}) {
  const config = statusConfig[status] ?? statusConfig.draft
  const label =
    role === 'client' && config.clientLabel ? config.clientLabel : config.label
  return <Badge variant={config.variant}>{label}</Badge>
}
