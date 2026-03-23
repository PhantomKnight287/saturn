'use client'

import { Building2, Check, FolderOpen, UserCircle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { acceptInviteAction } from './actions'

interface AcceptInviteClientProps {
  assignmentType?: 'member' | 'client'
  email: string
  invitationId: string
  organizationName: string
  organizationSlug: string
  projectId?: string
  projectName?: string
  projectSlug?: string
  roleLabel: string
}

export function AcceptInviteClient({
  invitationId,
  organizationName,
  organizationSlug,
  roleLabel,
  projectName,
  projectSlug,
  projectId,
  assignmentType,
}: AcceptInviteClientProps) {
  const router = useRouter()
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const { execute: executeAssign } = useAction(acceptInviteAction, {
    onSuccess() {
      // Redirect to the project if we have one, otherwise to the org
      if (organizationSlug && projectSlug) {
        router.push(`/${organizationSlug}/${projectSlug}`)
      } else if (organizationSlug) {
        router.push(`/${organizationSlug}`)
      } else {
        router.push('/')
      }
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to complete project assignment')
      // Still redirect to org since the invite was accepted
      if (organizationSlug) {
        router.push(`/${organizationSlug}`)
      }
    },
  })

  const handleAccept = async () => {
    setIsAccepting(true)
    try {
      const result = await authClient.organization.acceptInvitation({
        invitationId,
      })
      if (result.error) {
        toast.error(result.error.message ?? 'Failed to accept invitation')
        setIsAccepting(false)
        return
      }

      toast.success(`Joined ${organizationName}`)

      // If there's a linked project, assign the new member to it
      if (projectId && assignmentType) {
        executeAssign({ invitationId, projectId, type: assignmentType })
      } else if (organizationSlug) {
        router.push(`/${organizationSlug}`)
      } else {
        router.push('/')
      }
    } catch {
      toast.error('Failed to accept invitation')
      setIsAccepting(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      const result = await authClient.organization.rejectInvitation({
        invitationId,
      })
      if (result.error) {
        toast.error(result.error.message ?? 'Failed to reject invitation')
        setIsRejecting(false)
        return
      }
      toast.success('Invitation declined')
      router.push('/')
    } catch {
      toast.error('Failed to reject invitation')
      setIsRejecting(false)
    }
  }

  return (
    <div className='w-full max-w-md'>
      <div className='rounded-xl border bg-card p-8 shadow-sm'>
        <h1 className='mb-1 font-semibold text-xl'>You've been invited</h1>
        <p className='mb-6 text-muted-foreground text-sm'>
          You're invited to join as a <strong>{roleLabel}</strong>.
        </p>

        <div className='mb-8 space-y-3'>
          <div className='flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3'>
            <Building2 className='size-4 shrink-0 text-muted-foreground' />
            <div>
              <div className='text-muted-foreground text-xs'>Workspace</div>
              <div className='font-medium text-sm'>{organizationName}</div>
            </div>
          </div>

          {projectName && (
            <div className='flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3'>
              <FolderOpen className='size-4 shrink-0 text-muted-foreground' />
              <div>
                <div className='text-muted-foreground text-xs'>Project</div>
                <div className='font-medium text-sm'>{projectName}</div>
              </div>
            </div>
          )}

          <div className='flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3'>
            <UserCircle className='size-4 shrink-0 text-muted-foreground' />
            <div>
              <div className='text-muted-foreground text-xs'>Your role</div>
              <div className='font-medium text-sm'>{roleLabel}</div>
            </div>
          </div>
        </div>

        <div className='flex gap-3'>
          <Button
            className='flex-1'
            disabled={isAccepting}
            loading={isRejecting}
            onClick={handleReject}
            variant='outline'
          >
            <X className='size-4' />
            Decline
          </Button>
          <Button
            className='flex-1'
            disabled={isRejecting}
            loading={isAccepting}
            onClick={handleAccept}
          >
            <Check className='size-4' />
            Accept & Join
          </Button>
        </div>
      </div>
    </div>
  )
}
