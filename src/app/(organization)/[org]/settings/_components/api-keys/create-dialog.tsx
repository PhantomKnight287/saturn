'use client'

import { Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import DatePicker from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import {
  countSelected,
  emptyPermissions,
  type PermissionMap,
} from './permissions'
import { PermissionsDialog } from './permissions-dialog'
import type { CreatedApiKey } from './types'

function secondsUntil(date: Date | undefined): number | undefined {
  if (!date) {
    return undefined
  }
  return Math.max(1, Math.floor((date.getTime() - Date.now()) / 1000))
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  organizationId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  onCreated: (created: CreatedApiKey) => void
}) {
  const [name, setName] = useState('')
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined)
  const [permissions, setPermissions] = useState<PermissionMap>(
    emptyPermissions()
  )
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setName('')
      setExpiresAt(undefined)
      setPermissions(emptyPermissions())
      setSubmitting(false)
    }
  }, [open])

  const selectedCount = countSelected(permissions)
  const trimmedName = name.trim()

  const handleSubmit = async () => {
    if (!trimmedName) {
      toast.error('Name is required')
      return
    }
    const expiresIn = secondsUntil(expiresAt)

    setSubmitting(true)
    const { data, error } = await authClient.apiKey.create({
      name: trimmedName,
      prefix: 'saturn_',
      organizationId,
      ...(expiresIn ? { expiresIn } : {}),
      metadata: { permissions },
    })
    setSubmitting(false)

    if (error || !data) {
      toast.error(error?.message ?? 'Failed to create API key')
      return
    }
    toast.success('API key created')
    onOpenChange(false)
    onCreated({ name: trimmedName, value: data.key })
  }

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              Give this key a name, set an optional expiry, and pick the
              permissions it should grant.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field className='gap-1'>
              <FieldLabel>Name</FieldLabel>
              <Input
                autoFocus
                onChange={(e) => setName(e.target.value)}
                placeholder='Production backend'
                value={name}
              />
              <FieldDescription>
                A descriptive name to identify this key.
              </FieldDescription>
            </Field>
            <Field className='gap-1'>
              <FieldLabel>Expiry</FieldLabel>
              <DatePicker
                disablePastDates
                onChange={setExpiresAt}
                value={expiresAt}
              />
              <FieldDescription>
                Leave empty for a key that never expires.
              </FieldDescription>
            </Field>
            <Field className='gap-1'>
              <FieldLabel>Permissions</FieldLabel>
              <Button
                className='justify-between'
                onClick={() => setPermissionsOpen(true)}
                type='button'
                variant='outline'
              >
                <span className='flex items-center gap-2'>
                  <Shield className='size-4' />
                  {selectedCount === 0
                    ? 'No permissions selected'
                    : `${selectedCount} permission${selectedCount === 1 ? '' : 's'} selected`}
                </span>
                <span className='text-muted-foreground text-xs'>Configure</span>
              </Button>
              <FieldDescription>
                Select which actions this key is allowed to perform.
              </FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              type='button'
              variant='outline'
            >
              Cancel
            </Button>
            <Button
              disabled={!trimmedName}
              loading={submitting}
              onClick={handleSubmit}
              type='button'
            >
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PermissionsDialog
        onOpenChange={setPermissionsOpen}
        onSave={setPermissions}
        open={permissionsOpen}
        value={permissions}
      />
    </>
  )
}
