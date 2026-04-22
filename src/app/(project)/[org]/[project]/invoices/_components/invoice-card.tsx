import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { currencies } from '@/data/currencies'
import type { InvoiceCardProps } from '../types'
import InvoiceStatusBadge from './status-badge'

export default function InvoiceCard({
  invoice,
  orgSlug,
  projectSlug,
  role,
  isClientInvolved,
}: InvoiceCardProps) {
  const symbol =
    currencies.find((c) => c.cc === invoice.currency)?.value ?? invoice.currency
  const num = Number(invoice.totalAmount)
  const amount =
    num % 1 === 0
      ? num.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : num.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })

  const clientNames = invoice.recipients
    .map((r) => r.userName || r.userEmail)
    .join(', ')

  return (
    <Link
      className='h-full'
      href={`/${orgSlug}/${projectSlug}/invoices/${invoice.id}`}
    >
      <Card className='flex h-full cursor-pointer flex-col gap-0 p-4 transition-colors hover:border-primary/50'>
        <div className='mb-1.5 flex items-center justify-between gap-2'>
          <InvoiceStatusBadge
            isClientInvolved={isClientInvolved}
            role={role}
            status={invoice.status}
          />

          <span className='shrink-0 text-muted-foreground text-xs'>
            {formatDistanceToNow(new Date(invoice.updatedAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        <h3 className='line-clamp-1 font-semibold'>{invoice.invoiceNumber}</h3>
        <p className='mt-1 font-semibold text-lg'>
          {symbol} {amount}
        </p>
        {clientNames && (
          <p className='mt-1 line-clamp-1 text-muted-foreground text-sm'>
            {clientNames}
          </p>
        )}
        {invoice.dueDate && (
          <p className='mt-0.5 text-muted-foreground text-xs'>
            Due{' '}
            {new Date(invoice.dueDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        )}
      </Card>
    </Link>
  )
}
