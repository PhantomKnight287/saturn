import { useRouter } from '@bprogress/next/app'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { assignClientToProjectAction } from '../actions'
import type { OrgProject } from '../types'

export default function AssignProjectDialog({
  open,
  onOpenChange,
  memberId,
  projects,
  existingProjectIds,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  projects: OrgProject[]
  existingProjectIds: string[]
}) {
  const router = useRouter()
  const [selectedProjectId, setSelectedProjectId] = useState('')

  const availableProjects = projects.filter(
    (p) => !existingProjectIds.includes(p.id)
  )

  const { execute, isPending } = useAction(assignClientToProjectAction, {
    onSuccess() {
      toast.success('Client assigned to project')
      setSelectedProjectId('')
      onOpenChange(false)
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to assign client')
    },
  })

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Assign to Project</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          {availableProjects.length === 0 ? (
            <p className='text-muted-foreground text-sm'>
              This client is already assigned to all projects.
            </p>
          ) : (
            <Select
              onValueChange={setSelectedProjectId}
              value={selectedProjectId}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select a project...' />
              </SelectTrigger>
              <SelectContent>
                {availableProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className='flex justify-end gap-2'>
            <Button onClick={() => onOpenChange(false)} variant='outline'>
              Cancel
            </Button>
            <Button
              disabled={!selectedProjectId}
              loading={isPending}
              onClick={() =>
                execute({ memberId, projectId: selectedProjectId })
              }
            >
              Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
