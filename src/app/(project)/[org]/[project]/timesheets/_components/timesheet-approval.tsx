'use client'

import { useRouter } from '@bprogress/next/app'
import { CheckCircle2, Pencil, XCircle } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { useSetSelection } from '@/hooks/use-set-selection'
import { approveTimeEntriesAction, rejectTimeEntriesAction } from '../actions'
import { formatMinutes } from '../common'
import type { ProjectMember, Requirement, TimeEntry } from '../types'
import { RejectTimeEntriesDialog } from './reject-time-entries-dialog'
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
  const { selectedIds, toggle, toggleAll, clear } = useSetSelection<TimeEntry>(
    (e) => e.id
  )
  const [rejectOpen, setRejectOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)
  const router = useRouter()
  const approveAction = useAction(approveTimeEntriesAction, {
    onSuccess: () => {
      toast.success('Time entries approved')
      clear()
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to approve entries')
    },
  })

  const rejectAction = useAction(rejectTimeEntriesAction, {
    onSuccess: () => {
      toast.success('Time entries rejected')
      clear()
      setRejectOpen(false)
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to reject entries')
    },
  })

  const grouped = useMemo(
    () =>
      entries.reduce<Record<string, TimeEntry[]>>((acc, entry) => {
        const key = entry.memberId
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(entry)
        return acc
      }, {}),
    [entries]
  )

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
                    onCheckedChange={() => toggleAll(memberEntries)}
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
                      onCheckedChange={() => toggle(entry.id)}
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

      <RejectTimeEntriesDialog
        isPending={rejectAction.isPending}
        onOpenChange={setRejectOpen}
        onSubmit={(reason) =>
          rejectAction.execute({
            timeEntryIds: [...selectedIds],
            reason,
          })
        }
        open={rejectOpen}
      />

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
