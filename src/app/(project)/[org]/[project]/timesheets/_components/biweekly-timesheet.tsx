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
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
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
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSetSelection } from '@/hooks/use-set-selection'
import { deleteTimeEntryAction, submitTimesheetAction } from '../actions'
import { canDeleteTimeEntry, canEditTimeEntry, formatMinutes } from '../common'
import type { Requirement, TimeEntry } from '../types'
import { exportTimeEntries } from './export-time-entries'
import { StatusBadgeWithReason } from './status-badge-with-reason'
import { TimeEntryForm } from './time-entry-form'

interface BiweeklyTimesheetProps {
  currentMemberId: string
  entries: TimeEntry[]
  isAdmin?: boolean
  isClientInvolved?: boolean
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
  isClientInvolved,
}: BiweeklyTimesheetProps) {
  const [periodOffset, setPeriodOffset] = useState(0)
  const { selectedIds, toggle, toggleAll, clear } = useSetSelection<TimeEntry>(
    (e) => e.id
  )
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)
  const params = useParams()
  const router = useRouter()

  const { periodStart, periodEnd, week1Days, week2Days } = useMemo(() => {
    const start = addWeeks(
      startOfWeek(new Date(), { weekStartsOn: 1 }),
      periodOffset * 2
    )
    const end = endOfWeek(addWeeks(start, 1), { weekStartsOn: 1 })
    const w1 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return d
    })
    const w2 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + 7 + i)
      return d
    })
    return { periodStart: start, periodEnd: end, week1Days: w1, week2Days: w2 }
  }, [periodOffset])

  const periodEntries = useMemo(
    () =>
      entries.filter((e) => {
        const d = new Date(e.date)
        return d >= periodStart && d <= periodEnd
      }),
    [entries, periodStart, periodEnd]
  )

  const submittableEntries = useMemo(
    () =>
      periodEntries.filter(
        (e) => e.status === 'draft' && e.memberId === currentMemberId
      ),
    [periodEntries, currentMemberId]
  )

  const periodTotal = useMemo(
    () => periodEntries.reduce((sum, e) => sum + e.durationMinutes, 0),
    [periodEntries]
  )

  const submitAction = useAction(submitTimesheetAction, {
    onSuccess: () => {
      toast.success('Timesheet submitted for approval')
      clear()
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

  function handleSubmit() {
    if (selectedIds.size === 0) {
      toast.error('Select at least one draft entry to submit')
      return
    }
    submitAction.execute({ timeEntryIds: [...selectedIds] })
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
                    onCheckedChange={() => toggleAll(submittableEntries)}
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
                            onCheckedChange={() => toggle(entry.id)}
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
                          <Tooltip>
                            <TooltipTrigger>
                              <DollarSign className='size-3 text-primary' />
                            </TooltipTrigger>
                            <TooltipContent>Billable</TooltipContent>
                          </Tooltip>
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
                      <StatusBadgeWithReason
                        entry={entry}
                        isClientInvolved={isClientInvolved}
                      />
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <div className='flex items-center gap-1'>
                          {canEditTimeEntry(
                            entry,
                            currentMemberId,
                            isAdmin
                          ) && (
                            <Button
                              className='size-7'
                              onClick={() => setEditEntry(entry)}
                              size='icon'
                              variant='ghost'
                            >
                              <Pencil className='size-3.5' />
                            </Button>
                          )}
                          {canDeleteTimeEntry(
                            entry,
                            currentMemberId,
                            isAdmin
                          ) && (
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
              <Button
                disabled={periodEntries.length === 0}
                kbd='e'
                onClick={() =>
                  exportTimeEntries(
                    periodEntries,
                    `time-entries-${format(periodStart, 'yyyy-MM-dd')}.xlsx`
                  )
                }
                size='sm'
                variant='secondary'
              >
                Export
              </Button>
              {!isTeamView && submittableEntries.length > 0 && (
                <Button
                  disabled={selectedIds.size === 0 || submitAction.isPending}
                  loading={submitAction.isPending}
                  onClick={handleSubmit}
                  size='sm'
                >
                  <Send className='size-4' />
                  Submit Selected
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
