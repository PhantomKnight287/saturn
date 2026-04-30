import z from 'zod'

const clientInvolvementToggleSchema = z.enum(['on', 'off'])

const orgClientInvolvementValueSchema = z.object({
  proposals: clientInvolvementToggleSchema,
  requirements: clientInvolvementToggleSchema,
  milestones: clientInvolvementToggleSchema,
  timesheets: clientInvolvementToggleSchema,
  expenses: clientInvolvementToggleSchema,
  invoices: clientInvolvementToggleSchema,
})

export type ClientInvolvementValue = z.infer<
  typeof orgClientInvolvementValueSchema
>

export const updateOrgClientInvolvementSchema = z.object({
  organizationId: z.string().min(1),
  clientInvolvement: orgClientInvolvementValueSchema,
})

export const renameOrganizationSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1, 'Name is required').max(100),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
})

export const timesheetDurationOptions = [
  'weekly',
  'biweekly',
  'monthly',
] as const
export type TimesheetDuration = (typeof timesheetDurationOptions)[number]

export const updateTimesheetDefaultsSchema = z.object({
  organizationId: z.string().min(1),
  defaultMemberRate: z.number().int().min(0, 'Rate must be non-negative'),
  defaultCurrency: z.string().min(3).max(3),
  defaultTimesheetDuration: z.enum(timesheetDurationOptions),
})

export const updateInvoiceNumberTemplateSchema = z.object({
  organizationId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  invoiceNumberTemplate: z
    .string()
    .trim()
    .min(1, 'Template cannot be empty')
    .max(100, 'Template is too long'),
})

export const deleteOrganizationSchema = z.object({
  organizationId: z.string().min(1),
  confirmName: z.string().min(1, 'Please type the workspace name to confirm'),
})
