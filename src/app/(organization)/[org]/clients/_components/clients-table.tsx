'use client'

import { useRouter } from '@bprogress/next/app'
import { FolderPlus, Trash2, X } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  removeClientFromOrgAction,
  removeClientFromProjectAction,
} from '../actions'
import type { OrgClient } from '../types'

export default function ClientsTable({
  clients,
  canManage,
  onAssignProject,
}: {
  clients: OrgClient[]
  canManage: boolean
  orgSlug: string
  onAssignProject: (
    memberId: string,
    clientName: string,
    existingProjectIds: string[]
  ) => void
}) {
  const router = useRouter()

  const { execute: executeRemoveFromProject } = useAction(
    removeClientFromProjectAction,
    {
      onSuccess() {
        toast.success('Client removed from project')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to remove client from project')
      },
    }
  )

  const { execute: executeRemoveFromOrg } = useAction(
    removeClientFromOrgAction,
    {
      onSuccess() {
        toast.success('Client removed from workspace')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to remove client')
      },
    }
  )

  if (clients.length === 0) {
    return null
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Projects</TableHead>
          <TableHead>Added</TableHead>
          {canManage && <TableHead className='w-24' />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.memberId}>
            <TableCell>
              <div className='flex items-center gap-3'>
                <Avatar className='size-8'>
                  <AvatarImage
                    alt={client.userName}
                    src={client.userImage ?? ''}
                  />
                  <AvatarFallback>
                    {client.userName.substring(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className='font-medium text-sm'>{client.userName}</div>
                  <div className='text-muted-foreground text-xs'>
                    {client.userEmail}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              {client.projects.length === 0 ? (
                <span className='text-muted-foreground text-sm'>
                  No projects
                </span>
              ) : (
                <div className='flex flex-wrap gap-1.5'>
                  {client.projects.map((p) => (
                    <Badge
                      className='gap-1 pr-1 text-xs'
                      key={p.assignmentId}
                      variant='secondary'
                    >
                      {p.projectName}
                      {canManage && (
                        <button
                          className='ml-0.5 text-muted-foreground hover:text-foreground'
                          onClick={() =>
                            executeRemoveFromProject({
                              assignmentId: p.assignmentId,
                            })
                          }
                          type='button'
                        >
                          <X className='size-3' />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </TableCell>
            <TableCell>
              <span className='text-muted-foreground text-sm'>
                {new Date(client.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </TableCell>
            {canManage && (
              <TableCell>
                <div className='flex items-center gap-1'>
                  <Button
                    onClick={() =>
                      onAssignProject(
                        client.memberId,
                        client.userName,
                        client.projects.map((p) => p.projectId)
                      )
                    }
                    title='Assign to project'
                    variant='ghost'
                  >
                    <FolderPlus className='size-4 text-muted-foreground' />
                  </Button>
                  <Button
                    onClick={() =>
                      executeRemoveFromOrg({ memberId: client.memberId })
                    }
                    title='Remove from workspace'
                    variant='ghost'
                  >
                    <Trash2 className='size-4 text-muted-foreground' />
                  </Button>
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
