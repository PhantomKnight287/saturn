import { formatDistanceToNow } from 'date-fns'
import { AlertTriangleIcon, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import type { RouteImpl } from '@/types'
import { formatCurrency } from './format-currency'

export interface OverdueInvoice {
  currency: string
  dueDate: Date
  id: string
  invoiceNumber: string
  projectName?: string
  projectSlug: string
  totalAmount: string
}

interface Props {
  invoices: OverdueInvoice[]
  orgSlug: string
  showProjectName?: boolean
}

export function OverdueInvoicesAccordion({
  invoices,
  orgSlug,
  showProjectName = false,
}: Props) {
  if (invoices.length === 0) {
    return null
  }

  return (
    <Accordion
      className='rounded-lg border border-border bg-background'
      collapsible
      type='single'
    >
      <AccordionItem className='border-b-0' value='overdue-invoices'>
        <AccordionTrigger className='px-3 py-3 hover:no-underline'>
          <div className='flex items-center gap-3'>
            <AlertTriangleIcon className='size-4 text-destructive' />
            <span className='text-sm'>Overdue invoices</span>
          </div>
          <div className='ml-auto flex items-center gap-2'>
            <Badge variant='destructive'>{invoices.length}</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className='px-3'>
          <div className='divide-y divide-border border-border border-t'>
            {invoices.map((inv) => (
              <Link
                className='flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-muted/50'
                href={
                  `/${orgSlug}/${inv.projectSlug}/invoices/${inv.id}` as RouteImpl
                }
                key={inv.id}
              >
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <span className='truncate font-medium text-sm'>
                      {inv.invoiceNumber}
                    </span>
                    {showProjectName && inv.projectName && (
                      <span className='truncate text-muted-foreground text-xs'>
                        · {inv.projectName}
                      </span>
                    )}
                  </div>
                  <p className='text-destructive text-xs'>
                    Due {formatDistanceToNow(inv.dueDate)} ago
                  </p>
                </div>
                <div className='flex shrink-0 items-center gap-2'>
                  <span className='font-medium text-sm tabular-nums'>
                    {formatCurrency(Number(inv.totalAmount), inv.currency)}
                  </span>
                  <ChevronRight className='size-4 text-muted-foreground' />
                </div>
              </Link>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
