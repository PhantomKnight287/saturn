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
  readPermissions,
} from './permissions'
import { PermissionsDialog } from './permissions-dialog'
import type { ApiKey } from './types'

function secondsUntil(date: Date | undefined): number | undefined {
  if (!date) {
    return undefined
  }
  return Math.max(1, Math.floor((date.getTime() - Date.now()) / 1000))
}

export function EditApiKeyDialog({
  apiKey,
  onOpenChange,
  onUpdated,
}: {
  apiKey: ApiKey | null
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}) {
  const [name, setName] = useState('')
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined)
  const [permissions, setPermissions] = useState<PermissionMap>(
    emptyPermissions()
  )
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!apiKey) {
      return
    }
    setName(apiKey.name ?? '')
    setExpiresAt(apiKey.expiresAt ? new Date(apiKey.expiresAt) : undefined)
    const existing = readPermissions(apiKey.metadata)
    setPermissions({ ...emptyPermissions(), ...existing })
    setSubmitting(false)
  }, [apiKey])

  if (!apiKey) {
    return null
  }

  const selectedCount = countSelected(permissions)
  const trimmedName = name.trim()

  const handleSubmit = async () => {
    if (!trimmedName) {
      toast.error('Name is required')
      return
    }

    setSubmitting(true)
    const { error } = await authClient.apiKey.update({
      keyId: apiKey.id,
      name: trimmedName,
      expiresIn: secondsUntil(expiresAt) ?? null,
      metadata: { permissions },
    })
    setSubmitting(false)

    if (error) {
      toast.error(error.message ?? 'Failed to update API key')
      return
    }
    toast.success('API key updated')
    onOpenChange(false)
    onUpdated()
  }

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={apiKey !== null}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Edit API key</DialogTitle>
            <DialogDescription>
              Update the name, expiry, and permissions for this key.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field className='gap-1'>
              <FieldLabel>Name</FieldLabel>
              <Input
                onChange={(e) => setName(e.target.value)}
                placeholder='Production backend'
                value={name}
              />
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
              Save Changes
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
