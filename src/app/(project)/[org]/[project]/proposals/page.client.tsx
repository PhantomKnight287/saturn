'use client'

import { FileText, Plus } from 'lucide-react'
import Link from 'next/link'

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
import type { Role, RouteImpl } from '@/types'
// import type { Role } from './_components/badge'
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
  const newUrl = `/${orgSlug}/${projectSlug}/proposals/new` as RouteImpl

  return (
    <div className='w-full'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='font-semibold text-2xl'>Proposals</h1>
        {canCreate && proposals.length > 0 && (
          <Button asChild size='sm'>
            <Link href={newUrl}>
              <Plus className='h-4 w-4' />
              New Proposal
            </Link>
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
              <Button asChild>
                <Link href={newUrl}>Create Proposal</Link>
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
