import z from 'zod'
import { updateTimesheetDefaultsSchema as orgTimesheetDefaultsSchema } from '@/app/(organization)/[org]/settings/common'
import { projectStatus } from '@/server/db/schema'

export {
  type TimesheetDuration,
  timesheetDurationOptions,
} from '@/app/(organization)/[org]/settings/common'

export const updateProjectTimesheetDefaultsSchema =
  orgTimesheetDefaultsSchema.extend({
    projectId: z.string().min(1),
  })

export const renameProjectSchema = z.object({
  projectId: z.string().min(1),
  organizationId: z.string().min(1),
  name: z.string().min(1, 'Name is required').max(100),
  dueDate: z.date().optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
})

export const updateProjectStatusSchema = z.object({
  projectId: z.string().min(1),
  organizationId: z.string().min(1),
  status: z.enum(projectStatus.enumValues),
})

export const deleteProjectSchema = z.object({
  projectId: z.string().min(1),
  organizationId: z.string().min(1),
  confirmName: z.string().min(1, 'Please type the project name to confirm'),
})
