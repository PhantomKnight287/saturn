'use client'

import { useRouter } from '@bprogress/next/app'
import { format } from 'date-fns'
import {
  AlertOctagon,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Link2Off,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { milestones, requirements } from '@/server/db/schema'
import {
  completeMilestoneAction,
  deleteMilestoneAction,
  linkRequirementAction,
  unlinkRequirementAction,
  updateMilestoneAction,
} from '../actions'

type Milestone = typeof milestones.$inferSelect
type Requirement = typeof requirements.$inferSelect

interface LinkedRequirement {
  id: string
  milestoneId: string
  requirementId: string
  requirementSlug: string
  requirementStatus: Requirement['status']
  requirementTitle: string
  sortOrder: number
}

interface Progress {
  changesRequested: number
  draft: number
  sentForSign: number
  signed: number
  total: number
}

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Circle,
    className: '',
  },
  in_progress: {
    label: 'In Progress',
    icon: Loader2,
    className: 'border-blue-500/50 text-blue-600 dark:text-blue-400',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
  },
  blocked: {
    label: 'Blocked',
    icon: AlertOctagon,
    className: 'border-destructive/50 text-destructive',
  },
} as const

interface MilestoneDetailClientProps {
  allRequirements: Requirement[]
  canComplete: boolean
  canDelete: boolean
  canUpdate: boolean
  linkedRequirements: LinkedRequirement[]
  milestone: Milestone
  orgSlug: string
  progress: Progress
  projectSlug: string
}

