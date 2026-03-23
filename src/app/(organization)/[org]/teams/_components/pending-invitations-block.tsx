'use client'

import { useRouter } from '@bprogress/next/app'
import { Clock, Mail, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import type { PendingInvitation } from '../types'

export default function PendingInvitationsBlock({
  invitations,
}: {
  invitations: PendingInvitation[]
}) {
  const router = useRouter()

  if (invitations.length === 0) {
    return null
  }

  const handleCancel = async (invitationId: string) => {
    const result = await authClient.organization.cancelInvitation({
      invitationId,
    })
    if (result.error) {
      toast.error(result.error.message ?? 'Failed to cancel invitation')
    } else {
      toast.success('Invitation cancelled')
      router.refresh()
    }
  }

  return (
    <div className='mb-6'>
      <h3 className='mb-3 flex items-center gap-2 font-medium text-muted-foreground text-sm'>
        <Clock className='size-3.5' />
        Pending Invitations
      </h3>
      <div className='space-y-2'>
        {invitations.map((inv) => (
          <div
            className='flex items-center justify-between rounded-lg border border-dashed px-4 py-3'
            key={inv.id}
          >
            <div className='flex items-center gap-3'>
              <div className='flex size-8 items-center justify-center rounded-full bg-muted'>
                <Mail className='size-4 text-muted-foreground' />
              </div>
              <div>
                <div className='font-medium text-sm'>{inv.email}</div>
                <div className='text-muted-foreground text-xs'>
                  Invited as <span className='capitalize'>{inv.role}</span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => handleCancel(inv.id)}
              size='sm'
              variant='ghost'
            >
              <X className='size-4 text-muted-foreground' />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
