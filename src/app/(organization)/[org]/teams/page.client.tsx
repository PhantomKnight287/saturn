'use client'

import { Plus, UserPlus, Users, UsersRound } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import MembersSection from './_components/members-section'
import TeamsSection from './_components/teams-section'
import type { TeamsPageClientProps } from './types'

type Tab = 'members' | 'teams'

export function TeamsPageClient({
  organizationId,
  orgSlug,
  members,
  teams,
  invitations,
  canManage,
  currentMemberId,
  defaultMemberRate,
  defaultCurrency,
}: TeamsPageClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false)

  return (
    <div className='w-full'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='font-semibold text-2xl'>Teams & Members</h1>
        {canManage && (
          <>
            {activeTab === 'members' && (
              <Button onClick={() => setShowInviteDialog(true)}>
                <UserPlus className='size-4' />
                Invite Member
              </Button>
            )}
            {activeTab === 'teams' && (
              <Button onClick={() => setShowCreateTeamDialog(true)}>
                <Plus className='size-4' />
                Create Team
              </Button>
            )}
          </>
        )}
      </div>

      <Tabs
        onValueChange={(v) => {
          setActiveTab(v as Tab)
          setShowInviteDialog(false)
          setShowCreateTeamDialog(false)
        }}
        value={activeTab}
      >
        <TabsList>
          <TabsTrigger className='gap-2' value='members'>
            <Users className='size-4' />
            Members
            <Badge className='px-1.5 py-0 text-xs' variant='secondary'>
              {members.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger className='gap-2' value='teams'>
            <UsersRound className='size-4' />
            Teams
            <Badge className='px-1.5 py-0 text-xs' variant='secondary'>
              {teams.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value='members'>
          <MembersSection
            canManage={canManage}
            currentMemberId={currentMemberId}
            defaultCurrency={defaultCurrency}
            defaultMemberRate={defaultMemberRate}
            invitations={invitations}
            members={members}
            onShowInviteDialogChange={setShowInviteDialog}
            organizationId={organizationId}
            orgSlug={orgSlug}
            showInviteDialog={showInviteDialog}
          />
        </TabsContent>
        <TabsContent value='teams'>
          <TeamsSection
            canManage={canManage}
            members={members}
            onShowCreateDialogChange={setShowCreateTeamDialog}
            organizationId={organizationId}
            orgSlug={orgSlug}
            showCreateDialog={showCreateTeamDialog}
            teams={teams}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
