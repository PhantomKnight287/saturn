'use client'

import { useRouter } from '@bprogress/next/app'
import { FolderOpen, Plus } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { analyticsService } from '@/services/analytics.service'
import CreateProjectDialog from './_components/create-project-dialog'
import ProjectCard from './_components/project-card'
import { createProjectAction } from './actions'
import type { createProjectSchema } from './common'
import type { ProjectsClientProps } from './types'

export function ProjectsClient({
  projects,
  organizationId,
  orgSlug,
  canCreate,
  openNewProjectDialog,
}: ProjectsClientProps) {
  const [dialogOpen, setDialogOpen] = useState(
    (openNewProjectDialog && canCreate) ?? false
  )
  const router = useRouter()
  const { execute, isPending } = useAction(createProjectAction, {
    onSuccess() {
      toast.success('Project created')
      setDialogOpen(false)
      analyticsService.track('project_create')
      router.refresh()
    },
    onError({ error }) {
      if (error.validationErrors) {
        toast.error('Please check your input and try again.')
      } else {
        toast.error(
          error.serverError ??
            'Failed to create project. Slug may already be taken.'
        )
      }
    },
  })

  const handleSubmit = (data: z.infer<typeof createProjectSchema>) => {
    execute(data)
  }

  return (
    <div className='w-full'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='font-semibold text-2xl'>Projects</h1>
        {canCreate && projects.length > 0 && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className='h-4 w-4' />
            New Project
          </Button>
        )}
      </div>

      {projects.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <FolderOpen />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Create your first project to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setDialogOpen(true)}>Create Project</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {projects.map((project) => (
            <ProjectCard key={project.id} orgSlug={orgSlug} project={project} />
          ))}
        </div>
      )}
      <CreateProjectDialog
        dialogOpen={dialogOpen}
        handleSubmit={handleSubmit}
        isPending={isPending}
        organizationId={organizationId}
        orgSlug={orgSlug}
        setDialogOpen={setDialogOpen}
      />
    </div>
  )
}
