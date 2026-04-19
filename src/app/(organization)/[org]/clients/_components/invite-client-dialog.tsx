'use client'

import { useRouter } from '@bprogress/next/app'
import { Mail } from 'lucide-react'
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
import { authClient } from '@/lib/auth-client'
import { analyticsService } from '@/services/analytics.service'

export default function InviteClientDialog({
  open,
  onOpenChange,
  organizationId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)

  const handleInvite = async () => {
    if (!email.trim()) {
      return
    }
    setIsInviting(true)
    try {
      const result = await authClient.organization.inviteMember({
        email: email.trim(),
        role: 'client' as 'member' | 'admin',
        organizationId,
      })
      if (result.error) {
        const msg = result.error.message ?? ''
        if (msg.toLowerCase().includes('already')) {
          toast.error(
            'This user is already in the workspace. Use "Assign to Project" instead.'
          )
        } else {
          toast.error(msg || 'Failed to send invitation')
        }
      } else {
        toast.success(`Invitation sent to ${email}`)
        setEmail('')
        onOpenChange(false)
        router.refresh()
        analyticsService.track('client_added')
      }
    } catch {
      toast.error('Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Invite Client</DialogTitle>
          <DialogDescription>
            Send an invitation email. They&apos;ll join the workspace as a
            client once they accept.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label>Email address</Label>
            <Input
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && email.trim()) {
                  handleInvite()
                }
              }}
              placeholder='client@example.com'
              type='email'
              value={email}
            />
          </div>
          <div className='flex justify-end gap-2'>
            <Button onClick={() => onOpenChange(false)} variant='outline'>
              Cancel
            </Button>
            <Button
              disabled={!email.trim()}
              loading={isInviting}
              onClick={handleInvite}
            >
              <Mail className='size-4' />
              Send Invite
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
