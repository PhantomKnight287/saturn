import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import StatusBadge from '@/components/status-badge'
import { Card } from '@/components/ui/card'
import { currencies } from '@/data/currencies'
import { stripHtml } from '@/lib/utils'
import type { proposals } from '@/server/db/schema'
import type { Role } from '@/types'

type Proposal = typeof proposals.$inferSelect

export default function ProposalCard({
  proposal,
  orgSlug,
  projectSlug,
  role,
}: {
  proposal: Proposal
  orgSlug: string
  projectSlug: string
  role: Role
}) {
  const symbol =
    currencies.find((c) => c.cc === proposal.currency)?.value ??
    proposal.currency
  const num = Number(proposal.totalAmount)
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

  return (
    <Link
      className='h-full'
      href={`/${orgSlug}/${projectSlug}/proposals/${proposal.slug}`}
    >
      <Card className='flex h-full cursor-pointer flex-col gap-0 p-4 transition-colors hover:border-primary/50'>
        <div className='mb-1.5 flex items-center justify-between gap-2'>
          <StatusBadge role={role} status={proposal.status} />
          <span className='shrink-0 text-muted-foreground text-xs'>
            {formatDistanceToNow(new Date(proposal.updatedAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        <h3 className='line-clamp-1 font-semibold'>{proposal.title}</h3>
        {num > 0 && (
          <p className='mt-1 font-semibold text-lg'>
            {symbol} {amount}
          </p>
        )}
        {proposal.body ? (
          <p className='mt-1 line-clamp-2 flex-1 text-muted-foreground text-sm'>
            {stripHtml(proposal.body)}
          </p>
        ) : null}
        {proposal.validUntil && (
          <p className='mt-0.5 text-muted-foreground text-xs'>
            Valid until{' '}
            {new Date(proposal.validUntil).toLocaleDateString('en-US', {
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
