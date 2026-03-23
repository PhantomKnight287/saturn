'use client'

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { changeOrgMemberRoleAction, removeOrgMemberAction } from '../actions'
import type { OrgMember, PendingInvitation } from '../types'
import InviteDialog from './invite-dialog'
import PendingInvitationsBlock from './pending-invitations-block'

export default function MembersSection({
  organizationId,
  orgSlug,
  members,
  invitations,
  canManage,
  currentMemberId,
  showInviteDialog,
  onShowInviteDialogChange,
}: {
  organizationId: string
  orgSlug: string
  members: OrgMember[]
  invitations: PendingInvitation[]
  canManage: boolean
  currentMemberId: string
  showInviteDialog: boolean
  onShowInviteDialogChange: (open: boolean) => void
}) {
  const router = useRouter()

  const { execute: executeRemove } = useAction(removeOrgMemberAction, {
    onSuccess() {
      toast.success('Member removed from workspace')
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to remove member')
    },
  })

  const { execute: executeChangeRole } = useAction(changeOrgMemberRoleAction, {
    onSuccess() {
      toast.success('Role updated')
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to change role')
    },
  })

  if (members.length === 0 && invitations.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <Users />
          </EmptyMedia>
          <EmptyTitle>No members yet</EmptyTitle>
          <EmptyDescription>
            Invite members to your workspace to start collaborating.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      {canManage && <PendingInvitationsBlock invitations={invitations} />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            {canManage && <TableHead className='w-16' />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => {
            const isSelf = m.memberId === currentMemberId
            const isOwner = m.role === 'owner'

            return (
              <TableRow key={m.memberId}>
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <Avatar className='size-8'>
                      <AvatarImage
                        alt={m.userName}
                        src={m.userImage ?? ''}
                      />
                      <AvatarFallback>
                        {m.userName.substring(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className='flex items-center gap-1.5'>
                        <span className='font-medium text-sm'>
                          {m.userName}
                        </span>
                        {isSelf && (
                          <Badge className='text-xs' variant='outline'>
                            You
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
                  {canManage && !isSelf && !isOwner ? (
                    <Select
                      onValueChange={(v) =>
                        executeChangeRole({
                          memberId: m.memberId,
                          role: v as 'member' | 'admin' | 'owner',
                        })
                      }
                      value={m.role}
                    >
                      <SelectTrigger className='h-7 w-28 text-xs'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='member'>Member</SelectItem>
                        <SelectItem value='admin'>Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className='capitalize' variant='secondary'>
                      {m.role}
                    </Badge>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell>
                    {!isSelf && !isOwner && (
                      <Button
                        onClick={() =>
                          executeRemove({ memberId: m.memberId })
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
            )
          })}
        </TableBody>
      </Table>

      <InviteDialog
        onOpenChange={onShowInviteDialogChange}
        open={showInviteDialog}
        organizationId={organizationId}
      />
    </>
  )
}
