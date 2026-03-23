'use client'

import { UsersRound } from 'lucide-react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import type { OrgMember, OrgTeamWithMembers } from '../types'
import CreateTeamDialog from './create-team-dialog'
import TeamCard from './team-card'

export default function TeamsSection({
  organizationId,
  orgSlug,
  teams,
  members,
  canManage,
  showCreateDialog,
  onShowCreateDialogChange,
}: {
  organizationId: string
  orgSlug: string
  teams: OrgTeamWithMembers[]
  members: OrgMember[]
  canManage: boolean
  showCreateDialog: boolean
  onShowCreateDialogChange: (open: boolean) => void
}) {
  if (teams.length === 0 && !canManage) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <UsersRound />
          </EmptyMedia>
          <EmptyTitle>No teams yet</EmptyTitle>
          <EmptyDescription>
            Teams help you organize members and assign them to projects
            together.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      {teams.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <UsersRound />
            </EmptyMedia>
            <EmptyTitle>No teams yet</EmptyTitle>
            <EmptyDescription>
              Create a team to organize your workspace members.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='space-y-4'>
          {teams.map((team) => (
            <TeamCard
              canManage={canManage}
              isLastTeam={teams.length === 1}
              key={team.teamId}
              orgMembers={members}
              team={team}
            />
          ))}
        </div>
      )}

      <CreateTeamDialog
        onOpenChange={onShowCreateDialogChange}
        open={showCreateDialog}
        organizationId={organizationId}
      />
    </>
  )
}
