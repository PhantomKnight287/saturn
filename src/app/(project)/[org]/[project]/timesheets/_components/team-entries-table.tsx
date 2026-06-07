'use client'

import { useRouter } from '@bprogress/next/app'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Filter,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useQueryStates } from 'nuqs'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getStatusLabel, type Status } from '@/components/status-badge'
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
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { CustomFieldDefinition } from '@/lib/custom-fields'
import { deleteTimeEntryAction } from '../actions'
import { formatMinutes, formatShortDate } from '../common'
import { teamEntriesSearchParams } from '../search-params'
import type { ProjectMember, Requirement, TimeEntry } from '../types'
import { CustomValuesInline } from './custom-values-inline'
import { StatusBadgeWithReason } from './status-badge-with-reason'
import { TimeEntryForm } from './time-entry-form'
import { TruncatedText } from './truncated-text'

const STATUS_FILTER_ORDER: Status[] = [
  'submitted_to_admin',
  'changes_requested',
  'admin_rejected',
  'admin_accepted',
  'submitted_to_client',
  'client_accepted',
  'client_rejected',
  'draft',
]

interface TeamEntriesTableProps {
  currentMemberId: string
  customFields?: CustomFieldDefinition[]
  entries: TimeEntry[]
  isClientInvolved?: boolean
  onSelectionChange?: (next: Map<string, TimeEntry>) => void
  orgSlug?: string
  page: number
  pageSize: number
  projectId: string
  projectMembers: ProjectMember[]
  projectSlug?: string
  requirements: Requirement[]
  selectedEntries?: Map<string, TimeEntry>
  total: number
  totalMinutes: number
}

