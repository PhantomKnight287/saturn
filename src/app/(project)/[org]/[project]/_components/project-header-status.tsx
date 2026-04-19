'use client'

import { useRouter } from '@bprogress/next/app'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { AlertTriangleIcon, CalendarIcon, ChevronDown } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  PROJECT_STATUS_VARIANTS,
  type ProjectStatusValue,
} from '@/app/(organization)/[org]/projects/_components/project-status-badge'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { projectStatus } from '@/server/db/schema'
import { updateProjectStatusAction } from '../settings/actions'

const DUE_DATE_HIDDEN_STATUSES: ReadonlySet<ProjectStatusValue> = new Set([
  'completed',
  'archived',
])

export function ProjectHeaderStatus({
  projectId,
  organizationId,
  status,
  dueDate,
  canEdit,
}: {
  projectId: string
  organizationId: string
  status: ProjectStatusValue
  dueDate: Date | null
  canEdit: boolean
}) {
  const router = useRouter()
  const [optimisticStatus, setOptimisticStatus] = useState(status)

  const { execute, isPending } = useAction(updateProjectStatusAction, {
    onSuccess() {
      toast.success('Project status updated')
      router.refresh()
    },
    onError({ error }) {
      setOptimisticStatus(status)
      toast.error(error.serverError ?? 'Failed to update project status')
    },
  })

  const variant = PROJECT_STATUS_VARIANTS[optimisticStatus]
  const showDueDate = dueDate && !DUE_DATE_HIDDEN_STATUSES.has(optimisticStatus)
  const overdue = showDueDate && isPast(dueDate)

  return (
    <div className='inline-flex items-center'>
      {showDueDate && (
        <div
          className={cn(
            'inline-flex h-6 items-center gap-1.5 rounded-md rounded-r-none border border-r-0 px-2 font-medium text-xs',
            overdue
              ? 'border-destructive/20 bg-destructive/10 text-destructive'
              : 'border-border bg-muted text-muted-foreground'
          )}
        >
          {overdue ? (
            <AlertTriangleIcon className='size-3' />
          ) : (
            <CalendarIcon className='size-3' />
          )}
          {overdue
            ? `Overdue by ${formatDistanceToNow(dueDate)}`
            : `Due ${format(dueDate, 'MMM d, yyyy')}`}
        </div>
      )}
      {canEdit ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'inline-flex h-6 items-center gap-1 rounded-md border px-2 font-medium text-xs transition-colors hover:brightness-110 disabled:opacity-60',
              {
                'rounded-l-none': showDueDate,
              },
              variant.className
            )}
            disabled={isPending}
          >
            {variant.label}
            <ChevronDown className='size-3' />
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {projectStatus.enumValues.map((value) => (
              <DropdownMenuCheckboxItem
                checked={optimisticStatus === value}
                key={value}
                onSelect={(e) => {
                  e.preventDefault()
                  if (value === optimisticStatus) {
                    return
                  }
                  setOptimisticStatus(value)
                  execute({ projectId, organizationId, status: value })
                }}
              >
                {PROJECT_STATUS_VARIANTS[value].label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div
          className={cn(
            'inline-flex h-6 items-center rounded-md border px-2 font-medium text-xs',
            showDueDate && 'rounded-l-none',
            variant.className
          )}
        >
          {variant.label}
        </div>
      )}
    </div>
  )
}
