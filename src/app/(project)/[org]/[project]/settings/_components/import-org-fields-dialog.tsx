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
import type { CustomFieldDefinition } from '@/lib/custom-fields'
import { importOrgCustomFieldsAction } from '../actions'

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase()
}

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
    () => new Set(projectFields.map((f) => normalizeLabel(f.label))),
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
          <DialogTitle>Import fields from organization</DialogTitle>
          <DialogDescription>
            Choose which organization-level fields to copy into this project.
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
            {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: row wraps Checkbox which is the control */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: row wraps Checkbox which is the control */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: row is a visual convenience for the inner Checkbox */}
            <div
              className='flex cursor-pointer items-center gap-2 border-b pb-2 font-medium text-sm'
              onClick={() => {
                if (allSelected) {
                  setSelected(new Set())
                } else {
                  setSelected(new Set(orgFields.map((f) => f.id)))
                }
              }}
            >
              <Checkbox checked={allSelected} />
              Select all
            </div>
            <ul className='max-h-80 space-y-1 overflow-y-auto'>
              {orgFields.map((f) => {
                const dup = projectLabels.has(normalizeLabel(f.label))
                return (
                  <li key={f.id}>
                    {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: row wraps Checkbox which is the control */}
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: row wraps Checkbox which is the control */}
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: row is a visual convenience for the inner Checkbox */}
                    <div
                      className='flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-accent/30'
                      onClick={() => toggle(f.id)}
                    >
                      <Checkbox checked={selected.has(f.id)} />
                      <span className='flex-1 text-sm'>{f.label}</span>
                      <Badge variant='secondary'>{f.type}</Badge>
                      {dup && (
                        <span className='flex items-center gap-1 text-amber-600 text-xs'>
                          <AlertTriangle className='size-3' />
                          Already in project
                        </span>
                      )}
                    </div>
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
