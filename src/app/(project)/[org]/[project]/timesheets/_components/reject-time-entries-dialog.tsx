'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (reason: string) => void
  open: boolean
}

export function RejectTimeEntriesDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: Props) {
  const reasonId = useId()
  const [reason, setReason] = useState('')

  return (
    <Dialog
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setReason('')
        }
      }}
      open={open}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Reject Time Entries</DialogTitle>
          <DialogDescription>
            Provide a reason so the team member can make corrections and
            resubmit.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-2'>
          <Label htmlFor={reasonId}>Reason</Label>
          <Textarea
            id={reasonId}
            onChange={(e) => setReason(e.target.value)}
            placeholder='Please explain what needs to be corrected...'
            rows={3}
            value={reason}
          />
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant='outline'>
            Cancel
          </Button>
          <Button
            disabled={!reason.trim() || isPending}
            loading={isPending}
            onClick={() => onSubmit(reason)}
            variant='destructive'
          >
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
