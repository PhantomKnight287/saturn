'use client'

import { formatDistanceToNow } from 'date-fns'
import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  XCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { changeRequestStatusEnum } from '@/server/db/schema'
import { resolveChangeRequestAction } from '../action'
import type { ChangeRequest, Thread } from '../types'

const statusConfig: Record<
  (typeof changeRequestStatusEnum.enumValues)[number],
  { label: string; variant: 'destructive' | 'secondary' | 'outline' }
> = {
  pending: { label: 'Pending', variant: 'destructive' },
  accepted: { label: 'Accepted', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'outline' },
}

function ReferencedThread({ thread }: { thread: Thread }) {
  return (
    <div className='flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2'>
      <MessageSquare className='mt-0.5 size-3.5 shrink-0 text-muted-foreground' />
      <div className='min-w-0'>
        <p className='line-clamp-1 text-muted-foreground text-sm italic'>
          &ldquo;{thread.selectedText}&rdquo;
        </p>
        {thread.messages[0] && (
          <p className='line-clamp-1 text-muted-foreground/70 text-xs'>
            {thread.messages[0].body}
          </p>
        )}
      </div>
    </div>
  )
}

function ChangeRequestItem({
  changeRequest,
  threads,
  canResolve,
  orgSlug,
  projectId,
  requirementId,
}: {
  changeRequest: ChangeRequest
  threads: Thread[]
  canResolve: boolean
  orgSlug: string
  projectId: string
  requirementId: string
}) {
  const router = useRouter()
  const config = statusConfig[changeRequest.status]
  const referencedThreads = changeRequest.referencedThreadIds
    ? threads.filter((t) => changeRequest.referencedThreadIds!.includes(t.id))
    : []

  const { execute: executeResolve, isPending } = useAction(
    resolveChangeRequestAction,
    {
      onSuccess(data) {
        toast.success(
          data?.data?.status === 'accepted'
            ? 'Change request accepted'
            : 'Change request rejected'
        )
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to resolve change request')
      },
    }
  )

  const handleResolve = (resolution: 'accepted' | 'rejected') => {
    executeResolve({
      changeRequestId: changeRequest.id,
      orgSlug,
      resolution,
      projectId,
      requirementId,
    })
  }

  return (
    <div className='rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20'>
      <div className='px-4 py-3'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex items-start gap-3'>
            <Avatar className='size-7 shrink-0'>
              <AvatarImage
                alt={changeRequest.requestedByName || 'User'}
                src={changeRequest.requestedByImage || ''}
              />
              <AvatarFallback className='text-xs'>
                {(changeRequest.requestedByName || 'U')
                  .substring(0, 1)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <span className='font-medium text-sm'>
                  {changeRequest.requestedByName || 'Unknown'}
                </span>
                <span className='text-muted-foreground text-xs'>
                  {formatDistanceToNow(new Date(changeRequest.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p className='mt-1 whitespace-pre-wrap text-sm'>
                {changeRequest.description}
              </p>
            </div>
          </div>
          <Badge className='' variant={config.variant}>
            {config.label}
          </Badge>
        </div>

        {referencedThreads.length > 0 && (
          <div className='mt-3 space-y-1.5 pl-10'>
            <p className='font-medium text-muted-foreground text-xs'>
              Referenced threads
            </p>
            {referencedThreads.map((thread) => (
              <ReferencedThread key={thread.id} thread={thread} />
            ))}
          </div>
        )}

        {canResolve && changeRequest.status === 'pending' && (
          <div className='mt-3 flex justify-end gap-2 border-t pt-3'>
            <Button
              loading={isPending}
              onClick={() => handleResolve('rejected')}
              size='sm'
              variant='outline'
            >
              <XCircle className='size-3.5' />
              Reject
            </Button>
            <Button
              loading={isPending}
              onClick={() => handleResolve('accepted')}
              size='sm'
            >
              <CheckCircle2 className='size-3.5' />
              Accept
            </Button>
          </div>
        )}

        {changeRequest.resolvedAt && (
          <p className='mt-2 pl-10 text-muted-foreground text-xs'>
            Resolved{' '}
            {formatDistanceToNow(new Date(changeRequest.resolvedAt), {
              addSuffix: true,
            })}
          </p>
        )}
      </div>
    </div>
  )
}

interface ChangeRequestsPanelProps {
  canResolve: boolean
  changeRequests: ChangeRequest[]
  orgSlug: string
  projectId: string
  requirementId: string
  threads: Thread[]
}

export default function ChangeRequestsPanel({
  changeRequests,
  threads,
  canResolve,
  orgSlug,
  projectId,
  requirementId,
}: ChangeRequestsPanelProps) {
  if (changeRequests.length === 0) {
    return null
  }

  const pendingCount = changeRequests.filter(
    (cr) => cr.status === 'pending'
  ).length

  return (
    <div className='mt-8'>
      <h3 className='mb-4 flex items-center gap-2 font-medium text-amber-700 text-sm dark:text-amber-500'>
        <AlertTriangle className='size-4' />
        Change Requests ({changeRequests.length})
        {pendingCount > 0 && (
          <Badge className='ml-1 text-xs' variant='destructive'>
            {pendingCount} pending
          </Badge>
        )}
      </h3>
      <div className='space-y-3'>
        {changeRequests.map((cr) => (
          <ChangeRequestItem
            canResolve={canResolve}
            changeRequest={cr}
            key={cr.id}
            orgSlug={orgSlug}
            projectId={projectId}
            requirementId={requirementId}
            threads={threads}
          />
        ))}
      </div>
    </div>
  )
}
