'use client'

import { useRouter } from '@bprogress/next/app'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { cn } from '@/lib/utils'
import { deleteTimeEntryAction, submitTimesheetAction } from '../actions'
import { canDeleteTimeEntry, canEditTimeEntry, formatMinutes } from '../common'
import type { Requirement, TimeEntry } from '../types'
import { exportTimeEntries } from './export-time-entries'
import { StatusBadgeWithReason } from './status-badge-with-reason'
import { TimeEntryForm } from './time-entry-form'

interface MonthlyTimesheetProps {
  currentMemberId: string
  entries: TimeEntry[]
  isAdmin?: boolean
  isClientInvolved?: boolean
  isTeamView?: boolean
  onAddEntry?: (day?: Date) => void
  projectId: string
  requirements: Requirement[]
}

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function MonthlyTimesheet({
  entries,
  requirements,
  projectId,
  currentMemberId,
  isAdmin = false,
  isTeamView = false,
  isClientInvolved,
  onAddEntry,
}: MonthlyTimesheetProps) {
  const [monthOffset, setMonthOffset] = useState(0)
  const { selectedIds, toggle, clear } = useSetSelection<TimeEntry>((e) => e.id)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)
  const params = useParams()
  const router = useRouter()

  const { currentMonth, monthStart, monthEnd, weeks } = useMemo(() => {
    const month = addMonths(startOfMonth(new Date()), monthOffset)
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const calendarStart = startOfWeek(start, { weekStartsOn: 1 })
    const lastDayOfWeek = getDay(end)
    const calendarEnd = new Date(end)
    if (lastDayOfWeek !== 0) {
      calendarEnd.setDate(calendarEnd.getDate() + (7 - lastDayOfWeek))
    }
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
    const grid: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
      grid.push(days.slice(i, i + 7))
    }
    return {
      currentMonth: month,
      monthStart: start,
      monthEnd: end,
      weeks: grid,
    }
  }, [monthOffset])

  const monthEntries = useMemo(
    () =>
      entries.filter((e) => {
        const d = new Date(e.date)
        return d >= monthStart && d <= monthEnd
      }),
    [entries, monthStart, monthEnd]
  )

  const submittableEntries = useMemo(
    () =>
      monthEntries.filter(
        (e) => e.status === 'draft' && e.memberId === currentMemberId
      ),
    [monthEntries, currentMemberId]
  )

  const monthTotal = useMemo(
    () => monthEntries.reduce((sum, e) => sum + e.durationMinutes, 0),
    [monthEntries]
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

  function getEntriesForDay(day: Date) {
    return monthEntries.filter((e) => isSameDay(new Date(e.date), day))
  }

  function getDayTotal(day: Date) {
    return getEntriesForDay(day).reduce((sum, e) => sum + e.durationMinutes, 0)
  }

  const showActions = !isTeamView || isAdmin
  const showCheckboxes = !isTeamView && submittableEntries.length > 0

  const dayEntries = selectedDay ? getEntriesForDay(selectedDay) : []

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Button
                className='size-8'
                onClick={() => setMonthOffset((m) => m - 1)}
                size='icon'
                variant='outline'
              >
                <ChevronLeft className='size-4' />
              </Button>
              <CardTitle className='text-base'>
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <Button
                className='size-8'
                onClick={() => setMonthOffset((m) => m + 1)}
                size='icon'
                variant='outline'
              >
                <ChevronRight className='size-4' />
              </Button>
              {monthOffset !== 0 && (
                <Button
                  className='text-xs'
                  onClick={() => setMonthOffset(0)}
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
                  {formatMinutes(monthTotal)}
                </span>
              </span>
              <Button
                disabled={monthEntries.length === 0}
                kbd='e'
                onClick={() =>
                  exportTimeEntries(
                    monthEntries,
                    `time-entries-${format(currentMonth, 'yyyy-MM')}.xlsx`
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
        <CardContent className='p-0'>
          {/* Calendar grid */}
          <div className='grid grid-cols-7'>
            {WEEKDAY_HEADERS.map((day) => (
              <div
                className='border-b px-2 py-1.5 text-center font-medium text-muted-foreground text-xs'
                key={day}
              >
                {day}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div className='grid grid-cols-7' key={wi}>
              {week.map((day) => {
                const dayTotal = getDayTotal(day)
                const dayEntriesCount = getEntriesForDay(day).length
                const inMonth = isSameMonth(day, currentMonth)
                const today = isToday(day)

                return (
                  <button
                    className={cn(
                      'flex min-h-20 flex-col items-start border-r border-b p-2 text-left transition-colors hover:bg-muted/50',
                      !inMonth && 'bg-muted/20 text-muted-foreground/50',
                      today && 'bg-primary/5'
                    )}
                    key={day.toISOString()}
                    onClick={() => {
                      if (dayEntriesCount > 0) {
                        setSelectedDay(day)
                      } else if (onAddEntry) {
                        onAddEntry(day)
                      }
                    }}
                    type='button'
                  >
                    <span
                      className={cn(
                        'text-sm',
                        today &&
                          'flex size-6 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayTotal > 0 && inMonth && (
                      <div className='mt-1 space-y-0.5'>
                        <span className='rounded bg-primary/10 px-1 py-0.5 font-medium text-primary text-xs'>
                          {formatMinutes(dayTotal)}
                        </span>
                        <p className='text-muted-foreground text-xs'>
                          {dayEntriesCount}{' '}
                          {dayEntriesCount === 1 ? 'entry' : 'entries'}
                        </p>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDay(null)
          }
        }}
        open={!!selectedDay}
      >
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <div className='flex items-center justify-between'>
              <DialogTitle>
                {selectedDay && format(selectedDay, 'EEEE, MMMM d, yyyy')}
              </DialogTitle>
              {onAddEntry && (
                <Button
                  className='mr-2'
                  onClick={() => {
                    const day = selectedDay
                    setSelectedDay(null)
                    onAddEntry(day ?? undefined)
                  }}
                  size='sm'
                >
                  Log Time
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  {showCheckboxes && <TableHead className='w-10' />}
                  {isTeamView && <TableHead>Member</TableHead>}
                  <TableHead>Description</TableHead>
                  <TableHead>Requirement</TableHead>
                  <TableHead className='w-20 text-right'>Duration</TableHead>
                  <TableHead className='w-20 text-center'>Status</TableHead>
                  {showActions && <TableHead className='w-16' />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayEntries.map((entry) => {
                  const isDraft =
                    entry.status === 'draft' &&
                    entry.memberId === currentMemberId

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
                          <span className='text-sm'>{entry.description}</span>
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
                        <a
                          className='hover:underline'
                          href={`/${params.org}/${params.project}/requirements/${entry.requirementSlug}`}
                          target='_blank'
                        >
                          {entry.requirementTitle ?? '—'}
                        </a>
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
                                onClick={() => {
                                  setSelectedDay(null)
                                  setEditEntry(entry)
                                }}
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
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

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
