import { useRouter } from '@bprogress/next/app'
import { Mail } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { authClient } from '@/lib/auth-client'
import {
  addExistingMemberToProjectAction,
  linkInvitationToProjectAction,
} from '../actions'

export default function InviteDialog({
  open,
  onOpenChange,
  role,
  organizationId,
  projectId,
  label,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: 'member' | 'admin' | 'client'
  organizationId: string
  projectId: string
  label: string
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [selectedRole, setSelectedRole] = useState(role)
  const [isInviting, setIsInviting] = useState(false)
  const showRoleSelect = role !== 'client'

  const { execute: executeLinkInvitation } = useAction(
    linkInvitationToProjectAction
  )

  const { executeAsync: executeAddExisting } = useAction(
    addExistingMemberToProjectAction
  )

  const handleInvite = async () => {
    if (!email.trim()) {
      return
    }
    setIsInviting(true)
    try {
      const result = await authClient.organization.inviteMember({
        email: email.trim(),
        role: selectedRole as 'member' | 'admin',
        organizationId,
      })
      if (result.error) {
        // If user is already in the org, directly assign them to the project
        const msg = result.error.message ?? ''
        if (msg.toLowerCase().includes('already')) {
          const addResult = await executeAddExisting({
            email: email.trim(),
            projectId,
            organizationId,
            type: role === 'client' ? 'client' : 'member',
          })
          if (addResult?.serverError) {
            toast.error(addResult.serverError)
          } else {
            toast.success(`${email} added to project`)
            setEmail('')
            onOpenChange(false)
            router.refresh()
          }
        } else {
          toast.error(msg || 'Failed to send invitation')
        }
      } else {
        // Link this invitation to the project so acceptance assigns them
        const invitationId = result.data?.id
        if (invitationId) {
          executeLinkInvitation({
            invitationId,
            projectId,
            type: role === 'client' ? 'client' : 'member',
          })
        }
        toast.success(`Invitation sent to ${email}`)
        setEmail('')
        onOpenChange(false)
        router.refresh()
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
          <DialogTitle>Invite {label}</DialogTitle>
          <DialogDescription>
            Send an invitation email. They'll join the workspace and can be
            assigned to projects.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label>Email address</Label>
            <Input
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleInvite()
                }
              }}
              placeholder='name@example.com'
              type='email'
              value={email}
            />
          </div>
          {showRoleSelect && (
            <div className='space-y-2'>
              <Label>Role</Label>
              <Select
                onValueChange={(v) => setSelectedRole(v as 'member' | 'admin')}
                value={selectedRole}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='member'>Member</SelectItem>
                  <SelectItem value='admin'>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
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
