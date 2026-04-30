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
import { deleteOrganizationAction } from '../actions'

export function DangerZoneCard({
  organization,
}: {
  organization: { id: string; name: string }
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const { execute, isPending } = useAction(deleteOrganizationAction, {
    onSuccess() {
      toast.success('Workspace deleted')
      router.push('/')
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to delete workspace')
    },
  })

  return (
    <>
      <Card className='border-destructive/50'>
        <CardHeader>
          <CardTitle className='text-destructive'>Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete this workspace and all of its data. This action
            cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setOpen(true)} variant='destructive'>
            <AlertTriangle className='size-4' />
            Delete Workspace
          </Button>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        actionLabel='Delete Workspace'
        confirmationText={organization.name}
        description={
          <>
            This will permanently delete{' '}
            <span className='font-semibold text-foreground'>
              {organization.name}
            </span>{' '}
            and all associated data including projects, timesheets, and
            invoices. This action cannot be undone.
          </>
        }
        loading={isPending}
        onConfirm={() =>
          execute({
            organizationId: organization.id,
            confirmName: organization.name,
          })
        }
        onOpenChange={setOpen}
        open={open}
        title='Delete Workspace'
      />
    </>
  )
}
