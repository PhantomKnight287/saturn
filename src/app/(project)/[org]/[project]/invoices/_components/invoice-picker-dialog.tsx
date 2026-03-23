'use client'

import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { currencies } from '@/data/currencies'
import { cn } from '@/lib/utils'
import type { Invoice } from '../types'

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  disputed: 'Disputed',
  cancelled: 'Cancelled',
}

interface InvoicePickerDialogProps {
  invoices: Invoice[]
  onOpenChange: (open: boolean) => void
  open: boolean
  orgSlug: string
  projectSlug: string
}

export function InvoicePickerDialog({
  open,
  onOpenChange,
  invoices,
  orgSlug,
  projectSlug,
}: InvoicePickerDialogProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase()
    if (!q) {
      return true
    }
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.recipients.some(
        (r) =>
          r.userName?.toLowerCase().includes(q) ||
          r.userEmail.toLowerCase().includes(q)
      )
    )
  })

  // Sort: drafts at bottom
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === 'draft' && b.status !== 'draft') {
      return 1
    }
    if (a.status !== 'draft' && b.status === 'draft') {
      return -1
    }
    return 0
  })

  const handleExtend = () => {
    if (!selectedId) {
      return
    }
    router.push(`/${orgSlug}/${projectSlug}/invoices/new?extend=${selectedId}`)
    onOpenChange(false)
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Extend Previous Invoice</DialogTitle>
          <DialogDescription>
            Pick an invoice to use as a starting point. All details will be
            copied into a new invoice for you to edit.
          </DialogDescription>
        </DialogHeader>

        <Input
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search by number or client...'
          value={search}
        />

        <div className='max-h-[320px] space-y-1 overflow-y-auto rounded-md border p-1'>
          {sorted.length === 0 ? (
            <p className='py-6 text-center text-muted-foreground text-sm'>
              No invoices found
            </p>
          ) : (
            sorted.map((inv) => {
              const symbol =
                currencies.find((c) => c.cc === inv.currency)?.value ??
                inv.currency
              const num = Number(inv.totalAmount)
              const amount = num.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
              const clients = inv.recipients
                .map((r) => r.userName || r.userEmail)
                .join(', ')

              return (
                <button
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                    selectedId === inv.id && 'bg-accent ring-1 ring-primary',
                    inv.status === 'draft' && 'opacity-60'
                  )}
                  key={inv.id}
                  onClick={() => setSelectedId(inv.id)}
                  type='button'
                >
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium'>{inv.invoiceNumber}</span>
                      <Badge className='text-[10px]' variant='outline'>
                        {statusLabels[inv.status]}
                      </Badge>
                    </div>
                    {clients && (
                      <p className='mt-0.5 truncate text-muted-foreground text-xs'>
                        {clients}
                      </p>
                    )}
                  </div>
                  <div className='shrink-0 text-right'>
                    <p className='font-medium text-sm'>
                      {symbol} {amount}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {formatDistanceToNow(new Date(inv.updatedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button disabled={!selectedId} onClick={handleExtend}>
            Extend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
