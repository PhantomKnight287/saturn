'use client'

import { useRouter } from '@bprogress/next/app'
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
import { StatusBadgeWithReason } from './status-badge-with-reason'
import { TimeEntryForm } from './time-entry-form'

interface WeeklyTimesheetProps {
  currentMemberId: string
  entries: TimeEntry[]
  isAdmin?: boolean
  isClientInvolved?: boolean
  isTeamView?: boolean
  onAddEntry?: () => void
  projectId: string
  requirements: Requirement[]
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export function WeeklyTimesheet({
  entries,
  requirements,
  projectId,
  currentMemberId,
  isAdmin = false,
  isTeamView = false,
  isClientInvolved,
  onAddEntry,
}: WeeklyTimesheetProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const { selectedIds, toggle, toggleAll, clear } = useSetSelection<TimeEntry>(
    (e) => e.id
  )
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)
  const params = useParams()
  const today = new Date()
  const monday = getMonday(today)
  monday.setDate(monday.getDate() + weekOffset * 7)
  const router = useRouter()

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })

  const weekEntries = entries.filter((e) => {
    const entryDate = new Date(e.date)
    return entryDate >= weekDays.at(0)! && entryDate <= weekDays.at(-1)!
  })

  // For personal view: draft entries the member can submit
  const submittableEntries = weekEntries.filter(
    (e) => e.status === 'draft' && e.memberId === currentMemberId
  )

  const dayTotals = weekDays.map((day) =>
    weekEntries
      .filter((e) => isSameDay(new Date(e.date), day))
      .reduce((sum, e) => sum + e.durationMinutes, 0)
  )

  const weekTotal = dayTotals.reduce((sum, t) => sum + t, 0)

  const submitAction = useAction(submitTimesheetAction, {
    onSuccess: () => {
      toast.success('Timesheet submitted for approval')
      clear()
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to submit timesheet')
    },
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

  const weekLabel = `${formatDate(weekDays.at(0)!)} – ${formatDate(weekDays.at(-1)!)}, ${weekDays.at(-1)!.getFullYear()}`

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Button
                className='size-8'
                onClick={() => setWeekOffset((w) => w - 1)}
                size='icon'
                variant='outline'
              >
                <ChevronLeft className='size-4' />
              </Button>
              <CardTitle className='text-base'>{weekLabel}</CardTitle>
              <Button
                className='size-8'
                onClick={() => setWeekOffset((w) => w + 1)}
                size='icon'
                variant='outline'
              >
                <ChevronRight className='size-4' />
              </Button>
              {weekOffset !== 0 && (
                <Button
                  className='text-xs'
                  onClick={() => setWeekOffset(0)}
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
                  {formatMinutes(weekTotal)}
                </span>
              </span>
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
          <div className='overflow-x-auto'>
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
                  {DAYS.map((day, i) => (
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
                      className='h-24 text-center text-muted-foreground'
                      colSpan={12}
                    >
                      No time entries this week.
                      {onAddEntry && (
                        <>
                          {' '}
                          <Button
                            className='p-0'
                            onClick={onAddEntry}
                            variant='link'
                          >
                            Log time
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  weekEntries.map((entry) => {
                    const entryDate = new Date(entry.date)
                    const isDraft =
                      entry.status === 'draft' &&
                      entry.memberId === currentMemberId
                    const rowTotal = entry.durationMinutes

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
                          {formatMinutes(rowTotal)}
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
