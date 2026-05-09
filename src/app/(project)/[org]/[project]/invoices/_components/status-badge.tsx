import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
  invoiceRecipientEnum,
  invoiceStatusEnum,
} from '@/server/db/schema'
import type { Role } from '@/types'

type Status = (typeof invoiceStatusEnum.enumValues)[number]
type Recipient = (typeof invoiceRecipientEnum.enumValues)[number]

interface Variant {
  className: string
  clientLabel?: string
  label: string
  memberLabel?: string
  memberRecipientLabel?: string
  noClientLabel?: string
}

const variants: Record<Status, Variant> = {
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground border-muted',
  },
  disputed: {
    label: 'Disputed',
    className: 'bg-muted text-destructive border-destructive',
  },
  sent: {
    label: 'Sent to client',
    className: 'bg-muted text-yellow-500 border-yellow-500',
    clientLabel: 'Pending payment',
    noClientLabel: 'Awaiting payment',
    memberRecipientLabel: 'Sent to member',
    memberLabel: 'Pending payment',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-muted text-muted-foreground border-muted',
  },
  paid: {
    className: 'bg-muted text-green-500 border-green-500',
    label: 'Paid',
  },
}

export default function InvoiceStatusBadge({
  status,
  role,
  isClientInvolved = true,
  recipient,
}: {
  status: Status
  role?: Role
  isClientInvolved?: boolean
  recipient?: Recipient | null
}) {
  const variant = variants[status]
  if (variant === undefined) {
    return null
  }

  let label = variant.label
  if (recipient === 'member' && role === 'member' && variant.memberLabel) {
    label = variant.memberLabel
  } else if (recipient === 'member' && variant.memberRecipientLabel) {
    label = variant.memberRecipientLabel
  } else if (!isClientInvolved && variant.noClientLabel) {
    label = variant.noClientLabel
  } else if (role === 'client' && variant.clientLabel) {
    label = variant.clientLabel
  }

  return (
    <Badge className={cn(variant.className)} variant={'outline'}>
      {label}
    </Badge>
  )
}
