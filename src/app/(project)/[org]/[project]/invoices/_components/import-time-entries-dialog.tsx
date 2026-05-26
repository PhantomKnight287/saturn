'use client'

import { Clock, DollarSign } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { useSetSelection } from '@/hooks/use-set-selection'
import {
  formatDurationInUnit,
  type InvoiceTimeUnit,
  timeEntryLineAmounts,
} from '@/lib/invoice-time-units'
import { memberRateKey } from '../common'

interface BillableEntry {
  date: Date
  description: string
  durationMinutes: number
  id: string
  invoiceId: string | null
  memberId: string
  memberName: string | null
  requirementId: string | null
  requirementTitle: string | null
}

interface ImportTimeEntriesDialogProps {
  billableEntries: BillableEntry[]
  defaultUnit: InvoiceTimeUnit
  onImport: (
    items: {
      description: string
      quantity: string
      unitPrice: string
      amount: string
    }[],
    timeEntryIds: string[]
  ) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  rates: Map<string, { hourlyRate: number; currency: string }>
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) {
    return `${m}m`
  }
  if (m === 0) {
    return `${h}h`
  }
  return `${h}h ${m}m`
}

function formatCentsAsRate(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function ImportTimeEntriesDialog({
  open,
  onOpenChange,
  billableEntries,
  defaultUnit,
  rates,
  onImport,
}: ImportTimeEntriesDialogProps) {
  const { selectedIds, toggle, toggleAll, clear } =
    useSetSelection<BillableEntry>((e) => e.id)
  const [importIndividually, setImportIndividually] = useState(false)
  const [unit, setUnit] = useState<InvoiceTimeUnit>(defaultUnit)
  const id = useId()
  useEffect(() => {
    if (open) {
      clear()
      setImportIndividually(false)
      setUnit(defaultUnit)
    }
  }, [open, clear, defaultUnit])

  const grouped = billableEntries.reduce<
    Record<string, { name: string; entries: BillableEntry[] }>
  >((acc, entry) => {
    const key = entry.memberId
    if (!acc[key]) {
      acc[key] = {
        name: entry.memberName ?? 'Unknown',
        entries: [],
      }
    }
    acc[key].entries.push(entry)
    return acc
  }, {})

  function handleImport() {
    const selected = billableEntries.filter((e) => selectedIds.has(e.id))

    let items: {
      description: string
      quantity: string
      unitPrice: string
      amount: string
    }[]

    if (importIndividually) {
      items = selected.map((entry) => {
        const rate = rates.get(memberRateKey(entry.memberId, entry.date))
        const { quantity, unitPrice, amount } = timeEntryLineAmounts({
          durationMinutes: entry.durationMinutes,
          hourlyRateCents: rate?.hourlyRate ?? 0,
          unit,
        })

        const memberName = entry.memberName ?? 'Unknown'
        const dateLabel = new Date(entry.date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        const reqPart = entry.requirementTitle
          ? ` — ${entry.requirementTitle}`
          : ''
        const desc = `${memberName}${reqPart} (${dateLabel}): ${entry.description}`

        return {
          description: desc,
          quantity,
          unitPrice,
          amount,
        }
      })
    } else {
      const byMemberAndReq: Record<
        string,
        {
          memberName: string
          requirementTitle: string | null
          totalMinutes: number
          rate?: { hourlyRate: number; currency: string }
        }
      > = {}

      for (const entry of selected) {
        const rate = rates.get(memberRateKey(entry.memberId, entry.date))
        // Split a member+requirement across rate changes so each line keeps a
        // coherent unit price.
        const rateKey = rate ? `${rate.currency}:${rate.hourlyRate}` : 'none'
        const key = `${entry.memberId}__${entry.requirementTitle ?? 'General'}__${rateKey}`
        if (!byMemberAndReq[key]) {
          byMemberAndReq[key] = {
            memberName: entry.memberName ?? 'Unknown',
            requirementTitle: entry.requirementTitle,
            totalMinutes: 0,
            rate,
          }
        }
        byMemberAndReq[key].totalMinutes += entry.durationMinutes
      }

      items = Object.values(byMemberAndReq).map((group) => {
        const rate = group.rate
        const { quantity, unitPrice, amount } = timeEntryLineAmounts({
          durationMinutes: group.totalMinutes,
          hourlyRateCents: rate?.hourlyRate ?? 0,
          unit,
        })

        const desc = group.requirementTitle
          ? `${group.memberName} — ${group.requirementTitle}`
          : `${group.memberName} — General project work`

        return {
          description: desc,
          quantity,
          unitPrice,
          amount,
        }
      })
    }

    onImport(items, [...selectedIds])
    onOpenChange(false)
  }

  const totalSelectedMinutes = billableEntries
    .filter((e) => selectedIds.has(e.id))
    .reduce((sum, e) => sum + e.durationMinutes, 0)

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Import from Time Entries</DialogTitle>
          <DialogDescription>
            Select approved billable time entries to generate invoice line
            items.
          </DialogDescription>
        </DialogHeader>

        {billableEntries.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant='icon'>
                <Clock />
              </EmptyMedia>
              <EmptyTitle>No billable entries</EmptyTitle>
              <EmptyDescription>
                There are no approved billable time entries that haven&apos;t
                been invoiced yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className='flex items-center justify-between border-b pb-2'>
              <div className='flex items-center gap-2'>
                <Checkbox
                  checked={selectedIds.size === billableEntries.length}
                  onCheckedChange={() => toggleAll(billableEntries)}
                />
                <span className='text-muted-foreground text-sm'>
                  Select all ({billableEntries.length} entries)
                </span>
              </div>
              {selectedIds.size > 0 && (
                <Badge variant='secondary'>
                  {formatDurationInUnit(totalSelectedMinutes, unit)} selected
                </Badge>
              )}
            </div>

            <div className='max-h-96 space-y-4 overflow-y-auto'>
              {Object.entries(grouped).map(([memberId, group]) => {
                const distinctRates = new Map(
                  group.entries
                    .map((e) => rates.get(memberRateKey(e.memberId, e.date)))
                    .filter((r) => r !== undefined)
                    .map((r) => [`${r.currency}:${r.hourlyRate}`, r])
                )
                const [singleRate] =
                  distinctRates.size === 1 ? [...distinctRates.values()] : []
                return (
                  <div key={memberId}>
                    <div className='mb-2 flex items-center justify-between'>
                      <span className='font-medium text-sm'>{group.name}</span>
                      {singleRate ? (
                        <Badge className='text-xs' variant='outline'>
                          {singleRate.currency}{' '}
                          {formatCentsAsRate(singleRate.hourlyRate)}/h
                        </Badge>
                      ) : (
                        distinctRates.size > 1 && (
                          <Badge className='text-xs' variant='outline'>
                            Rates vary
                          </Badge>
                        )
                      )}
                    </div>
                    <div className='space-y-1'>
                      {group.entries.map((entry) => (
                        <div
                          className='flex items-center gap-3 rounded-md border px-3 py-2'
                          key={entry.id}
                        >
                          <Checkbox
                            checked={selectedIds.has(entry.id)}
                            onCheckedChange={() => toggle(entry.id)}
                          />
                          <div className='min-w-0 flex-1'>
                            <p className='truncate text-sm'>
                              {entry.description}
                            </p>
                            <p className='text-muted-foreground text-xs'>
                              {entry.requirementTitle ?? 'General'} ·{' '}
                              {new Date(entry.date).toLocaleDateString(
                                undefined,
                                {
                                  month: 'short',
                                  day: 'numeric',
                                }
                              )}
                            </p>
                          </div>
                          <span className='font-medium text-sm'>
                            {formatMinutes(entry.durationMinutes)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {billableEntries.length > 0 && (
          <div className='flex items-center justify-between border-t pt-3'>
            <div className='grid gap-1 leading-none'>
              <span className='font-medium text-sm'>Time unit</span>
              <p className='text-muted-foreground text-xs'>
                How quantities appear on the invoice.
              </p>
            </div>
            <div className='inline-flex rounded-md border p-0.5'>
              {(['hours', 'minutes'] as const).map((u) => (
                <Button
                  className='h-7 px-3 text-xs capitalize'
                  key={u}
                  onClick={() => setUnit(u)}
                  size='sm'
                  type='button'
                  variant={unit === u ? 'secondary' : 'ghost'}
                >
                  {u}
                </Button>
              ))}
            </div>
          </div>
        )}

        {billableEntries.length > 0 && (
          <div className='flex items-start gap-2 border-t pt-3'>
            <Checkbox
              checked={importIndividually}
              id={id}
              onCheckedChange={(checked) =>
                setImportIndividually(checked === true)
              }
            />
            <div className='grid gap-1 leading-none'>
              <label
                className='cursor-pointer font-medium text-sm'
                htmlFor={id}
              >
                Import each entry as a separate line item
              </label>
              <p className='text-muted-foreground text-xs'>
                By default, entries are consolidated by member and requirement.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant='outline'>
            Cancel
          </Button>
          {billableEntries.length > 0 && (
            <Button disabled={selectedIds.size === 0} onClick={handleImport}>
              <DollarSign className='size-4' />
              Import {selectedIds.size > 0 ? `(${selectedIds.size})` : ''} as
              Line Items
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
