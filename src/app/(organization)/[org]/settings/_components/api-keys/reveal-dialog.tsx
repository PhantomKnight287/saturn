'use client'

import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldLabel } from '@/components/ui/field'
import type { CreatedApiKey } from './types'

export function RevealApiKeyDialog({
  value,
  onClose,
}: {
  value: CreatedApiKey | null
  onClose: () => void
}) {
  const handleCopy = () => {
    if (!value) {
      return
    }
    navigator.clipboard.writeText(value.value)
    toast.success('Copied to clipboard')
  }

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={value !== null}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>API key created</DialogTitle>
          <DialogDescription>
            Copy this key now — you won&apos;t be able to see it again.
          </DialogDescription>
        </DialogHeader>
        <div className='min-w-0 space-y-2'>
          <FieldLabel>{value?.name}</FieldLabel>
          <div className='flex min-w-0 items-center gap-2'>
            <code className='min-w-0 flex-1 truncate rounded-md border bg-muted px-3 py-2 font-mono text-sm'>
              {value?.value}
            </code>
            <Button
              className='shrink-0'
              onClick={handleCopy}
              size='icon'
              type='button'
              variant='outline'
            >
              <Copy className='size-4' />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} type='button'>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
