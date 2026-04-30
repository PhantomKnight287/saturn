'use client'

import { Briefcase, Plus, UserPlus, Users, UsersRound } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import MembersSection from './_components/members-section'
import StakeholdersSection from './_components/stakeholders-section'
import TeamsSection from './_components/teams-section'
import type { TeamPageClientProps } from './types'

type Tab = 'members' | 'teams' | 'clients'

export function TeamPageClient({
  projectId,
  orgSlug,
  projectSlug,
  organizationId,
  projectMembers,
  projectClients,
  projectTeams,
  orgTeams,
  orgMembers,
  pendingInvitations,
  canManage,
  defaultMemberRate,
  defaultCurrency,
}: TeamPageClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showAssignTeamDialog, setShowAssignTeamDialog] = useState(false)

  const memberInvitations = pendingInvitations.filter(
    (i) => i.role !== 'client'
  )
  const clientInvitations = pendingInvitations.filter(
    (i) => i.role === 'client'
  )

  const assignedTeamIds = new Set(projectTeams.map((t) => t.teamId))
  const hasAvailableTeams = orgTeams.some((t) => !assignedTeamIds.has(t.teamId))

  return (
    <div className='w-full'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='font-semibold text-2xl'>Team</h1>
        {canManage && (
          <>
            {activeTab === 'members' && (
              <Button onClick={() => setShowInviteDialog(true)}>
                <UserPlus className='size-4' />
                Invite Member
              </Button>
            )}
            {activeTab === 'teams' && (
              <Button
                disabled={!hasAvailableTeams}
                onClick={() => setShowAssignTeamDialog(true)}
              >
                <Plus className='size-4' />
                Assign Team
              </Button>
            )}
            {activeTab === 'clients' && (
              <Button onClick={() => setShowInviteDialog(true)}>
                <UserPlus className='size-4' />
                Invite Client
              </Button>
            )}
          </>
        )}
      </div>

      <Tabs
        onValueChange={(v) => {
          setActiveTab(v as Tab)
          setShowInviteDialog(false)
        }}
        value={activeTab}
      >
        <TabsList>
          <TabsTrigger className='gap-2' value='members'>
            <Users className='size-4' />
            Members
            <Badge className='px-1.5 py-0 text-xs' variant='secondary'>
              {projectMembers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger className='gap-2' value='teams'>
            <UsersRound className='size-4' />
            Teams
            <Badge className='px-1.5 py-0 text-xs' variant='secondary'>
              {projectTeams.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger className='gap-2' value='clients'>
            <Briefcase className='size-4' />
            Clients
            <Badge className='px-1.5 py-0 text-xs' variant='secondary'>
              {projectClients.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value='members'>
          <MembersSection
            canManage={canManage}
            defaultCurrency={defaultCurrency}
            defaultMemberRate={defaultMemberRate}
            onShowInviteDialogChange={setShowInviteDialog}
            organizationId={organizationId}
            orgMembers={orgMembers}
            orgSlug={orgSlug}
            pendingInvitations={memberInvitations}
            projectId={projectId}
            projectMembers={projectMembers}
            projectSlug={projectSlug}
            showInviteDialog={showInviteDialog}
          />
        </TabsContent>
        <TabsContent value='teams'>
          <TeamsSection
            canManage={canManage}
            onShowAddDialogChange={setShowAssignTeamDialog}
            orgSlug={orgSlug}
            orgTeams={orgTeams}
            projectId={projectId}
            projectSlug={projectSlug}
            projectTeams={projectTeams}
            showAddDialog={showAssignTeamDialog}
          />
        </TabsContent>
        <TabsContent value='clients'>
          <StakeholdersSection
            canManage={canManage}
            onShowInviteDialogChange={setShowInviteDialog}
            organizationId={organizationId}
            orgSlug={orgSlug}
            pendingInvitations={clientInvitations}
            projectClients={projectClients}
            projectId={projectId}
            projectSlug={projectSlug}
            showInviteDialog={showInviteDialog}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
