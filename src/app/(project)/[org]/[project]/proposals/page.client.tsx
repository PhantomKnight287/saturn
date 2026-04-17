'use client'

import { useRouter } from '@bprogress/next/app'
import { FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import type { proposals } from '@/server/db/schema'
import type { Role } from '@/types'
import ProposalCard from './_components/proposal-card'

type Proposal = typeof proposals.$inferSelect

interface ProposalsClientProps {
  canCreate: boolean
  orgSlug: string
  projectSlug: string
  proposals: Proposal[]
  role: Role
}

export function ProposalsClient({
  proposals,
  orgSlug,
  projectSlug,
  canCreate,
  role,
}: ProposalsClientProps) {
  const newUrl = `/${orgSlug}/${projectSlug}/proposals/new`
  const router = useRouter()
  return (
    <div className='w-full'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='font-semibold text-2xl'>Proposals</h1>
        {canCreate && proposals.length > 0 && (
          <Button kbd='c' onClick={() => router.push(newUrl)} size='sm'>
            <Plus className='h-4 w-4' />
            New Proposal
          </Button>
        )}
      </div>

      {proposals.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No proposals yet</EmptyTitle>
            <EmptyDescription>
              Proposals define scope, timeline, and pricing for your clients.
              Create one to get started.
            </EmptyDescription>
          </EmptyHeader>
          {canCreate && (
            <EmptyContent>
              <Button kbd='c' onClick={() => router.push(newUrl)} size='sm'>
                New Proposal
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              orgSlug={orgSlug}
              projectSlug={projectSlug}
              proposal={proposal}
              role={role}
            />
          ))}
        </div>
      )}
    </div>
  )
}
