import z from 'zod'
import { updateTimesheetDefaultsSchema as orgTimesheetDefaultsSchema } from '@/app/(organization)/[org]/settings/common'
import { projectStatus } from '@/server/db/schema'

export const clientInvolvementEntities = [
  'proposals',
  'requirements',
  'milestones',
  'timesheets',
  'expenses',
  'invoices',
] as const

export type ClientInvolvementEntity = (typeof clientInvolvementEntities)[number]

export const clientInvolvementToggleSchema = z.enum(['on', 'off'])

export const clientInvolvementValueSchema = z.object({
  proposals: clientInvolvementToggleSchema,
  requirements: clientInvolvementToggleSchema,
  milestones: clientInvolvementToggleSchema,
  timesheets: clientInvolvementToggleSchema,
  expenses: clientInvolvementToggleSchema,
  invoices: clientInvolvementToggleSchema,
})

export type ClientInvolvementValue = z.infer<
  typeof clientInvolvementValueSchema
>

export const defaultClientInvolvement: ClientInvolvementValue = {
  proposals: 'on',
  requirements: 'on',
  milestones: 'on',
  timesheets: 'on',
  expenses: 'on',
  invoices: 'on',
}

export const clientInvolvementEntityLabels: Record<
  ClientInvolvementEntity,
  { label: string; description: string }
> = {
  proposals: {
    label: 'Proposals',
    description: 'Client signs proposals before work begins.',
  },
  requirements: {
    label: 'Requirements',
    description: 'Client approves requirements before they can be built.',
  },
  milestones: {
    label: 'Milestones',
    description: 'Client accepts milestone deliveries.',
  },
  timesheets: {
    label: 'Timesheets',
    description:
      'Client approves timesheet reports before they can be invoiced.',
  },
  expenses: {
    label: 'Expenses',
    description: 'Client approves expenses before they can be invoiced.',
  },
  invoices: {
    label: 'Invoices',
    description:
      'Client receives invoices and marks them paid. If off, you mark invoices paid yourself.',
  },
}

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

export const clientInvolvementProjectSchema = z.object({
  clientInvolvement: clientInvolvementValueSchema,
  projectId: z.string().min(1),
  organizationId: z.string().min(1),
})
