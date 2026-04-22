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
import type { requirements } from '@/server/db/schema'
import type { Role } from '@/types'
import RequirementCard from './_components/requirement-card'

type Requirement = typeof requirements.$inferSelect

interface RequirementsClientProps {
  canCreate: boolean
  orgSlug: string
  projectSlug: string
  requirements: Requirement[]
  role: Role
  isClientInvolved?: boolean
}

export function RequirementsClient({
  requirements,
  orgSlug,
  projectSlug,
  canCreate,
  role,
  isClientInvolved,
}: RequirementsClientProps) {
  const newUrl = `/${orgSlug}/${projectSlug}/requirements/new`
  const router = useRouter()
  return (
    <div className='w-full'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='font-semibold text-2xl'>Requirements</h1>
        {canCreate && requirements.length > 0 && (
          <Button
            kbd='c'
            onClick={() => {
              router.push(newUrl)
            }}
            size='sm'
          >
            <Plus className='h-4 w-4' />
            New Requirement
          </Button>
        )}
      </div>

      {requirements.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No requirements yet</EmptyTitle>
            <EmptyDescription>
              Requirements define the scope of work for this project. Create one
              to get started.
            </EmptyDescription>
          </EmptyHeader>
          {canCreate && (
            <EmptyContent>
              <Button
                kbd='c'
                onClick={() => {
                  router.push(newUrl)
                }}
                size='sm'
              >
                New Requirement
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {requirements.map((requirement) => (
            <RequirementCard
              key={requirement.id}
              orgSlug={orgSlug}
              projectSlug={projectSlug}
              requirement={requirement}
              role={role}
              isClientInvolved={isClientInvolved}
            />
          ))}
        </div>
      )}
    </div>
  )
}
