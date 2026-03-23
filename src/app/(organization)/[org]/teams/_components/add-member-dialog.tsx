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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { addTeamMemberAction } from '../actions'
import type { OrgMember } from '../types'

export default function AddMemberDialog({
  open,
  onOpenChange,
  teamId,
  orgMembers,
  existingMemberUserIds,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  orgMembers: OrgMember[]
  existingMemberUserIds: Set<string>
}) {
  const router = useRouter()
  const [selectedUserId, setSelectedUserId] = useState('')

  const availableMembers = orgMembers.filter(
    (m) => !existingMemberUserIds.has(m.userId)
  )

  const { execute, isPending } = useAction(addTeamMemberAction, {
    onSuccess() {
      toast.success('Member added to team')
      setSelectedUserId('')
      onOpenChange(false)
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to add member')
    },
  })

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Add Member to Team</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          {availableMembers.length === 0 ? (
            <p className='text-muted-foreground text-sm'>
              All workspace members are already in this team.
            </p>
          ) : (
            <Select onValueChange={setSelectedUserId} value={selectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder='Select a member...' />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.userName} ({m.userEmail})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className='flex justify-end gap-2'>
            <Button onClick={() => onOpenChange(false)} variant='outline'>
              Cancel
            </Button>
            <Button
              disabled={!selectedUserId}
              loading={isPending}
              onClick={() => execute({ teamId, userId: selectedUserId })}
            >
              Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
