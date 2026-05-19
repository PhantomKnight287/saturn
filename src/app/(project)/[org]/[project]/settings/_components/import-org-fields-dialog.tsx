'use client'

import { useRouter } from '@bprogress/next/app'
import { AlertTriangle } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  type CustomFieldDefinition,
  normalizeCustomFieldLabel,
} from '@/lib/custom-fields'
import { importOrgCustomFieldsAction } from '../actions'

export function ImportOrgFieldsDialog({
  open,
  onOpenChange,
  organizationId,
  projectId,
  orgFields,
  projectFields,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  projectId: string
  orgFields: CustomFieldDefinition[]
  projectFields: CustomFieldDefinition[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const projectLabels = useMemo(
    () => new Set(projectFields.map((f) => normalizeCustomFieldLabel(f.label))),
    [projectFields]
  )

  const { execute, isPending } = useAction(importOrgCustomFieldsAction, {
    onSuccess(res) {
      const count = res.data?.imported ?? 0
      toast.success(`Imported ${count} field${count === 1 ? '' : 's'}`)
      setSelected(new Set())
      onOpenChange(false)
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to import fields')
    },
  })

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const allSelected = orgFields.length > 0 && selected.size === orgFields.length

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-[520px]'>
        <DialogHeader>
          <DialogTitle>Import fields from workspace</DialogTitle>
          <DialogDescription>
            Choose which workspace-level fields to copy into this project.
            Copies are independent — later changes to org fields won't update
            them here.
          </DialogDescription>
        </DialogHeader>

        {orgFields.length === 0 ? (
          <p className='py-6 text-center text-muted-foreground text-sm'>
            No organization-level fields configured yet.
          </p>
        ) : (
          <div className='space-y-2'>
            {/* biome-ignore lint/a11y/noLabelWithoutControl: Checkbox is a Radix button, not a native input — biome can't detect it */}
            <label className='flex cursor-pointer items-center gap-2 border-b pb-2 font-medium text-sm'>
              <Checkbox
                aria-label='Select all workspace fields'
                checked={allSelected}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelected(new Set(orgFields.map((f) => f.id)))
                  } else {
                    setSelected(new Set())
                  }
                }}
              />
              Select all
            </label>
            <ul className='max-h-80 space-y-1 overflow-y-auto'>
              {orgFields.map((f) => {
                const dup = projectLabels.has(
                  normalizeCustomFieldLabel(f.label)
                )
                return (
                  <li key={f.id}>
                    {/* biome-ignore lint/a11y/noLabelWithoutControl: Checkbox is a Radix button, not a native input — biome can't detect it */}
                    <label className='flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-accent/30'>
                      <Checkbox
                        aria-label={`Select field ${f.label}`}
                        checked={selected.has(f.id)}
                        onCheckedChange={() => toggle(f.id)}
                      />
                      <span className='flex-1 text-sm'>{f.label}</span>
                      <Badge variant='secondary'>{f.type}</Badge>
                      {dup && (
                        <span className='flex items-center gap-1 text-amber-600 text-xs'>
                          <AlertTriangle className='size-3' />
                          Already in project
                        </span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type='button'
            variant='outline'
          >
            Cancel
          </Button>
          <Button
            disabled={selected.size === 0}
            loading={isPending}
            onClick={() =>
              execute({
                organizationId,
                projectId,
                fieldIds: [...selected],
              })
            }
          >
            Import {selected.size > 0 ? selected.size : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
