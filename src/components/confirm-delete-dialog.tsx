'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  actionLabel?: string
  confirmationText: string
  description: ReactNode
  loading?: boolean
  onConfirm: () => void | Promise<void>
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmationText,
  actionLabel = 'Delete',
  loading = false,
  onConfirm,
}: Props) {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (!open) {
      setValue('')
    }
  }, [open])

  const matches = value === confirmationText

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!matches) {
      return
    }
    await onConfirm()
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Field className='gap-1'>
            <Label>
              Type <span className='font-semibold'>{confirmationText}</span> to
              confirm
            </Label>
            <Input
              autoFocus
              onChange={(e) => setValue(e.target.value)}
              placeholder={confirmationText}
              value={value}
            />
          </Field>
          <DialogFooter className='mt-4'>
            <Button
              onClick={() => onOpenChange(false)}
              type='button'
              variant='outline'
            >
              Cancel
            </Button>
            <Button
              disabled={!matches}
              loading={loading}
              type='submit'
              variant='destructive'
            >
              {actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
