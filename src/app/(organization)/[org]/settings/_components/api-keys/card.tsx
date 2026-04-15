'use client'

import { KeyRound, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { authClient } from '@/lib/auth-client'
import { CreateApiKeyDialog } from './create-dialog'
import { EditApiKeyDialog } from './edit-dialog'
import { KeyList } from './key-list'
import { LockedState } from './locked-state'
import { RevealApiKeyDialog } from './reveal-dialog'
import type { ApiKey, CreatedApiKey } from './types'

export function ApiKeysCard({
  organizationId,
  subscriptionStatus,
  onUpgrade,
  upgrading,
}: {
  organizationId: string
  subscriptionStatus: 'loading' | 'free' | 'active'
  onUpgrade: () => void
  upgrading: boolean
}) {
  if (subscriptionStatus === 'loading') {
    return <LoadingState />
  }
  if (subscriptionStatus === 'free') {
    return <LockedState onUpgrade={onUpgrade} upgrading={upgrading} />
  }
  return <ProApiKeys organizationId={organizationId} />
}

function LoadingState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <KeyRound className='size-5' />
          API Keys
        </CardTitle>
        <CardDescription>
          Programmatic access to your workspace data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Skeleton className='h-24 w-full' />
      </CardContent>
    </Card>
  )
}

function ProApiKeys({ organizationId }: { organizationId: string }) {
  const [keys, setKeys] = useState<ApiKey[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [revealed, setRevealed] = useState<CreatedApiKey | null>(null)
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null)
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadKeys = useCallback(async () => {
    setLoading(true)
    const { data, error } = await authClient.apiKey.list({
      query: { organizationId },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message ?? 'Failed to load API keys')
      setKeys([])
      return
    }
    setKeys(data?.apiKeys ?? [])
  }, [organizationId])

  useEffect(() => {
    loadKeys()
  }, [loadKeys])

  const handleConfirmDelete = async () => {
    if (!keyToDelete) {
      return
    }
    setDeleting(true)
    const { error } = await authClient.apiKey.delete({ keyId: keyToDelete.id })
    setDeleting(false)
    if (error) {
      toast.error(error.message ?? 'Failed to delete API key')
      return
    }
    toast.success('API key deleted')
    setKeyToDelete(null)
    loadKeys()
  }

  const handleCreated = (created: CreatedApiKey) => {
    setRevealed(created)
    loadKeys()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between gap-4'>
            <div className='space-y-1'>
              <CardTitle className='flex items-center gap-2'>
                <KeyRound className='size-5' />
                API Keys
              </CardTitle>
              <CardDescription>
                Create and manage API keys to access this workspace
                programmatically.
              </CardDescription>
            </div>
            <Button onClick={() => setCreateOpen(true)} type='button'>
              <Plus className='size-4' />
              Create Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <KeyList
            keys={keys}
            loading={loading}
            onCreate={() => setCreateOpen(true)}
            onDelete={setKeyToDelete}
            onEdit={setEditingKey}
          />
        </CardContent>
      </Card>

      <CreateApiKeyDialog
        onCreated={handleCreated}
        onOpenChange={setCreateOpen}
        open={createOpen}
        organizationId={organizationId}
      />

      <EditApiKeyDialog
        apiKey={editingKey}
        onOpenChange={(open) => {
          if (!open) {
            setEditingKey(null)
          }
        }}
        onUpdated={loadKeys}
      />

      <RevealApiKeyDialog onClose={() => setRevealed(null)} value={revealed} />

      <ConfirmDeleteDialog
        actionLabel='Delete Key'
        confirmationText={keyToDelete?.name ?? ''}
        description={
          <>
            This will permanently delete the API key{' '}
            <span className='font-semibold text-foreground'>
              {keyToDelete?.name}
            </span>
            . Any integrations using it will stop working immediately.
          </>
        }
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onOpenChange={(open) => {
          if (!open) {
            setKeyToDelete(null)
          }
        }}
        open={keyToDelete !== null}
        title='Delete API Key'
      />
    </>
  )
}
