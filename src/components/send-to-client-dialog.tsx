'use client'

import { Send } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import type { teamService } from '@/app/api/teams/service'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ProjectClient } from '@/app/(project)/[org]/[project]/team/types'

interface SendToClientDialogProps {
  /** Extra form fields rendered above the client list */
  children?: ReactNode
  clients: ProjectClient[]
  /** Dialog description shown below the title */
  description: string
  /** Empty state message when no clients are available */
  emptyMessage?: string
  onOpenChange: (open: boolean) => void
  /** Called with the selected member IDs when the user confirms */
  onSend: (clientMemberIds: string[]) => Promise<void> | void
  open: boolean
  /** Label for the send button, e.g. "client" or "stakeholder" — used as "Send to N {recipientLabel}s" */
  recipientLabel?: string
  /** Additional disable condition for the send button */
  sendDisabled?: boolean
  /** Dialog title, e.g. "Send Proposal" or "Send for Sign" */
  title: string
}

export default function SendToClientDialog({
  open,
  onOpenChange,
  clients,
  title,
  description,
  recipientLabel = 'client',
  emptyMessage = 'No clients assigned to this project. Add clients from the Team page first.',
  onSend,
  children,
  sendDisabled = false,
}: SendToClientDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isPending, setIsPending] = useState(false)

  const toggleClient = (memberId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === clients.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(clients.map((c) => c.memberId)))
    }
  }

  const handleSend = async () => {
    if (selectedIds.size === 0) {
      return
    }
    setIsPending(true)
    try {
      await onSend(Array.from(selectedIds))
      setSelectedIds(new Set())
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {children}

        {clients.length === 0 ? (
          <p className='py-4 text-center text-muted-foreground text-sm'>
            {emptyMessage}
          </p>
        ) : (
          <div className='space-y-4'>
            <div className='flex items-center gap-2 border-b pb-2'>
              <Checkbox
                checked={selectedIds.size === clients.length}
                onCheckedChange={toggleAll}
              />
              <label
                className='cursor-pointer font-medium text-sm'
                htmlFor='select-all'
              >
                Select all ({clients.length})
              </label>
            </div>

            <div className='max-h-60 space-y-1 overflow-y-auto'>
              {clients.map((client) => (
                <label
                  className='flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50'
                  htmlFor={`client-${client.memberId}`}
                  key={client.memberId}
                >
                  <Checkbox
                    checked={selectedIds.has(client.memberId)}
                    id={`client-${client.memberId}`}
                    onCheckedChange={() => toggleClient(client.memberId)}
                  />
                  <Avatar className='size-7'>
                    <AvatarImage
                      alt={client.userName}
                      src={client.userImage ?? ''}
                    />
                    <AvatarFallback className='text-xs'>
                      {client.userName.substring(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className='min-w-0 flex-1'>
                    <div className='truncate font-medium text-sm'>
                      {client.userName}
                    </div>
                    <div className='truncate text-muted-foreground text-xs'>
                      {client.userEmail}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className='flex justify-end gap-2 pt-2'>
              <Button onClick={() => onOpenChange(false)} variant='outline'>
                Cancel
              </Button>
              <Button
                disabled={selectedIds.size === 0 || sendDisabled}
                loading={isPending}
                onClick={handleSend}
              >
                <Send className='size-4' />
                Send to {selectedIds.size || ''} {recipientLabel}
                {selectedIds.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
