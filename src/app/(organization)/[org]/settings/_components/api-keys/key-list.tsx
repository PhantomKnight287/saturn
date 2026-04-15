'use client'

import { format, formatDistanceToNow } from 'date-fns'
import {
  KeyRound,
  MoreVertical,
  Pencil,
  Plus,
  Shield,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { countSelected, readPermissions } from './permissions'
import type { ApiKey } from './types'

export function KeyList({
  keys,
  loading,
  onDelete,
  onEdit,
  onCreate,
}: {
  keys: ApiKey[] | null
  loading: boolean
  onDelete: (key: ApiKey) => void
  onEdit: (key: ApiKey) => void
  onCreate: () => void
}) {
  if (loading) {
    return (
      <div className='space-y-2'>
        <Skeleton className='h-14 w-full' />
        <Skeleton className='h-14 w-full' />
      </div>
    )
  }

  if (!keys || keys.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <KeyRound className='size-6' />
          </EmptyMedia>
          <EmptyTitle>No API keys yet</EmptyTitle>
          <EmptyDescription>
            Create your first API key to start automating workflows.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onCreate} type='button'>
            <Plus className='size-4' />
            Create Key
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <ul className='divide-y rounded-lg border'>
      {keys.map((key) => (
        <KeyRow
          key={key.id}
          onDelete={() => onDelete(key)}
          onEdit={() => onEdit(key)}
          value={key}
        />
      ))}
    </ul>
  )
}

function KeyRow({
  value,
  onDelete,
  onEdit,
}: {
  value: ApiKey
  onDelete: () => void
  onEdit: () => void
}) {
  const permissionCount = countSelected(readPermissions(value.metadata))

  return (
    <li className='flex items-center justify-between gap-3 p-3'>
      <div className='min-w-0 flex-1 space-y-1'>
        <div className='flex items-center gap-2'>
          <span className='truncate font-medium'>
            {value.name ?? 'Untitled key'}
          </span>
          {value.start && (
            <code className='rounded bg-muted px-1.5 py-0.5 font-mono text-xs'>
              {value.start}…
            </code>
          )}
        </div>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs'>
          <span>
            Created{' '}
            {formatDistanceToNow(new Date(value.createdAt), {
              addSuffix: true,
            })}
          </span>
          <span>
            {value.expiresAt
              ? `Expires ${format(new Date(value.expiresAt), 'PP')}`
              : 'Never expires'}
          </span>
          <span className='flex items-center gap-1'>
            <Shield className='size-3' />
            {permissionCount} permission{permissionCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size='icon' type='button' variant='ghost'>
            <MoreVertical className='size-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onEdit()
            }}
          >
            <Pencil className='size-4' />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className='text-destructive focus:text-destructive'
            onSelect={(e) => {
              e.preventDefault()
              onDelete()
            }}
          >
            <Trash2 className='size-4' />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
