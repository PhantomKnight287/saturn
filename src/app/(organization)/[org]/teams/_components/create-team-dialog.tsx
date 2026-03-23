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
import { createTeamAction } from '../actions'

export default function CreateTeamDialog({
  open,
  onOpenChange,
  organizationId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
}) {
  const router = useRouter()
  const [name, setName] = useState('')

  const { execute, isPending } = useAction(createTeamAction, {
    onSuccess() {
      toast.success('Team created')
      setName('')
      onOpenChange(false)
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to create team')
    },
  })

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label>Team Name</Label>
            <Input
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  execute({ organizationId, name: name.trim() })
                }
              }}
              placeholder='e.g. Engineering, Design'
              value={name}
            />
          </div>
          <div className='flex justify-end gap-2'>
            <Button onClick={() => onOpenChange(false)} variant='outline'>
              Cancel
            </Button>
            <Button
              disabled={!name.trim()}
              loading={isPending}
              onClick={() => execute({ organizationId, name: name.trim() })}
            >
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
