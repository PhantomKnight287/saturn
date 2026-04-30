'use client'

import { useRouter } from '@bprogress/next/app'
import { Milestone as MilestoneIcon, Plus } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import type { milestones } from '@/server/db/schema'
import { analyticsService } from '@/services/analytics.service'
import { CreateMilestoneDialog } from './_components/create-milestone-dialog'
import { MilestoneCard } from './_components/milestone-card'
import { createMilestoneAction } from './actions'

type Milestone = typeof milestones.$inferSelect & {
  progress: { total: number; signed: number }
}

interface MilestonesClientProps {
  canComplete: boolean
  canCreate: boolean
  canDelete: boolean
  canUpdate: boolean
  defaultCurrency?: string
  milestones: Milestone[]
  orgSlug: string
  projectId: string
  projectSlug: string
}

export function MilestonesClient({
  milestones,
  projectId,
  orgSlug,
  projectSlug,
  canCreate,
  canUpdate,
  canComplete,
  canDelete,
  defaultCurrency,
}: MilestonesClientProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { execute, isPending } = useAction(createMilestoneAction, {
    onSuccess() {
      toast.success('Milestone created')
      router.refresh()
      setDialogOpen(false)
      analyticsService.track('milestone_created')
    },
    onError({ error }) {
      if (error.validationErrors) {
        toast.error('Please check your input and try again.')
      } else {
        toast.error(error.serverError ?? 'Failed to create milestone.')
      }
    },
  })

  return (
    <div className='w-full'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='font-semibold text-2xl'>Milestones</h1>
        {canCreate && milestones.length > 0 && (
          <Button kbd='c' onClick={() => setDialogOpen(true)}>
            <Plus className='h-4 w-4' />
            New Milestone
          </Button>
        )}
      </div>

      {milestones.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <MilestoneIcon />
            </EmptyMedia>
            <EmptyTitle>No milestones yet</EmptyTitle>
            <EmptyDescription>
              Milestones break your project into meaningful phases with
              deadlines. Create one to get started.
            </EmptyDescription>
          </EmptyHeader>
          {canCreate && (
            <EmptyContent>
              <Button kbd='c' onClick={() => setDialogOpen(true)}>
                Create Milestone
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {milestones.map((milestone) => (
            <MilestoneCard
              canComplete={canComplete}
              canDelete={canDelete}
              canUpdate={canUpdate}
              key={milestone.id}
              milestone={milestone}
              orgSlug={orgSlug}
              projectSlug={projectSlug}
            />
          ))}
        </div>
      )}

      {canCreate && (
        <CreateMilestoneDialog
          defaultCurrency={defaultCurrency}
          isPending={isPending}
          onOpenChange={setDialogOpen}
          onSubmit={(data) =>
            execute({
              ...data,
              budgetAmountCents: data.budgetAmountCents
                ? data.budgetAmountCents * 100
                : undefined,
              budgetMinutes: data.budgetMinutes
                ? data.budgetMinutes * 60
                : undefined,
            })
          }
          open={dialogOpen}
          projectId={projectId}
        />
      )}
    </div>
  )
}
