import { Badge } from '@/components/ui/badge'
import type { timesheetReportStatusEnum } from '@/server/db/schema'

const statusConfig: Record<
  (typeof timesheetReportStatusEnum.enumValues)[number],
  {
    label: string
    variant: 'secondary' | 'outline' | 'default' | 'destructive'
  }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent: { label: 'Awaiting Review', variant: 'outline' },
  approved: { label: 'Client Approved', variant: 'default' },
  disputed: { label: 'Disputed', variant: 'destructive' },
}

export default function TimesheetStatusBadge({
  status,
}: {
  status: (typeof timesheetReportStatusEnum.enumValues)[number]
}) {
  const config = statusConfig[status] ?? statusConfig.draft
  return (
    <Badge variant={config?.variant ?? 'secondary'}>
      {config?.label ?? 'Draft'}
    </Badge>
  )
}
