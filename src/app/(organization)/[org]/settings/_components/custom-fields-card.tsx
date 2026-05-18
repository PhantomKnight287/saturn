'use client'

import { useRouter } from '@bprogress/next/app'
import { Plus, Trash2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
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
  createOrgCustomFieldAction,
  deleteOrgCustomFieldAction,
  updateOrgCustomFieldAction,
} from '../actions'

export function OrgCustomFieldsCard({
  organizationId,
  customFields,
}: {
  organizationId: string
  customFields: CustomFieldDefinition[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<CustomFieldDefinition | null>(null)
  const [creating, setCreating] = useState(false)

  const createAction = useAction(createOrgCustomFieldAction, {
    onSuccess() {
      toast.success('Field added')
      setCreating(false)
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to add field')
    },
  })

  const updateAction = useAction(updateOrgCustomFieldAction, {
    onSuccess() {
      toast.success('Field updated')
      setEditing(null)
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to update field')
    },
  })

  const deleteAction = useAction(deleteOrgCustomFieldAction, {
    onSuccess() {
      toast.success('Field deleted')
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
          <div>
            <CardTitle>Custom fields</CardTitle>
            <CardDescription>
              Templates copied into every new project. Existing projects are not
              affected by changes here.
            </CardDescription>
          </div>
          <Button onClick={() => setCreating(true)} size='sm'>
            <Plus className='size-4' />
            Add field
          </Button>
        </CardHeader>
        <CardContent>
          {customFields.length === 0 ? (
            <div className='flex flex-col items-center gap-3 py-10 text-center text-muted-foreground text-sm'>
              <p>No custom fields yet.</p>
              <Button
                onClick={() => setCreating(true)}
                size='sm'
                variant='outline'
              >
                <Plus className='size-4' />
                Add field
              </Button>
            </div>
          ) : (
            <ul className='space-y-2'>
              {customFields.map((f) => (
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
                      {f.required && <Badge variant='outline'>Required</Badge>}
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
                    onClick={() => {
                      if (
                        // biome-ignore lint/suspicious/noAlert: simple confirm for v1; consider AlertDialog later
                        confirm(`Delete "${f.label}"? This cannot be undone.`)
                      ) {
                        deleteAction.execute({
                          organizationId,
                          fieldId: f.id,
                        })
                      }
                    }}
                    size='icon'
                    variant='ghost'
                  >
                    <Trash2 className='size-4 text-destructive' />
                  </Button>
                </li>
              ))}
            </ul>
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
            definition: payload,
          })
        }}
        open={creating}
      />

      <CustomFieldEditorDialog
        initial={
          editing
            ? {
                label: editing.label,
                type: editing.type,
                required: editing.required,
                visibleToClient: editing.visibleToClient,
                defaultValue: editing.defaultValue,
                options: editing.options,
                config: editing.config,
              }
            : undefined
        }
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
            fieldId: editing.id,
            definition: payload,
          })
        }}
        open={!!editing}
      />
    </>
  )
}
