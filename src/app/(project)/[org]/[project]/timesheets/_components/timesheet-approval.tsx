'use client'

import { CheckCircle2, Pencil, XCircle } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { approveTimeEntriesAction, rejectTimeEntriesAction } from '../actions'
import { formatMinutes } from '../common'
import type { ProjectMember, Requirement, TimeEntry } from '../types'
import { TimeEntryForm } from './time-entry-form'

interface TimesheetApprovalProps {
  entries: TimeEntry[]
  projectId: string
  projectMembers: ProjectMember[]
  requirements: Requirement[]
}

export function TimesheetApproval({
  entries,
  projectMembers,
  projectId,
  requirements,
}: TimesheetApprovalProps) {
  const rejectReasonId = useId()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)

  const approveAction = useAction(approveTimeEntriesAction, {
    onSuccess: () => {
      toast.success('Time entries approved')
      setSelectedIds(new Set())
    },
    onError: ({ error }) => {
      console.log(error)
      toast.error(error.serverError ?? 'Failed to approve entries')
    },
  })

  const rejectAction = useAction(rejectTimeEntriesAction, {
    onSuccess: () => {
      toast.success('Time entries rejected')
      setSelectedIds(new Set())
      setRejectOpen(false)
      setRejectReason('')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to reject entries')
    },
  })

  const grouped = entries.reduce<Record<string, TimeEntry[]>>((acc, entry) => {
    const key = entry.memberId
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(entry)
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

  function toggleMemberGroup(memberEntries: TimeEntry[]) {
    const allSelected = memberEntries.every((e) => selectedIds.has(e.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const entry of memberEntries) {
        if (allSelected) {
          next.delete(entry.id)
        } else {
          next.add(entry.id)
        }
      }
      return next
    })
  }

  if (entries.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <CheckCircle2 />
          </EmptyMedia>
          <EmptyTitle>No pending approvals</EmptyTitle>
          <EmptyDescription>
            All submitted timesheets have been reviewed.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-muted-foreground text-sm'>
          {entries.length} submitted{' '}
          {entries.length === 1 ? 'entry' : 'entries'} awaiting review
        </p>
        <div className='flex items-center gap-2'>
          <Button
            disabled={selectedIds.size === 0 || rejectAction.isPending}
            onClick={() => setRejectOpen(true)}
            size='sm'
            variant='outline'
          >
            <XCircle className='size-4' />
            Reject
          </Button>
          <Button
            disabled={selectedIds.size === 0 || approveAction.isPending}
            onClick={() =>
              approveAction.execute({ timeEntryIds: [...selectedIds] })
            }
            size='sm'
          >
            <CheckCircle2 className='size-4' />
            {approveAction.isPending ? 'Approving...' : 'Approve'}
          </Button>
        </div>
      </div>

      {Object.entries(grouped).map(([memberId, memberEntries]) => {
        const member = projectMembers.find((m) => m.id === memberId)
        const totalMinutes = memberEntries.reduce(
          (sum, e) => sum + e.durationMinutes,
          0
        )
        const allSelected = memberEntries.every((e) => selectedIds.has(e.id))

        return (
          <Card key={memberId}>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => toggleMemberGroup(memberEntries)}
                  />
                  <div>
                    <CardTitle className='text-base'>
                      {member?.name ?? member?.email ?? 'Unknown'}
                    </CardTitle>
                    <p className='text-muted-foreground text-sm'>
                      {memberEntries.length}{' '}
                      {memberEntries.length === 1 ? 'entry' : 'entries'} ·{' '}
                      {formatMinutes(totalMinutes)}
                    </p>
                  </div>
                </div>
                <Badge variant='secondary'>{formatMinutes(totalMinutes)}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                {memberEntries.map((entry) => (
                  <div
                    className='flex items-center gap-3 rounded-md border px-3 py-2'
                    key={entry.id}
                  >
                    <Checkbox
                      checked={selectedIds.has(entry.id)}
                      onCheckedChange={() => toggleSelect(entry.id)}
                    />
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm'>{entry.description}</p>
                      <p className='text-muted-foreground text-xs'>
                        {entry.requirementTitle ?? 'General'} ·{' '}
                        {new Date(entry.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      {entry.billable && (
                        <Badge className='text-xs' variant='outline'>
                          Billable
                        </Badge>
                      )}
                      <span className='font-medium text-sm'>
                        {formatMinutes(entry.durationMinutes)}
                      </span>
                      <Button
                        className='size-7'
                        onClick={() => setEditEntry(entry)}
                        size='icon'
                        title='Edit entry before approving'
                        variant='ghost'
                      >
                        <Pencil className='size-3.5' />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      <Dialog onOpenChange={setRejectOpen} open={rejectOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Reject Time Entries</DialogTitle>
            <DialogDescription>
              Provide a reason so the team member can make corrections and
              resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2'>
            <Label htmlFor={rejectReasonId}>Reason</Label>
            <Textarea
              id={rejectReasonId}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder='Please explain what needs to be corrected...'
              rows={3}
              value={rejectReason}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setRejectOpen(false)} variant='outline'>
              Cancel
            </Button>
            <Button
              disabled={!rejectReason.trim() || rejectAction.isPending}
              onClick={() =>
                rejectAction.execute({
                  timeEntryIds: [...selectedIds],
                  reason: rejectReason,
                })
              }
              variant='destructive'
            >
              {rejectAction.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
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
