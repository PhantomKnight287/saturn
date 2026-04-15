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
  rates,
  onImport,
}: ImportTimeEntriesDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [importIndividually, setImportIndividually] = useState(false)
  const id = useId()
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set())
      setImportIndividually(false)
    }
  }, [open])

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

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === billableEntries.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(billableEntries.map((e) => e.id)))
    }
  }

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
        const hours = (entry.durationMinutes / 60).toFixed(2)
        const rate = rates.get(entry.memberId)
        const unitPriceCents = rate?.hourlyRate ?? 0
        const unitPrice = (unitPriceCents / 100).toFixed(2)
        const amount = (
          Number.parseFloat(hours) *
          (unitPriceCents / 100)
        ).toFixed(2)

        const memberName = entry.memberName ?? 'Unknown'
        const dateLabel = new Date(entry.date).toLocaleDateString('en-US', {
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
          quantity: hours,
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
          memberId: string
        }
      > = {}

      for (const entry of selected) {
        const key = `${entry.memberId}__${entry.requirementTitle ?? 'General'}`
        if (!byMemberAndReq[key]) {
          byMemberAndReq[key] = {
            memberName: entry.memberName ?? 'Unknown',
            requirementTitle: entry.requirementTitle,
            totalMinutes: 0,
            memberId: entry.memberId,
          }
        }
        byMemberAndReq[key].totalMinutes += entry.durationMinutes
      }

      items = Object.values(byMemberAndReq).map((group) => {
        const hours = (group.totalMinutes / 60).toFixed(2)
        const rate = rates.get(group.memberId)
        const unitPriceCents = rate?.hourlyRate ?? 0
        const unitPrice = (unitPriceCents / 100).toFixed(2)
        const amount = (
          Number.parseFloat(hours) *
          (unitPriceCents / 100)
        ).toFixed(2)

        const desc = group.requirementTitle
          ? `${group.memberName} — ${group.requirementTitle}`
          : `${group.memberName} — General project work`

        return {
          description: desc,
          quantity: hours,
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
                  onCheckedChange={toggleAll}
                />
                <span className='text-muted-foreground text-sm'>
                  Select all ({billableEntries.length} entries)
                </span>
              </div>
              {selectedIds.size > 0 && (
                <Badge variant='secondary'>
                  {(totalSelectedMinutes / 60).toFixed(1)}h selected
                </Badge>
              )}
            </div>

            <div className='max-h-96 space-y-4 overflow-y-auto'>
              {Object.entries(grouped).map(([memberId, group]) => {
                const rate = rates.get(memberId)
                return (
                  <div key={memberId}>
                    <div className='mb-2 flex items-center justify-between'>
                      <span className='font-medium text-sm'>{group.name}</span>
                      {rate && (
                        <Badge className='text-xs' variant='outline'>
                          {rate.currency} {formatCentsAsRate(rate.hourlyRate)}/h
                        </Badge>
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
                            onCheckedChange={() => toggleSelect(entry.id)}
                          />
                          <div className='min-w-0 flex-1'>
                            <p className='truncate text-sm'>
                              {entry.description}
                            </p>
                            <p className='text-muted-foreground text-xs'>
                              {entry.requirementTitle ?? 'General'} ·{' '}
                              {new Date(entry.date).toLocaleDateString(
                                'en-US',
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
