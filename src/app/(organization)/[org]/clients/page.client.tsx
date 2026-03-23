'use client'

import { Shield, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import AssignProjectDialog from './_components/assign-project-dialog'
import ClientsTable from './_components/clients-table'
import InviteClientDialog from './_components/invite-client-dialog'
import PendingInvitationsBlock from './_components/pending-invitations-block'
import type { ClientsPageClientProps } from './types'

export function ClientsPageClient({
  organizationId,
  orgSlug,
  clients,
  invitations,
  canManage,
  projects,
}: ClientsPageClientProps) {
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [assignProject, setAssignProject] = useState<{
    memberId: string
    clientName: string
    existingProjectIds: string[]
  } | null>(null)

  return (
    <div className='w-full'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='font-semibold text-2xl'>Clients</h1>
        {canManage && (
          <Button onClick={() => setShowInviteDialog(true)} size='sm'>
            <UserPlus className='size-4' />
            Invite Client
          </Button>
        )}
      </div>

      {clients.length === 0 && invitations.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Shield />
            </EmptyMedia>
            <EmptyTitle>No clients yet</EmptyTitle>
            <EmptyDescription>
              Invite clients to give them visibility into your projects.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {canManage && (
            <PendingInvitationsBlock invitations={invitations} />
          )}
          <ClientsTable
            canManage={canManage}
            clients={clients}
            onAssignProject={(memberId, clientName, existingProjectIds) =>
              setAssignProject({ memberId, clientName, existingProjectIds })
            }
            orgSlug={orgSlug}
          />
        </>
      )}

      <InviteClientDialog
        onOpenChange={setShowInviteDialog}
        open={showInviteDialog}
        organizationId={organizationId}
      />

      <AssignProjectDialog
        existingProjectIds={assignProject?.existingProjectIds ?? []}
        memberId={assignProject?.memberId ?? ''}
        onOpenChange={(open) => {
          if (!open) {
            setAssignProject(null)
          }
        }}
        open={!!assignProject}
        projects={projects}
      />
    </div>
  )
}