export function MilestoneDetailClient({
  milestone,
  linkedRequirements,
  progress,
  allRequirements,
  orgSlug,
  projectSlug,
  canUpdate,
  canComplete,
  canDelete,
}: MilestoneDetailClientProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [selectedRequirementId, setSelectedRequirementId] = useState('')

  const status = statusConfig[milestone.status]
  const StatusIcon = status.icon
  const progressPercent =
    progress.total > 0
      ? Math.round((progress.signed / progress.total) * 100)
      : 0

  const linkedIds = new Set(linkedRequirements.map((lr) => lr.requirementId))
  const unlinkableRequirements = allRequirements.filter(
    (r) => !linkedIds.has(r.id)
  )

  const { execute: executeComplete, isPending: isCompleting } = useAction(
    completeMilestoneAction,
    {
      onSuccess() {
        toast.success('Milestone completed')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to complete milestone')
      },
    }
  )

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteMilestoneAction,
    {
      onSuccess() {
        toast.success('Milestone deleted')
        router.push(`/${orgSlug}/${projectSlug}/milestones`)
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to delete milestone')
      },
    }
  )

  const { execute: executeUpdate } = useAction(updateMilestoneAction, {
    onSuccess() {
      toast.success('Milestone updated')
      setBlockDialogOpen(false)
      setBlockReason('')
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to update milestone')
    },
  })

  const { execute: executeLink, isPending: isLinking } = useAction(
    linkRequirementAction,
    {
      onSuccess() {
        toast.success('Requirement linked')
        setLinkDialogOpen(false)
        setSelectedRequirementId('')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to link requirement')
      },
    }
  )

  const { execute: executeUnlink } = useAction(unlinkRequirementAction, {
    onSuccess() {
      toast.success('Requirement unlinked')
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to unlink requirement')
    },
  })

  return (
    <div className='w-full'>
      <div className='mb-6'>
        <Link
          className='mb-4 inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground'
          href={`/${orgSlug}/${projectSlug}/milestones`}
        >
          <ArrowLeft className='size-4' />
          Back to milestones
        </Link>

        <div className='flex items-start justify-between gap-4'>
          <div>
            <h1 className='font-semibold text-2xl'>{milestone.name}</h1>
            {milestone.description && (
              <p className='mt-1 text-muted-foreground'>
                {milestone.description}
              </p>
            )}
          </div>
          <Badge className={cn(status.className)} variant='outline'>
            <StatusIcon className='size-3' />
            {status.label}
          </Badge>
        </div>

        <div className='mt-3 flex flex-wrap items-center gap-4 text-muted-foreground text-sm'>
          {milestone.dueDate && (
            <span className='flex items-center gap-1'>
              <Calendar className='size-4' />
              Due {format(new Date(milestone.dueDate), 'MMM d, yyyy')}
            </span>
          )}
          {milestone.completedAt && (
            <span className='flex items-center gap-1'>
              <CheckCircle2 className='size-4' />
              Completed {format(new Date(milestone.completedAt), 'MMM d, yyyy')}
            </span>
          )}
          {milestone.budgetAmountCents != null && (
            <span>
              Budget: ${(milestone.budgetAmountCents / 100).toLocaleString()}
            </span>
          )}
          {milestone.budgetMinutes != null && (
            <span className='flex items-center gap-1'>
              <Clock className='size-4' />
              {Math.floor(milestone.budgetMinutes / 60)}h{' '}
              {milestone.budgetMinutes % 60}m budget
            </span>
          )}
        </div>

        {milestone.status === 'blocked' && milestone.blockReason && (
          <div className='mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm'>
            <strong>Blocked:</strong> {milestone.blockReason}
          </div>
        )}
      </div>

      {(canUpdate || canComplete || canDelete) && (
        <div className='mb-6 flex flex-wrap gap-2'>
          {canComplete && milestone.status !== 'completed' && (
            <Button
              disabled={isCompleting}
              onClick={() => executeComplete({ milestoneId: milestone.id })}
              size='sm'
            >
              <CheckCircle2 className='size-4' />
              {isCompleting ? 'Completing...' : 'Mark as Complete'}
            </Button>
          )}
          {canUpdate && milestone.status !== 'blocked' && (
            <Button
              onClick={() => setBlockDialogOpen(true)}
              size='sm'
              variant='outline'
            >
              <AlertOctagon className='size-4' />
              Mark as Blocked
            </Button>
          )}
          {canUpdate && milestone.status === 'blocked' && (
            <Button
              onClick={() =>
                executeUpdate({
                  milestoneId: milestone.id,
                  status: 'in_progress',
                })
              }
              size='sm'
              variant='outline'
            >
              Unblock
            </Button>
          )}
          {canUpdate && milestone.status === 'pending' && (
            <Button
              onClick={() =>
                executeUpdate({
                  milestoneId: milestone.id,
                  status: 'in_progress',
                })
              }
              size='sm'
              variant='outline'
            >
              <Loader2 className='size-4' />
              Start Progress
            </Button>
          )}
          {canDelete && (
            <Button
              onClick={() => setDeleteDialogOpen(true)}
              size='sm'
              variant='destructive'
            >
              <Trash2 className='size-4' />
              Delete
            </Button>
          )}
        </div>
      )}

      {progress.total > 0 && (
        <div className='mb-6 rounded-lg border p-4'>
          <div className='mb-2 flex items-center justify-between text-sm'>
            <span className='font-medium'>Progress</span>
            <span className='text-muted-foreground'>
              {progress.signed}/{progress.total} signed ({progressPercent}%)
            </span>
          </div>
          <div className='mb-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary'>
            <div
              className='h-full rounded-full bg-emerald-500 transition-all'
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className='flex flex-wrap gap-3 text-muted-foreground text-xs'>
            {progress.draft > 0 && <span>{progress.draft} draft</span>}
            {progress.sentForSign > 0 && (
              <span>{progress.sentForSign} sent for sign</span>
            )}
            {progress.changesRequested > 0 && (
              <span>{progress.changesRequested} changes requested</span>
            )}
          </div>
        </div>
      )}

      <div>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='font-medium text-muted-foreground text-sm uppercase tracking-wide'>
            Linked Requirements
          </h2>
          {canUpdate && unlinkableRequirements.length > 0 && (
            <Button
              onClick={() => setLinkDialogOpen(true)}
              size='sm'
              variant='outline'
            >
              <Plus className='size-4' />
              Link Requirement
            </Button>
          )}
        </div>

        {linkedRequirements.length === 0 ? (
          <p className='text-muted-foreground text-sm'>
            No requirements linked to this milestone yet.
          </p>
        ) : (
          <div className='divide-y rounded-lg border'>
            {linkedRequirements.map((lr) => (
              <div
                className='flex items-center justify-between gap-3 px-4 py-2.5'
                key={lr.id}
              >
                <Link
                  className='min-w-0 flex-1 truncate text-sm hover:underline'
                  href={`/${orgSlug}/${projectSlug}/requirements/${lr.requirementSlug}`}
                >
                  {lr.requirementTitle}
                </Link>
                <div className='flex shrink-0 items-center gap-2'>
                  <StatusBadge status={lr.requirementStatus} />
                  {canUpdate && (
                    <Button
                      className='size-7 p-0 text-muted-foreground hover:text-destructive'
                      onClick={() =>
                        executeUnlink({
                          milestoneId: milestone.id,
                          requirementId: lr.requirementId,
                        })
                      }
                      size='sm'
                      variant='ghost'
                    >
                      <Link2Off className='size-3.5' />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Milestone</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{milestone.name}&quot;? This
              action cannot be undone. Linked requirements will not be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              variant='outline'
            >
              Cancel
            </Button>
            <Button
              disabled={isDeleting}
              onClick={() => executeDelete({ milestoneId: milestone.id })}
              variant='destructive'
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setBlockDialogOpen} open={blockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Blocked</DialogTitle>
            <DialogDescription>
              Provide a reason for blocking this milestone.
            </DialogDescription>
          </DialogHeader>
          <div className='mt-4 grid gap-2'>
            <Label>Block Reason</Label>
            <Input
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder='e.g. Waiting on client approval...'
              value={blockReason}
            />
          </div>
          <DialogFooter className='mt-4'>
            <Button onClick={() => setBlockDialogOpen(false)} variant='outline'>
              Cancel
            </Button>
            <Button
              disabled={!blockReason.trim()}
              onClick={() =>
                executeUpdate({
                  milestoneId: milestone.id,
                  status: 'blocked',
                  blockReason,
                })
              }
            >
              Block Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setLinkDialogOpen} open={linkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Requirement</DialogTitle>
            <DialogDescription>
              Choose a requirement to link to this milestone.
            </DialogDescription>
          </DialogHeader>
          <div className='mt-4 grid gap-2'>
            <Label>Requirement</Label>
            <Select
              onValueChange={setSelectedRequirementId}
              value={selectedRequirementId}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select a requirement' />
              </SelectTrigger>
              <SelectContent>
                {unlinkableRequirements.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className='mt-4'>
            <Button onClick={() => setLinkDialogOpen(false)} variant='outline'>
              Cancel
            </Button>
            <Button
              disabled={!selectedRequirementId || isLinking}
              onClick={() =>
                executeLink({
                  milestoneId: milestone.id,
                  requirementId: selectedRequirementId,
                })
              }
            >
              {isLinking ? 'Linking...' : 'Link Requirement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
