/** biome-ignore-all lint/a11y/useValidAriaRole: the role being passed isn't aria-role but user role */
import { useRouter } from '@bprogress/next/app'
import { Briefcase, X } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { removeClientAction } from '../actions'
import type { PendingInvitation, ProjectClient } from '../types'
import InviteDialog from './invite-dialog'
import PendingInvitationsBlock from './pending-invitations'

export default function StakeholdersSection({
  projectId,
  orgSlug,
  projectSlug,
  organizationId,
  projectClients,
  pendingInvitations,
  canManage,
  showInviteDialog,
  onShowInviteDialogChange,
}: {
  projectId: string
  orgSlug: string
  projectSlug: string
  organizationId: string
  projectClients: ProjectClient[]
  pendingInvitations: PendingInvitation[]
  canManage: boolean
  showInviteDialog: boolean
  onShowInviteDialogChange: (open: boolean) => void
}) {
  const router = useRouter()

  const { execute: executeRemove } = useAction(removeClientAction, {
    onSuccess() {
      toast.success('Client removed from project')
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to remove client')
    },
  })

  if (
    projectClients.length === 0 &&
    pendingInvitations.length === 0 &&
    !canManage
  ) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <Briefcase />
          </EmptyMedia>
          <EmptyTitle>No clients assigned</EmptyTitle>
          <EmptyDescription>
            No clients have been added to this project yet.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      {canManage && (
        <PendingInvitationsBlock
          invitations={pendingInvitations}
          organizationId={organizationId}
        />
      )}

      {projectClients.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Briefcase />
            </EmptyMedia>
            <EmptyTitle>No clients yet</EmptyTitle>
            <EmptyDescription>
              Invite clients by email to give them visibility into this project.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Added</TableHead>
              {canManage && <TableHead className='w-16' />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectClients.map((c) => (
              <TableRow key={c.userId}>
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <Avatar className='size-8'>
                      <AvatarImage alt={c.userName} src={c.userImage ?? ''} />
                      <AvatarFallback>
                        {c.userName.substring(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className='font-medium text-sm'>{c.userName}</div>
                      <div className='text-muted-foreground text-xs'>
                        {c.userEmail}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className='text-muted-foreground text-sm'>
                    {new Date(c.assignedAt)?.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </TableCell>
                {canManage && (
                  <TableCell>
                    <Button
                      onClick={() =>
                        executeRemove({
                          assignmentId: c.assignmentId,
                          orgSlug,
                          projectSlug,
                        })
                      }
                      variant='ghost'
                    >
                      <X className='size-4 text-muted-foreground' />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <InviteDialog
        label='Client'
        onOpenChange={onShowInviteDialogChange}
        open={showInviteDialog}
        organizationId={organizationId}
        projectId={projectId}
        role='client'
      />
    </>
  )
}
