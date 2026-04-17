/** biome-ignore-all lint/a11y/useValidAriaRole: the role being passed isn't aria-role but user role */

import { useRouter } from '@bprogress/next/app'
import { Users, X } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { removeMemberAction } from '../actions'
import type { OrgMember, PendingInvitation, ProjectMember } from '../types'
import InviteDialog from './invite-dialog'
import PendingInvitationsBlock from './pending-invitations'

export default function MembersSection({
  projectId,
  orgSlug,
  projectSlug,
  organizationId,
  projectMembers,
  pendingInvitations,
  canManage,
  showInviteDialog,
  onShowInviteDialogChange,
  orgMembers,
  defaultMemberRate,
  defaultCurrency,
}: {
  projectId: string
  orgSlug: string
  projectSlug: string
  organizationId: string
  projectMembers: ProjectMember[]
  pendingInvitations: PendingInvitation[]
  canManage: boolean
  showInviteDialog: boolean
  onShowInviteDialogChange: (open: boolean) => void
  orgMembers: OrgMember[]
  defaultMemberRate: number
  defaultCurrency: string
}) {
  const router = useRouter()

  const { execute: executeRemove } = useAction(removeMemberAction, {
    onSuccess() {
      toast.success('Member removed from project')
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to remove member')
    },
  })

  if (
    projectMembers.length === 0 &&
    pendingInvitations.length === 0 &&
    !canManage
  ) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <Users />
          </EmptyMedia>
          <EmptyTitle>No members assigned</EmptyTitle>
          <EmptyDescription>
            No team members have been added to this project yet.
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

      {projectMembers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Users />
            </EmptyMedia>
            <EmptyTitle>No members yet</EmptyTitle>
            <EmptyDescription>
              Invite team members by email to collaborate on this project.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Project Role</TableHead>
              <TableHead>Org Role</TableHead>
              {canManage && <TableHead className='w-16' />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectMembers.map((m) => (
              <TableRow key={m.memberId}>
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <Avatar className='size-8'>
                      <AvatarImage alt={m.userName} src={m.userImage ?? ''} />
                      <AvatarFallback>
                        {m.userName.substring(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className='flex items-center gap-1.5'>
                        <span className='font-medium text-sm'>
                          {m.userName}
                        </span>
                        {m.source.startsWith('org-role') && (
                          <Badge
                            className='capitalize leading-none'
                            variant='outline'
                          >
                            {m.source.replace('org-role-', '')}
                          </Badge>
                        )}
                        {m.source === 'team' && m.teamName && (
                          <Badge className='leading-none' variant='outline'>
                            via {m.teamName}
                          </Badge>
                        )}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        {m.userEmail}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className='capitalize' variant='outline'>
                    {m.projectRole}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className='capitalize' variant='secondary'>
                    {m.orgRole}
                  </Badge>
                </TableCell>
                {canManage && (
                  <TableCell>
                    {m.source === 'direct' && m.assignmentId && (
                      <Button
                        onClick={() =>
                          executeRemove({
                            assignmentId: m.assignmentId!,
                            orgSlug,
                            projectSlug,
                          })
                        }
                        size='sm'
                        variant='ghost'
                      >
                        <X className='size-4 text-muted-foreground' />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <InviteDialog
        defaultCurrency={defaultCurrency}
        defaultMemberRate={defaultMemberRate}
        label='Member'
        onOpenChange={onShowInviteDialogChange}
        open={showInviteDialog}
        organizationId={organizationId}
        orgMembers={orgMembers}
        projectId={projectId}
        projectMembers={projectMembers}
        role='member'
      />
    </>
  )
}
