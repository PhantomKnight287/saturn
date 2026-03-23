import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Role, Status } from '@/types'

const variants: Record<
  Status,
  { label: string; clientLabel?: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground border-muted',
  },
  submitted_to_admin: {
    label: 'Pending Review',
    className:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
  },
  admin_accepted: {
    label: 'Approved',
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800',
  },
  admin_rejected: {
    label: 'Rejected',
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  },
  submitted_to_client: {
    label: 'Sent to Client',
    clientLabel: 'Pending Your Signature',
    className:
      'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800',
  },
  client_accepted: {
    label: 'Client Signed',
    clientLabel: 'Signed',
    className:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
  },
  client_rejected: {
    label: 'Client Rejected',
    clientLabel: 'Rejected',
    className:
      'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800',
  },
  changes_requested: {
    label: 'Changes Requested',
    className:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
  },
}

export default function RequirementStatusBadge({
  status,
  role,
}: {
  status: Status
  role?: Role
}) {
  const variant = variants[status]
  const label =
    role === 'client' && variant.clientLabel
      ? variant.clientLabel
      : variant.label

  return (
    <Badge className={cn(variant.className)} variant='outline'>
      {label}
    </Badge>
  )
}
