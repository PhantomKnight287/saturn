import {
  AlertTriangleIcon,
  Hourglass,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RouteImpl } from '@/types'
import { FinancialStat } from './financial-stat'
import { formatCurrency, sumByCurrency } from './format-currency'

interface Invoice {
  currency: string
  dueDate: Date | null
  status: string
  totalAmount: string
}

interface Expense {
  amountCents: number
  billable: boolean
  currency: string
  status: string
}

interface FinancialOverviewCardProps {
  expenses: Expense[]
  invoices: Invoice[]
  isAdmin?: boolean
  isClient?: boolean
  scopeLabel?: string
  viewAllHref?: string
}

export function FinancialOverviewCard({
  invoices,
  expenses,
  isClient,
  isAdmin,
  scopeLabel,
  viewAllHref,
}: FinancialOverviewCardProps) {
  const paid = invoices.filter((i) => i.status === 'paid')
  const sent = invoices.filter((i) => i.status === 'sent')
  const overdue = sent.filter((i) => i.dueDate && i.dueDate < new Date())
  const draft = invoices.filter((i) => i.status === 'draft')

  const paidTotals = sumByCurrency(paid, (i) => Number(i.totalAmount))
  const outstandingTotals = sumByCurrency(sent, (i) => Number(i.totalAmount))
  const overdueTotals = sumByCurrency(overdue, (i) => Number(i.totalAmount))
  const draftTotals = sumByCurrency(draft, (i) => Number(i.totalAmount))

  const billableApproved = expenses.filter(
    (e) => e.billable && e.status === 'client_accepted'
  )
  const billableTotals = sumByCurrency(
    billableApproved,
    (e) => e.amountCents / 100
  )

  return (
    <Card>
      <CardHeader className='flex-row items-center justify-between'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <Wallet className='size-4 text-muted-foreground' />
          Financial Overview
        </CardTitle>
        {viewAllHref ? (
          <Link
            className='text-muted-foreground text-xs hover:text-foreground'
            href={viewAllHref as RouteImpl}
          >
            View invoices
          </Link>
        ) : (
          scopeLabel && (
            <span className='text-muted-foreground text-xs'>{scopeLabel}</span>
          )
        )}
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
          <FinancialStat
            count={paid.length}
            icon={TrendingUp}
            label={isClient ? 'Paid' : 'Earned'}
            tone='text-emerald-600 dark:text-emerald-400'
            totals={paidTotals}
            unit='invoice'
          />
          <FinancialStat
            count={sent.length}
            icon={Hourglass}
            label='Outstanding'
            totals={outstandingTotals}
            unit='invoice'
          />
          <FinancialStat
            count={overdue.length}
            icon={AlertTriangleIcon}
            label='Overdue'
            tone={overdue.length > 0 ? 'text-destructive' : undefined}
            totals={overdueTotals}
            unit='invoice'
          />
          <FinancialStat
            count={billableApproved.length}
            icon={Receipt}
            label='Billable expenses'
            totals={billableTotals}
            unit='expense'
          />
        </div>
        {isAdmin && draft.length > 0 && (
          <p className='mt-4 text-muted-foreground text-xs'>
            {draft.length}{' '}
            {draft.length === 1 ? 'draft invoice' : 'draft invoices'} not yet
            sent
            {Object.keys(draftTotals).length > 0 && ' · '}
            {Object.entries(draftTotals)
              .map(([c, v]) => formatCurrency(v, c))
              .join(', ')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
