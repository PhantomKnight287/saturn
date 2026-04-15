/** biome-ignore-all lint/a11y/noLabelWithoutControl: Todo: will fix later */
'use client'

import { useEffect, useState } from 'react'
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
  ALLOWED_STATEMENTS,
  allPermissions,
  countSelected,
  emptyPermissions,
  formatResource,
  humaniseAction,
  type PermissionMap,
  RESOURCE_KEYS,
  TOTAL_PERMISSION_COUNT,
} from './permissions'

export function PermissionsDialog({
  open,
  onOpenChange,
  value,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: PermissionMap
  onSave: (next: PermissionMap) => void
}) {
  const [draft, setDraft] = useState<PermissionMap>(value)

  useEffect(() => {
    if (open) {
      setDraft(value)
    }
  }, [open, value])

  const selectedCount = countSelected(draft)

  const toggleAction = (resource: string, action: string) => {
    setDraft((prev) => {
      const current = prev[resource] ?? []
      return {
        ...prev,
        [resource]: current.includes(action)
          ? current.filter((a) => a !== action)
          : [...current, action],
      }
    })
  }

  const toggleResource = (resource: string) => {
    setDraft((prev) => {
      const current = prev[resource] ?? []
      const all = ALLOWED_STATEMENTS[resource] ?? []
      const allChecked = all.every((a) => current.includes(a))
      return { ...prev, [resource]: allChecked ? [] : [...all] }
    })
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Configure permissions</DialogTitle>
          <DialogDescription>
            Choose exactly what this API key can do. Permissions are scoped to
            this workspace.
          </DialogDescription>
        </DialogHeader>

        <div className='flex items-center justify-between border-b pb-2 text-sm'>
          <span className='text-muted-foreground'>
            {selectedCount} of {TOTAL_PERMISSION_COUNT} selected
          </span>
          <div className='flex gap-2'>
            <Button
              disabled={selectedCount === TOTAL_PERMISSION_COUNT}
              onClick={() => setDraft(allPermissions())}
              size='sm'
              type='button'
              variant='outline'
            >
              Select all
            </Button>
            <Button
              disabled={selectedCount === 0}
              onClick={() => setDraft(emptyPermissions())}
              size='sm'
              type='button'
              variant='outline'
            >
              Clear
            </Button>
          </div>
        </div>

        <div className='max-h-[55vh] space-y-1 overflow-y-auto pr-1'>
          {RESOURCE_KEYS.map((resource) => (
            <ResourceRow
              key={resource}
              onToggleAction={(action) => toggleAction(resource, action)}
              onToggleResource={() => toggleResource(resource)}
              resource={resource}
              selectedActions={draft[resource] ?? []}
            />
          ))}
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type='button'
            variant='outline'
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(draft)
              onOpenChange(false)
            }}
            type='button'
          >
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ResourceRow({
  resource,
  selectedActions,
  onToggleAction,
  onToggleResource,
}: {
  resource: string
  selectedActions: string[]
  onToggleAction: (action: string) => void
  onToggleResource: () => void
}) {
  const actions = ALLOWED_STATEMENTS[resource] ?? []
  const allChecked = actions.every((a) => selectedActions.includes(a))
  const someChecked =
    !allChecked && actions.some((a) => selectedActions.includes(a))

  return (
    <div className='rounded-lg border p-3'>
      <div className='flex items-center justify-between'>
        <label className='flex items-center gap-2 font-medium text-sm'>
          <Checkbox
            checked={allChecked ? true : someChecked ? 'indeterminate' : false}
            onCheckedChange={onToggleResource}
          />
          {formatResource(resource)}
        </label>
        <span className='text-muted-foreground text-xs'>
          {selectedActions.length} / {actions.length}
        </span>
      </div>
      <div className='mt-2 flex flex-wrap gap-3 pl-6'>
        {actions.map((action) => (
          <label
            className='flex items-center gap-2 text-sm capitalize'
            key={action}
          >
            <Checkbox
              checked={selectedActions.includes(action)}
              onCheckedChange={() => onToggleAction(action)}
            />
            {humaniseAction(action)}
          </label>
        ))}
      </div>
    </div>
  )
}
