'use client'

import { formatDistanceToNow } from 'date-fns'
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Send,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addThreadReplyAction } from '../action'
import type { Thread, ThreadMessage } from '../types'

function MessageBubble({ message }: { message: ThreadMessage }) {
  return (
    <div className='flex items-start gap-3'>
      <Avatar className='size-7 shrink-0'>
        <AvatarImage
          alt={message.authorName || 'User'}
          src={message.authorImage || ''}
        />
        <AvatarFallback className='text-xs'>
          {(message.authorName || 'U').substring(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span className='font-medium text-sm'>
            {message.authorName || 'Unknown'}
          </span>
          <span className='text-muted-foreground text-xs'>
            {formatDistanceToNow(new Date(message.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        <p className='text-muted-foreground text-sm'>{message.body}</p>
      </div>
    </div>
  )
}

function ThreadItem({
  thread,
  orgSlug,
  projectId,
  entityId,
  onSubmit,
  onResolve,
  isSending = false,
}: {
  thread: Thread
  orgSlug: string
  projectId: string
  entityId: string
  onSubmit?: (replyBody: string, threadId: string) => void
  onResolve?: (threadId: string) => void
  isSending?: boolean
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showReply, setShowReply] = useState(false)

  const { execute: executeReply, isPending } = useAction(addThreadReplyAction, {
    onSuccess() {
      setReplyText('')
      setShowReply(false)
      toast.success('Reply added')
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to add reply')
    },
  })

  const handleReply = () => {
    if (!replyText.trim()) {
      return
    }
    if (onSubmit) {
      onSubmit(replyText.trim(), thread.id)
      setReplyText('')
      return
    }
    executeReply({
      threadId: thread.id,
      orgSlug,
      replyBody: replyText.trim(),
      projectId,
      requirementId: entityId,
    })
  }

  const replyCount = thread.messages.length - 1

  return (
    <div className='rounded-lg border'>
      <button
        className='flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50'
        onClick={() => setExpanded(!expanded)}
        type='button'
      >
        <div className='mt-0.5 shrink-0 text-muted-foreground'>
          {expanded ? (
            <ChevronDown className='size-4' />
          ) : (
            <ChevronRight className='size-4' />
          )}
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <span className='line-clamp-1 font-medium text-sm'>
              &ldquo;{thread.selectedText}&rdquo;
            </span>
            <Badge
              className='shrink-0 text-xs capitalize'
              variant={thread.status === 'open' ? 'secondary' : 'outline'}
            >
              {thread.status}
            </Badge>
          </div>
          <div className='mt-0.5 flex items-center gap-2 text-muted-foreground text-xs'>
            <span>{thread.createdByName ?? 'Unknown'}</span>
            <span>&middot;</span>
            <span>
              {formatDistanceToNow(new Date(thread.createdAt), {
                addSuffix: true,
              })}
            </span>
            {replyCount > 0 && (
              <>
                <span>&middot;</span>
                <span>
                  {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                </span>
              </>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className='border-t px-4 py-3'>
          <div className='space-y-4'>
            {thread.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>

          {showReply ? (
            <div className='mt-4 space-y-2'>
              <Textarea
                autoFocus
                className='min-h-[80px]'
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleReply()
                  }
                }}
                placeholder='Write a reply...'
                value={replyText}
              />
              <div className='flex justify-end gap-2'>
                <Button
                  onClick={() => {
                    setShowReply(false)
                    setReplyText('')
                  }}
                  size='sm'
                  variant='outline'
                >
                  Cancel
                </Button>
                <Button
                  disabled={!replyText.trim()}
                  loading={isPending || isSending}
                  onClick={handleReply}
                  size='sm'
                >
                  <Send className='size-3.5' />
                  Reply
                </Button>
              </div>
            </div>
          ) : (
            <div className='mt-3 flex items-center gap-2'>
              <Button
                onClick={() => setShowReply(true)}
                size='sm'
                variant='ghost'
              >
                <MessageSquare className='size-3.5' />
                Reply
              </Button>
              {onResolve && thread.status === 'open' && (
                <Button
                  onClick={() => onResolve(thread.id)}
                  size='sm'
                  variant='ghost'
                >
                  <CheckCircle2 className='size-3.5' />
                  Resolve
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ThreadsPanelProps {
  entityId: string
  isSending?: boolean
  onResolve?: (threadId: string) => void
  onSubmit?: (replyBody: string, threadId: string) => void
  orgSlug: string
  projectId: string
  threads: Thread[]
}

export default function ThreadsPanel({
  threads,
  orgSlug,
  projectId,
  entityId,
  onSubmit,
  onResolve,
  isSending = false,
}: ThreadsPanelProps) {
  if (threads.length === 0) {
    return null
  }

  return (
    <div className='mt-8'>
      <h3 className='mb-4 flex items-center gap-2 font-medium text-sm'>
        <MessageSquare className='size-4' />
        Threads ({threads.length})
      </h3>
      <div className='space-y-3'>
        {threads.map((thread) => (
          <ThreadItem
            entityId={entityId}
            isSending={isSending}
            key={thread.id}
            onResolve={onResolve}
            onSubmit={onSubmit}
            orgSlug={orgSlug}
            projectId={projectId}
            thread={thread}
          />
        ))}
      </div>
    </div>
  )
}
