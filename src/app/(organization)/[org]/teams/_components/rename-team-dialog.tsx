'use client'

import { useRouter } from '@bprogress/next/app'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { renameTeamAction } from '../actions'

export default function RenameTeamDialog({
  open,
  onOpenChange,
  teamId,
  currentName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  currentName: string
}) {
  const router = useRouter()
  const [name, setName] = useState(currentName)

  const { execute, isPending } = useAction(renameTeamAction, {
    onSuccess() {
      toast.success('Team renamed')
      onOpenChange(false)
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to rename team')
    },
  })

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Rename Team</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label>Team Name</Label>
            <Input
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  execute({ teamId, name: name.trim() })
                }
              }}
              value={name}
            />
          </div>
          <div className='flex justify-end gap-2'>
            <Button onClick={() => onOpenChange(false)} variant='outline'>
              Cancel
            </Button>
            <Button
              disabled={!name.trim() || name.trim() === currentName}
              loading={isPending}
              onClick={() => execute({ teamId, name: name.trim() })}
            >
              Rename
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
