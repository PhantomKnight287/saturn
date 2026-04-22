'use client'

import { Clock, DollarSign, Filter, Pencil, Trash2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { deleteTimeEntryAction } from '../actions'
import { formatMinutes } from '../common'
import type { ProjectMember, Requirement, TimeEntry } from '../types'
import { TimeEntryForm } from './time-entry-form'

interface TeamEntriesTableProps {
  currentMemberId: string
  entries: TimeEntry[]
  isClientInvolved?: boolean
  onSelectionChange?: (ids: Set<string>) => void
  projectId: string
  projectMembers: ProjectMember[]
  requirements: Requirement[]
  selectedIds?: Set<string>
}

export function TeamEntriesTable({
  entries,
  projectMembers,
  requirements,
  projectId,
  selectedIds,
  onSelectionChange,
  isClientInvolved,
}: TeamEntriesTableProps) {
  const selectable = !!onSelectionChange
  const params = useParams()
  const [filterMember, setFilterMember] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterRequirement, setFilterRequirement] = useState<string>('all')
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)

  const deleteAction = useAction(deleteTimeEntryAction, {
    onSuccess: () => toast.success('Time entry deleted'),
    onError: ({ error }) =>
      toast.error(error.serverError ?? 'Failed to delete entry'),
  })

  const filtered = entries.filter((e) => {
    if (filterMember !== 'all' && e.memberId !== filterMember) {
      return false
    }
    if (filterStatus !== 'all' && e.status !== filterStatus) {
      return false
    }
    if (filterRequirement !== 'all') {
      if (filterRequirement === 'general' && e.requirementId !== null) {
        return false
      }
      if (
        filterRequirement !== 'general' &&
        e.requirementId !== filterRequirement
      ) {
        return false
      }
    }
    return true
  })

  const totalMinutes = filtered.reduce((sum, e) => sum + e.durationMinutes, 0)

  const hasActiveFilters =
    filterMember !== 'all' ||
    filterStatus !== 'all' ||
    filterRequirement !== 'all'

  const selectableEntries = filtered.filter(
    (e) => e.status === 'admin_accepted' && !e.invoiceId
  )

  const toggleEntry = (id: string) => {
    if (!(onSelectionChange && selectedIds)) {
      return
    }
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  const toggleAll = () => {
    if (!(onSelectionChange && selectedIds)) {
      return
    }
    if (selectableEntries.every((e) => selectedIds.has(e.id))) {
      const next = new Set(selectedIds)
      for (const e of selectableEntries) {
        next.delete(e.id)
      }
      onSelectionChange(next)
    } else {
      const next = new Set(selectedIds)
      for (const e of selectableEntries) {
        next.add(e.id)
      }
      onSelectionChange(next)
    }
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Filter className='size-4 text-muted-foreground' />
        <Select onValueChange={setFilterMember} value={filterMember}>
          <SelectTrigger className='h-8 w-40'>
            <SelectValue placeholder='All members' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All members</SelectItem>
            {projectMembers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name ?? m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={setFilterStatus} value={filterStatus}>
          <SelectTrigger className='h-8 w-36'>
            <SelectValue placeholder='All statuses' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All statuses</SelectItem>
            <SelectItem value='draft'>Draft</SelectItem>
            <SelectItem value='submitted_to_admin'>Submitted</SelectItem>
            <SelectItem value='admin_accepted'>Approved</SelectItem>
            <SelectItem value='admin_rejected'>Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={setFilterRequirement} value={filterRequirement}>
          <SelectTrigger className='h-8 w-44'>
            <SelectValue placeholder='All requirements' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All requirements</SelectItem>
            <SelectItem value='general'>General work</SelectItem>
            {requirements.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            className='h-8 text-xs'
            onClick={() => {
              setFilterMember('all')
              setFilterStatus('all')
              setFilterRequirement('all')
            }}
            size='sm'
            variant='ghost'
          >
            Clear filters
          </Button>
        )}
        <span className='ml-auto text-muted-foreground text-sm'>
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'} ·{' '}
          {formatMinutes(totalMinutes)}
        </span>
      </div>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Clock />
            </EmptyMedia>
            <EmptyTitle>No time entries found</EmptyTitle>
            <EmptyDescription>
              {hasActiveFilters
                ? 'No time entries match the selected filters.'
                : 'No time entries have been logged yet.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectable && (
                      <TableHead className='w-10'>
                        <Checkbox
                          checked={
                            selectableEntries.length > 0 &&
                            selectableEntries.every((e) =>
                              selectedIds?.has(e.id)
                            )
                          }
                          disabled={selectableEntries.length === 0}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Member</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Requirement</TableHead>
                    <TableHead className='w-[100px]'>Date</TableHead>
                    <TableHead className='w-[90px] text-right'>
                      Duration
                    </TableHead>
                    <TableHead className='w-[90px] text-center'>
                      Status
                    </TableHead>
                    <TableHead className='w-16' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => {
                    return (
                      <TableRow key={entry.id}>
                        {selectable && (
                          <TableCell>
                            {entry.status === 'admin_accepted' &&
                            !entry.invoiceId ? (
                              <Checkbox
                                checked={selectedIds?.has(entry.id) ?? false}
                                onCheckedChange={() => toggleEntry(entry.id)}
                              />
                            ) : (
                              <span />
                            )}
                          </TableCell>
                        )}
                        <TableCell className='text-sm'>
                          {entry.memberName ?? entry.memberEmail}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-1'>
                            <span className='line-clamp-1 max-w-52 text-sm'>
                              {entry.description}
                            </span>
                            {entry.billable && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <DollarSign className='size-3 text-primary' />
                                  </TooltipTrigger>
                                  <TooltipContent>Billable</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='text-muted-foreground text-sm'>
                          <span className='line-clamp-1 max-w-36'>
                            {entry.requirementTitle ? (
                              <a
                                className='hover:underline'
                                href={`/${params.org}/${params.project}/requirements/${entry.requirementSlug}`}
                                target='_blank'
                              >
                                {entry.requirementTitle}
                              </a>
                            ) : (
                              '—'
                            )}
                          </span>
                        </TableCell>
                        <TableCell className='whitespace-nowrap text-sm'>
                          {new Date(entry.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className='text-right font-medium text-sm'>
                          {formatMinutes(entry.durationMinutes)}
                        </TableCell>
                        <TableCell className='text-center'>
                          {entry.status === 'admin_rejected' &&
                          entry.rejectReason ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <StatusBadge
                                    isClientInvolved={isClientInvolved}
                                    status={entry.status}
                                  />
                                </TooltipTrigger>
                                <TooltipContent
                                  className='max-w-xs'
                                  side='left'
                                >
                                  <p className='font-medium'>Reason:</p>
                                  <p>{entry.rejectReason}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <StatusBadge
                              isClientInvolved={isClientInvolved}
                              status={entry.status}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-1'>
                            <Button
                              className='size-7'
                              onClick={() => setEditEntry(entry)}
                              size='icon'
                              variant='ghost'
                            >
                              <Pencil className='size-3.5' />
                            </Button>
                            <Button
                              className='size-7 text-destructive'
                              onClick={() =>
                                deleteAction.execute({
                                  timeEntryId: entry.id,
                                })
                              }
                              size='icon'
                              variant='ghost'
                            >
                              <Trash2 className='size-3.5' />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {editEntry && (
        <TimeEntryForm
          editEntry={editEntry}
          onOpenChange={(open) => {
            if (!open) {
              setEditEntry(null)
            }
          }}
          open={!!editEntry}
          projectId={projectId}
          requirements={requirements}
        />
      )}
    </div>
  )
}
