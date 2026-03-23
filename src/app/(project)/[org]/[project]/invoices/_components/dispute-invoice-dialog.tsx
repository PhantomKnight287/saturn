'use client'

import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createInvoiceThreadAction } from '../actions'

interface DisputeInvoiceDialogProps {
  invoiceId: string
  onOpenChange: (open: boolean) => void
  open: boolean
}

export default function DisputeInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
}: DisputeInvoiceDialogProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const { execute, isPending } = useAction(createInvoiceThreadAction, {
    onSuccess() {
      toast.success('Dispute submitted')
      setTitle('')
      setBody('')
      onOpenChange(false)
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to submit dispute')
    },
  })

  const handleSubmit = () => {
    if (!body.trim()) {
      return
    }

    execute({
      invoiceId,
      title: title.trim() || 'Dispute',
      body: body.trim(),
    })
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Dispute Invoice</DialogTitle>
          <DialogDescription>
            Describe the issue with this invoice. A dispute thread will be
            created and the invoice sender will be notified.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label>Subject</Label>
            <Input
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. Incorrect amount, Missing items...'
              value={title}
            />
          </div>
          <div className='space-y-2'>
            <Label>Details</Label>
            <Textarea
              autoFocus
              className='min-h-[120px]'
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit()
                }
              }}
              placeholder='Describe the issue with this invoice...'
              value={body}
            />
          </div>

          <div className='flex justify-end gap-2'>
            <Button onClick={() => onOpenChange(false)} variant='outline'>
              Cancel
            </Button>
            <Button
              disabled={!body.trim()}
              loading={isPending}
              onClick={handleSubmit}
              variant='destructive'
            >
              Submit Dispute
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
