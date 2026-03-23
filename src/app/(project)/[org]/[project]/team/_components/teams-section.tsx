import { useRouter } from '@bprogress/next/app'
import { UsersRound, X } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { assignTeamAction, unassignTeamAction } from '../actions'
import type { OrgTeam, ProjectTeam } from '../types'

export default function TeamsSection({
  projectId,
  orgSlug,
  projectSlug,
  projectTeams,
  orgTeams,
  canManage,
  showAddDialog,
  onShowAddDialogChange,
}: {
  projectId: string
  orgSlug: string
  projectSlug: string
  projectTeams: ProjectTeam[]
  orgTeams: OrgTeam[]
  canManage: boolean
  showAddDialog: boolean
  onShowAddDialogChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [selectedTeamId, setSelectedTeamId] = useState('')

  const { execute: executeAssign, isPending: isAssigning } = useAction(
    assignTeamAction,
    {
      onSuccess() {
        toast.success('Team assigned to project')
        onShowAddDialogChange(false)
        setSelectedTeamId('')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to assign team')
      },
    }
  )

  const { execute: executeUnassign } = useAction(unassignTeamAction, {
    onSuccess() {
      toast.success('Team removed from project')
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to remove team')
    },
  })

  const assignedTeamIds = new Set(projectTeams.map((t) => t.teamId))
  const availableTeams = orgTeams.filter((t) => !assignedTeamIds.has(t.teamId))

  if (projectTeams.length === 0 && !canManage) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <UsersRound />
          </EmptyMedia>
          <EmptyTitle>No teams assigned</EmptyTitle>
          <EmptyDescription>
            No teams have been assigned to this project yet.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      {projectTeams.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <UsersRound />
            </EmptyMedia>
            <EmptyTitle>No teams yet</EmptyTitle>
            <EmptyDescription>
              Assign teams from your workspace to this project.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='space-y-4'>
          {projectTeams.map((team) => (
            <div className='rounded-lg border p-4' key={team.assignmentId}>
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
                  <Button
                    onClick={() =>
                      executeUnassign({
                        assignmentId: team.assignmentId,
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
              </div>
              {team.members.length > 0 && (
                <div className='flex flex-wrap gap-2'>
                  {team.members.map((m) => (
                    <div
                      className='flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1'
                      key={m.userId}
                    >
                      <Avatar className='size-5'>
                        <AvatarImage alt={m.userName} src={m.userImage ?? ''} />
                        <AvatarFallback className='text-[10px]'>
                          {m.userName.substring(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className='text-xs'>{m.userName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog onOpenChange={onShowAddDialogChange} open={showAddDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Assign Team to Project</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <Select onValueChange={setSelectedTeamId} value={selectedTeamId}>
              <SelectTrigger>
                <SelectValue placeholder='Select a team...' />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map((t) => (
                  <SelectItem key={t.teamId} value={t.teamId}>
                    {t.teamName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className='flex justify-end gap-2'>
              <Button
                onClick={() => onShowAddDialogChange(false)}
                variant='outline'
              >
                Cancel
              </Button>
              <Button
                disabled={!selectedTeamId}
                loading={isAssigning}
                onClick={() =>
                  executeAssign({
                    projectId,
                    teamId: selectedTeamId,
                  })
                }
              >
                Assign Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
