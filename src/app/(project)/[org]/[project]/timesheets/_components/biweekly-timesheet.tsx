'use client'

import { useRouter } from '@bprogress/next/app'
import { addWeeks, endOfWeek, format, isSameDay, startOfWeek } from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Pencil,
  Send,
  Trash2,
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { deleteTimeEntryAction, submitTimesheetAction } from '../actions'
import { formatMinutes } from '../common'
import type { Requirement, TimeEntry } from '../types'
import { TimeEntryForm } from './time-entry-form'

interface BiweeklyTimesheetProps {
  currentMemberId: string
  entries: TimeEntry[]
  isAdmin?: boolean
  isTeamView?: boolean
  onAddEntry?: () => void
  projectId: string
  requirements: Requirement[]
}

const DAY_ABBRS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export function BiweeklyTimesheet({
  entries,
  requirements,
  projectId,
  currentMemberId,
  isAdmin = false,
  isTeamView = false,
}: BiweeklyTimesheetProps) {
  const [periodOffset, setPeriodOffset] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)
  const params = useParams()
  const router = useRouter()

  const periodStart = addWeeks(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    periodOffset * 2
  )
  const periodEnd = endOfWeek(addWeeks(periodStart, 1), { weekStartsOn: 1 })

  const week1Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(periodStart)
    d.setDate(d.getDate() + i)
    return d
  })
  const week2Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(periodStart)
    d.setDate(d.getDate() + 7 + i)
    return d
  })

  const periodEntries = entries.filter((e) => {
    const d = new Date(e.date)
    return d >= periodStart && d <= periodEnd
  })

  const submittableEntries = periodEntries.filter(
    (e) => e.status === 'draft' && e.memberId === currentMemberId
  )

  const periodTotal = periodEntries.reduce(
    (sum, e) => sum + e.durationMinutes,
    0
  )

  const submitAction = useAction(submitTimesheetAction, {
    onSuccess: () => {
      toast.success('Timesheet submitted for approval')
      setSelectedIds(new Set())
      router.refresh()
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? 'Failed to submit timesheet'),
  })

  const deleteAction = useAction(deleteTimeEntryAction, {
    onSuccess: () => {
      toast.success('Time entry deleted')
      router.refresh()
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? 'Failed to delete entry'),
  })

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds(
      selectedIds.size === submittableEntries.length
        ? new Set()
        : new Set(submittableEntries.map((e) => e.id))
    )
  }

  function handleSubmit() {
    if (selectedIds.size === 0) {
      toast.error('Select at least one draft entry to submit')
      return
    }
    submitAction.execute({ timeEntryIds: [...selectedIds] })
  }

  function canEdit(entry: TimeEntry): boolean {
    if (isAdmin) {
      return true
    }
    if (entry.memberId !== currentMemberId) {
      return false
    }
    return entry.status === 'draft' || entry.status === 'admin_rejected'
  }

  function canDelete(entry: TimeEntry): boolean {
    if (isAdmin) {
      return true
    }
    if (entry.memberId !== currentMemberId) {
      return false
    }
    return entry.status === 'draft'
  }

  const showActions = !isTeamView || isAdmin
  const showCheckboxes = !isTeamView && submittableEntries.length > 0

  const periodLabel = `${format(periodStart, 'MMM d')} – ${format(periodEnd, 'MMM d, yyyy')}`

  function renderWeekTable(weekDays: Date[], weekLabel: string) {
    const weekEntries = periodEntries.filter((e) => {
      const d = new Date(e.date)
      return d >= weekDays.at(0)! && d <= weekDays.at(-1)!
    })

    const dayTotals = weekDays.map((day) =>
      weekEntries
        .filter((e) => isSameDay(new Date(e.date), day))
        .reduce((sum, e) => sum + e.durationMinutes, 0)
    )

    const weekTotal = dayTotals.reduce((sum, t) => sum + t, 0)

    return (
      <div>
        <div className='flex items-center justify-between px-4 py-2'>
          <span className='font-medium text-sm'>{weekLabel}</span>
          <span className='text-muted-foreground text-sm'>
            {formatMinutes(weekTotal)}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {showCheckboxes && (
                <TableHead className='w-10'>
                  <Checkbox
                    checked={
                      submittableEntries.length > 0 &&
                      selectedIds.size === submittableEntries.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
              {isTeamView && <TableHead>Member</TableHead>}
              <TableHead>Description</TableHead>
              <TableHead>Requirement</TableHead>
              {DAY_ABBRS.map((day, i) => (
                <TableHead className='w-16 text-center' key={day}>
                  <div className='text-xs'>{day}</div>
                  <div className='font-normal text-muted-foreground text-xs'>
                    {weekDays.at(i)!.getDate()}
                  </div>
                </TableHead>
              ))}
              <TableHead className='w-16 text-center'>Total</TableHead>
              <TableHead className='w-20 text-center'>Status</TableHead>
              {showActions && <TableHead className='w-16' />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {weekEntries.length === 0 ? (
              <TableRow>
                <TableCell
                  className='h-16 text-center text-muted-foreground'
                  colSpan={20}
                >
                  No time entries this week.
                </TableCell>
              </TableRow>
            ) : (
              weekEntries.map((entry) => {
                const entryDate = new Date(entry.date)
                const isDraft =
                  entry.status === 'draft' && entry.memberId === currentMemberId

                return (
                  <TableRow key={entry.id}>
                    {showCheckboxes && (
                      <TableCell>
                        {isDraft && (
                          <Checkbox
                            checked={selectedIds.has(entry.id)}
                            onCheckedChange={() => toggleSelect(entry.id)}
                          />
                        )}
                      </TableCell>
                    )}
                    {isTeamView && (
                      <TableCell className='text-sm'>
                        {entry.memberName ?? entry.memberEmail}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <span className='line-clamp-1 max-w-56 overflow-ellipsis text-sm'>
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
                      <span className='line-clamp-1 max-w-32'>
                        <a
                          className='hover:underline'
                          href={`/${params.org}/${params.project}/requirements/${entry.requirementSlug}`}
                          target='_blank'
                        >
                          {entry.requirementTitle ?? '—'}
                        </a>
                      </span>
                    </TableCell>
                    {weekDays.map((day) => (
                      <TableCell
                        className='text-center text-sm'
                        key={day.toISOString()}
                      >
                        {isSameDay(entryDate, day)
                          ? formatMinutes(entry.durationMinutes)
                          : ''}
                      </TableCell>
                    ))}
                    <TableCell className='text-center font-medium text-sm'>
                      {formatMinutes(entry.durationMinutes)}
                    </TableCell>
                    <TableCell className='text-center'>
                      {entry.status === 'admin_rejected' &&
                      entry.rejectReason ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <StatusBadge status={entry.status} />
                            </TooltipTrigger>
                            <TooltipContent className='max-w-xs' side='left'>
                              <p className='font-medium'>Reason:</p>
                              <p>{entry.rejectReason}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <StatusBadge status={entry.status} />
                      )}
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <div className='flex items-center gap-1'>
                          {canEdit(entry) && (
                            <Button
                              className='size-7'
                              onClick={() => setEditEntry(entry)}
                              size='icon'
                              variant='ghost'
                            >
                              <Pencil className='size-3.5' />
                            </Button>
                          )}
                          {canDelete(entry) && (
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
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
            {weekEntries.length > 0 && (
              <TableRow className='bg-muted/50 font-medium'>
                {showCheckboxes && <TableCell />}
                {isTeamView && <TableCell />}
                <TableCell className='text-sm'>Day Totals</TableCell>
                <TableCell />
                {dayTotals.map((total, i) => (
                  <TableCell
                    className='text-center text-sm'
                    key={weekDays.at(i)!.toISOString()}
                  >
                    {total > 0 ? formatMinutes(total) : ''}
                  </TableCell>
                ))}
                <TableCell className='text-center text-sm'>
                  {formatMinutes(weekTotal)}
                </TableCell>
                <TableCell />
                {showActions && <TableCell />}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Button
                className='size-8'
                onClick={() => setPeriodOffset((p) => p - 1)}
                size='icon'
                variant='outline'
              >
                <ChevronLeft className='size-4' />
              </Button>
              <CardTitle className='text-base'>{periodLabel}</CardTitle>
              <Button
                className='size-8'
                onClick={() => setPeriodOffset((p) => p + 1)}
                size='icon'
                variant='outline'
              >
                <ChevronRight className='size-4' />
              </Button>
              {periodOffset !== 0 && (
                <Button
                  className='text-xs'
                  onClick={() => setPeriodOffset(0)}
                  size='sm'
                  variant='ghost'
                >
                  Today
                </Button>
              )}
            </div>
            <div className='flex items-center gap-3'>
              <span className='text-muted-foreground text-sm'>
                Total:{' '}
                <span className='font-medium text-foreground'>
                  {formatMinutes(periodTotal)}
                </span>
              </span>
              {!isTeamView && submittableEntries.length > 0 && (
                <Button
                  disabled={selectedIds.size === 0 || submitAction.isPending}
                  onClick={handleSubmit}
                  size='sm'
                >
                  <Send className='size-4' />
                  {submitAction.isPending ? 'Submitting...' : 'Submit Selected'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4 p-0'>
          {renderWeekTable(
            week1Days,
            `Week 1: ${format(week1Days.at(0)!, 'MMM d')} – ${format(week1Days.at(-1)!, 'MMM d')}`
          )}
          {renderWeekTable(
            week2Days,
            `Week 2: ${format(week2Days.at(0)!, 'MMM d')} – ${format(week2Days.at(-1)!, 'MMM d')}`
          )}
        </CardContent>
      </Card>

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
