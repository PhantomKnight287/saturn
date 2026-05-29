'use client'

import { useRouter } from '@bprogress/next/app'
import { Download, Plus, Trash2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { CustomFieldEditorDialog } from '@/components/custom-fields/custom-field-editor-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { CustomFieldDefinition } from '@/lib/custom-fields'
import {
  createProjectCustomFieldAction,
  deleteProjectCustomFieldAction,
  updateProjectCustomFieldAction,
} from '../actions'
import { ImportOrgFieldsDialog } from './import-org-fields-dialog'

export function ProjectCustomFieldsCard({
  organizationId,
  projectId,
  projectFields,
  orgFields,
}: {
  organizationId: string
  projectId: string
  projectFields: CustomFieldDefinition[]
  orgFields: CustomFieldDefinition[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<CustomFieldDefinition | null>(null)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [deleting, setDeleting] = useState<CustomFieldDefinition | null>(null)

  const createAction = useAction(createProjectCustomFieldAction, {
    onSuccess() {
      toast.success('Field added')
      setCreating(false)
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to add field')
    },
  })

  const updateAction = useAction(updateProjectCustomFieldAction, {
    onSuccess() {
      toast.success('Field updated')
      setEditing(null)
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to update field')
    },
  })

  const deleteAction = useAction(deleteProjectCustomFieldAction, {
    onSuccess() {
      toast.success('Field deleted')
      setDeleting(null)
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to delete field')
    },
  })

  return (
    <>
      <Card>
        <CardHeader className='flex flex-row items-start justify-between gap-4'>
          <div className='flex flex-col gap-2'>
            <CardTitle>Custom fields</CardTitle>
            <CardDescription>
              Extra fields shown on the timesheet form for this project.
            </CardDescription>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus />
            Add field
          </Button>
        </CardHeader>
        <CardContent>
          {projectFields.length === 0 ? (
            <div className='flex flex-col items-center gap-3 py-10 text-center text-sm'>
              <p className='text-muted-foreground'>No custom fields yet.</p>

              <Button onClick={() => setImporting(true)} variant='outline'>
                <Download />
                Import from workspace
              </Button>
            </div>
          ) : (
            <>
              <ul className='space-y-2'>
                {projectFields.map((f) => (
                  <li
                    className='flex items-center justify-between gap-3 rounded-md border bg-card p-3 hover:bg-accent/30'
                    key={f.id}
                  >
                    <button
                      className='flex-1 text-left'
                      onClick={() => setEditing(f)}
                      type='button'
                    >
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>{f.label}</span>
                        <Badge variant='secondary'>{f.type}</Badge>
                        {f.required && (
                          <Badge variant='outline'>Required</Badge>
                        )}
                        {f.visibleToClient && (
                          <Badge variant='outline'>Visible to client</Badge>
                        )}
                      </div>
                      {f.type === 'select' && f.options && (
                        <p className='mt-1 text-muted-foreground text-xs'>
                          {f.options.join(' · ')}
                        </p>
                      )}
                    </button>
                    <Button
                      aria-label={`Delete custom field ${f.label}`}
                      onClick={() => setDeleting(f)}
                      size='icon'
                      variant='ghost'
                    >
                      <Trash2 className='size-4 text-destructive' />
                    </Button>
                  </li>
                ))}
              </ul>
              <div className='mt-4'>
                <Button
                  onClick={() => setImporting(true)}
                  size='sm'
                  variant='outline'
                >
                  <Download />
                  Import from workspace
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <CustomFieldEditorDialog
        isPending={createAction.isPending}
        mode='create'
        onOpenChange={setCreating}
        onSubmit={(payload) => {
          createAction.execute({
            organizationId,
            projectId,
            definition: payload,
          })
        }}
        open={creating}
      />

      <CustomFieldEditorDialog
        initial={editing ?? undefined}
        isPending={updateAction.isPending}
        mode='edit'
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null)
          }
        }}
        onSubmit={(payload) => {
          if (!editing) {
            return
          }
          updateAction.execute({
            organizationId,
            projectId,
            fieldId: editing.id,
            definition: payload,
          })
        }}
        open={!!editing}
      />

      <ImportOrgFieldsDialog
        onOpenChange={setImporting}
        open={importing}
        organizationId={organizationId}
        orgFields={orgFields}
        projectFields={projectFields}
        projectId={projectId}
      />

      <ConfirmDeleteDialog
        description={
          <>
            Delete custom field{' '}
            <span className='font-semibold'>"{deleting?.label}"</span>? Values
            on existing entries will be removed.
          </>
        }
        loading={deleteAction.isPending}
        onConfirm={() => {
          if (!deleting) {
            return
          }
          deleteAction.execute({
            organizationId,
            projectId,
            fieldId: deleting.id,
          })
        }}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
          }
        }}
        open={!!deleting}
        title='Delete custom field'
      />
    </>
  )
}
