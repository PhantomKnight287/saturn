'use client'

import { useRouter } from '@bprogress/next/app'
import { Pencil, Plus, Trash2, UsersRound, X } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { deleteTeamAction, removeTeamMemberAction } from '../actions'
import type { OrgMember, OrgTeamWithMembers } from '../types'
import AddMemberDialog from './add-member-dialog'
import RenameTeamDialog from './rename-team-dialog'

export default function TeamCard({
  team,
  canManage,
  orgMembers,
  isLastTeam,
}: {
  team: OrgTeamWithMembers
  canManage: boolean
  orgMembers: OrgMember[]
  isLastTeam: boolean
}) {
  const router = useRouter()
  const [renameOpen, setRenameOpen] = useState(false)
  const [addMemberOpen, setAddMemberOpen] = useState(false)

  const { execute: executeDelete } = useAction(deleteTeamAction, {
    onSuccess() {
      toast.success('Team deleted')
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to delete team')
    },
  })

  const { execute: executeRemoveMember } = useAction(removeTeamMemberAction, {
    onSuccess() {
      toast.success('Member removed from team')
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to remove member')
    },
  })

  const existingMemberUserIds = new Set(team.members.map((m) => m.userId))

  return (
    <div className='rounded-lg border p-4'>
      <div className='mb-3 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <UsersRound className='size-4 text-muted-foreground' />
          <span className='font-medium'>{team.teamName}</span>
          <Badge className='text-xs' variant='secondary'>
            {team.members.length} member
            {team.members.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        {canManage && (
          <div className='flex items-center gap-1'>
            <Button onClick={() => setAddMemberOpen(true)} variant='ghost'>
              <Plus className='size-4 text-muted-foreground' />
            </Button>
            <Button onClick={() => setRenameOpen(true)} variant='ghost'>
              <Pencil className='size-4 text-muted-foreground' />
            </Button>
            {!isLastTeam && (
              <Button
                onClick={() => executeDelete({ teamId: team.teamId })}
                variant='ghost'
              >
                <Trash2 className='size-4 text-muted-foreground' />
              </Button>
            )}
          </div>
        )}
      </div>
      {team.members.length > 0 ? (
        <div className='flex flex-wrap gap-2'>
          {team.members.map((m) => (
            <div
              className='flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1'
              key={m.teamMemberId}
            >
              <Avatar className='size-5'>
                <AvatarImage alt={m.userName} src={m.userImage ?? ''} />
                <AvatarFallback className='text-[10px]'>
                  {m.userName.substring(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className='text-xs'>{m.userName}</span>
              {canManage && (
                <button
                  className='ml-0.5 text-muted-foreground hover:text-foreground'
                  onClick={() =>
                    executeRemoveMember({ teamMemberId: m.teamMemberId })
                  }
                  type='button'
                >
                  <X className='size-3' />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className='text-muted-foreground text-sm'>No members yet</p>
      )}

      <RenameTeamDialog
        currentName={team.teamName}
        onOpenChange={setRenameOpen}
        open={renameOpen}
        teamId={team.teamId}
      />

      <AddMemberDialog
        existingMemberUserIds={existingMemberUserIds}
        onOpenChange={setAddMemberOpen}
        open={addMemberOpen}
        orgMembers={orgMembers}
        teamId={team.teamId}
      />
    </div>
  )
}
