'use client'

import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { requestChangesAction } from '../action'
import type { RequirementEditorProps } from '../types'

interface RequestChangesDialogProps {
  onOpenChange: (open: boolean) => void
  open: boolean
  orgSlug: string
  projectId: string
  requirementId: string
  threads: RequirementEditorProps['threads']
}

export default function RequestChangesDialog({
  open,
  onOpenChange,
  requirementId,
  orgSlug,
  projectId,
  threads,
}: RequestChangesDialogProps) {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([])

  const { execute, isPending } = useAction(requestChangesAction, {
    onSuccess() {
      toast.success('Change request submitted')
      setDescription('')
      setSelectedThreadIds([])
      onOpenChange(false)
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to submit change request')
    },
  })

  const handleSubmit = () => {
    if (!description.trim()) {
      return
    }

    execute({
      requirementId,
      description: description.trim(),
      referencedThreadIds: selectedThreadIds.length
        ? selectedThreadIds
        : undefined,
      projectId,
      orgSlug,
    })
  }

  const toggleThread = (threadId: string) => {
    setSelectedThreadIds((prev) =>
      prev.includes(threadId)
        ? prev.filter((id) => id !== threadId)
        : [...prev, threadId]
    )
  }

  const openThreads = threads?.filter((t) => t.status === 'open')

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Request Changes</DialogTitle>
          <DialogDescription>
            Describe the changes you need. You can also reference threads
            you&apos;ve started for additional context.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          <Textarea
            autoFocus
            className='min-h-[120px]'
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit()
              }
            }}
            placeholder='Describe what needs to be changed...'
            value={description}
          />

          {openThreads && openThreads.length > 0 && (
            <div className='space-y-2'>
              <p className='font-medium text-sm'>Reference threads</p>
              <div className='max-h-[200px] space-y-2 overflow-y-auto rounded-md border p-3'>
                {openThreads.map((thread) => (
                  <div className='flex items-start gap-2' key={thread.id}>
                    <Checkbox
                      checked={selectedThreadIds.includes(thread.id)}
                      className='mt-0.5'
                      id={`thread-${thread.id}`}
                      onCheckedChange={() => toggleThread(thread.id)}
                    />
                    <Label
                      className='cursor-pointer font-normal text-sm leading-snug'
                      htmlFor={`thread-${thread.id}`}
                    >
                      <span className='line-clamp-1 text-muted-foreground italic'>
                        &ldquo;{thread.selectedText}&rdquo;
                      </span>
                      <span className='line-clamp-1 text-muted-foreground/70 text-xs'>
                        {thread.messages[0]?.body}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className='flex justify-end gap-2'>
            <Button onClick={() => onOpenChange(false)} variant='outline'>
              Cancel
            </Button>
            <Button
              disabled={!description.trim()}
              loading={isPending}
              onClick={handleSubmit}
              variant='destructive'
            >
              Request Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