export function TeamEntriesTable({
  entries,
  projectMembers,
  requirements,
  projectId,
  selectedEntries,
  onSelectionChange,
  isClientInvolved,
  customFields = [],
  orgSlug,
  projectSlug,
  page,
  pageSize,
  total,
  totalMinutes,
}: TeamEntriesTableProps) {
  const selectable = !!onSelectionChange
  const params = useParams()
  const router = useRouter()
  const [
    {
      member: filterMember,
      status: filterStatus,
      requirement: filterRequirement,
    },
    setFilters,
  ] = useQueryStates(teamEntriesSearchParams, { shallow: false })
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)
  const hasCustomFields = customFields.length > 0
  const editHrefBase =
    orgSlug && projectSlug ? `/${orgSlug}/${projectSlug}/timesheets` : null
  const onEditClick = (entry: TimeEntry) => {
    if (hasCustomFields && editHrefBase) {
      router.push(`${editHrefBase}/${entry.id}/edit`)
      return
    }
    setEditEntry(entry)
  }

  const deleteAction = useAction(deleteTimeEntryAction, {
    onSuccess: () => toast.success('Time entry deleted'),
    onError: ({ error }) =>
      toast.error(error.serverError ?? 'Failed to delete entry'),
  })

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const hasActiveFilters =
    filterMember !== 'all' ||
    filterStatus !== 'all' ||
    filterRequirement !== 'all'

  const selectableEntries = useMemo(
    () => entries.filter((e) => e.status === 'admin_accepted' && !e.invoiceId),
    [entries]
  )

  const toggleEntry = (entry: TimeEntry) => {
    if (!(onSelectionChange && selectedEntries)) {
      return
    }
    const next = new Map(selectedEntries)
    if (next.has(entry.id)) {
      next.delete(entry.id)
    } else {
      next.set(entry.id, entry)
    }
    onSelectionChange(next)
  }

  const toggleAll = () => {
    if (!(onSelectionChange && selectedEntries)) {
      return
    }
    const next = new Map(selectedEntries)
    if (selectableEntries.every((e) => selectedEntries.has(e.id))) {
      for (const e of selectableEntries) {
        next.delete(e.id)
      }
    } else {
      for (const e of selectableEntries) {
        next.set(e.id, e)
      }
    }
    onSelectionChange(next)
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center gap-3'>
        <Filter className='size-4 text-muted-foreground' />
        <Select
          onValueChange={(v) => setFilters({ member: v, page: 1 })}
          value={filterMember}
        >
          <SelectTrigger className='*:data-[slot=select-value]:block! h-9 w-40 *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate'>
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
        <Select
          onValueChange={(v) =>
            setFilters({ status: v as Status | 'all', page: 1 })
          }
          value={filterStatus}
        >
          <SelectTrigger className='*:data-[slot=select-value]:block! h-9 w-36 *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate'>
            <SelectValue placeholder='All statuses' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All statuses</SelectItem>
            {STATUS_FILTER_ORDER.map((status) => (
              <SelectItem key={status} value={status}>
                {getStatusLabel(status, { isClientInvolved })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          onValueChange={(v) => setFilters({ requirement: v, page: 1 })}
          value={filterRequirement}
        >
          <SelectTrigger className='*:data-[slot=select-value]:block! h-9 w-44 *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate'>
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
            className='h-9 text-xs'
            onClick={() =>
              setFilters({
                member: 'all',
                status: 'all',
                requirement: 'all',
                page: 1,
              })
            }
            variant='ghost'
          >
            Clear filters
          </Button>
        )}
        <span className='ml-auto text-muted-foreground text-sm'>
          {total} {total === 1 ? 'entry' : 'entries'} ·{' '}
          {formatMinutes(totalMinutes)}
        </span>
      </div>

      {entries.length === 0 ? (
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
              <Table className='[&_td]:px-3 [&_td]:py-3.5 [&_th]:h-12 [&_th]:px-3'>
                <TableHeader>
                  <TableRow>
                    {selectable && (
                      <TableHead className='w-10'>
                        <Checkbox
                          checked={
                            selectableEntries.length > 0 &&
                            selectableEntries.every((e) =>
                              selectedEntries?.has(e.id)
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
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      {selectable && (
                        <TableCell>
                          {entry.status === 'admin_accepted' &&
                          !entry.invoiceId ? (
                            <Checkbox
                              checked={selectedEntries?.has(entry.id) ?? false}
                              onCheckedChange={() => toggleEntry(entry)}
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
                          <TruncatedText
                            className='max-w-52 text-sm'
                            text={entry.description}
                          />
                          {entry.billable && (
                            <Tooltip>
                              <TooltipTrigger>
                                <DollarSign className='size-3 text-primary' />
                              </TooltipTrigger>
                              <TooltipContent>Billable</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <CustomValuesInline
                          customFields={customFields}
                          values={entry.customValues}
                        />
                      </TableCell>
                      <TableCell className='text-muted-foreground text-sm'>
                        {entry.requirementTitle ? (
                          <TruncatedText
                            className='max-w-36'
                            text={entry.requirementTitle}
                          >
                            <a
                              className='hover:underline'
                              href={`/${params.org}/${params.project}/requirements/${entry.requirementSlug}`}
                              rel='noopener'
                              target='_blank'
                            >
                              {entry.requirementTitle}
                            </a>
                          </TruncatedText>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell
                        className='whitespace-nowrap text-sm'
                        suppressHydrationWarning
                      >
                        {formatShortDate(entry.date)}
                      </TableCell>
                      <TableCell className='text-right font-medium text-sm'>
                        {formatMinutes(entry.durationMinutes)}
                      </TableCell>
                      <TableCell className='text-center'>
                        <StatusBadgeWithReason
                          entry={entry}
                          isClientInvolved={isClientInvolved}
                        />
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-1'>
                          <Button
                            className='size-7'
                            onClick={() => onEditClick(entry)}
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
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {pageCount > 1 && (
        <div className='flex items-center justify-end gap-3'>
          <span className='text-muted-foreground text-sm'>
            Page {page} of {pageCount}
          </span>
          <Button
            disabled={page <= 1}
            onClick={() => setFilters({ page: page - 1 })}
            size='icon'
            variant='outline'
          >
            <ChevronLeft className='size-4' />
          </Button>
          <Button
            disabled={page >= pageCount}
            onClick={() => setFilters({ page: page + 1 })}
            size='icon'
            variant='outline'
          >
            <ChevronRight className='size-4' />
          </Button>
        </div>
      )}

      {editEntry && (
        <TimeEntryForm
          customFields={customFields}
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
