'use client'

import { useRouter } from '@bprogress/next/app'
import { AlertTriangle } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { deleteProjectAction } from '../actions'

export function DangerZoneCard({
  project,
  organizationId,
  orgSlug,
}: {
  project: { id: string; name: string }
  organizationId: string
  orgSlug: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const { execute, isPending } = useAction(deleteProjectAction, {
    onSuccess() {
      toast.success('Project deleted')
      router.replace(`/${orgSlug}`)
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to delete project')
    },
  })

  return (
    <>
      <Card className='border-destructive/50'>
        <CardHeader>
          <CardTitle className='text-destructive'>Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete this project and all of its data. This action
            cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            loading={isPending}
            onClick={() => setOpen(true)}
            variant='destructive'
          >
            <AlertTriangle className='size-4' />
            Delete Project
          </Button>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        confirmationText={project.name}
        description={
          <>
            This will permanently delete{' '}
            <span className='font-semibold text-foreground'>
              "{project.name}"
            </span>{' '}
            and all associated data including timesheets, invoices, and
            milestones. This action cannot be undone.
          </>
        }
        onConfirm={() => {
          execute({
            projectId: project.id,
            confirmName: project.name,
            organizationId,
          })
        }}
        onOpenChange={setOpen}
        open={open}
        title='Delete Project'
      />
    </>
  )
}
