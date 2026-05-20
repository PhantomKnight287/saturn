'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CustomFieldDefinition } from '@/lib/custom-fields'
import type { Requirement, TimeEntry } from '../types'
import { TimeEntryFormBody } from './time-entry-form-body'

interface TimeEntryFormProps {
  customFields?: CustomFieldDefinition[]
  defaultDate?: Date
  defaultDurationMinutes?: number
  editEntry?: TimeEntry
  onOpenChange: (open: boolean) => void
  open: boolean
  projectId: string
  requirements: Requirement[]
}

export function TimeEntryForm({
  open,
  onOpenChange,
  projectId,
  requirements,
  editEntry,
  defaultDate,
  defaultDurationMinutes,
  customFields = [],
}: TimeEntryFormProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{editEntry ? 'Edit' : 'Log'} Time Entry</DialogTitle>
          <DialogDescription>
            {editEntry
              ? 'Update the time entry details.'
              : 'Log time against a project requirement.'}
          </DialogDescription>
        </DialogHeader>
        <TimeEntryFormBody
          customFields={customFields}
          defaultDate={defaultDate}
          defaultDurationMinutes={defaultDurationMinutes}
          editEntry={editEntry}
          onCancel={() => onOpenChange(false)}
          onDone={() => onOpenChange(false)}
          projectId={projectId}
          requirements={requirements}
        />
      </DialogContent>
    </Dialog>
  )
}
