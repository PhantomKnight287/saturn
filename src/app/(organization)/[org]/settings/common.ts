import z from 'zod'

export const renameOrganizationSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1, 'Name is required').max(100),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must be lowercase alphanumeric with hyphens'
    ),
})

export const updateTimesheetDefaultsSchema = z.object({
  organizationId: z.string().min(1),
  defaultMemberRate: z.number().int().min(0, 'Rate must be non-negative'),
  defaultCurrency: z.string().min(3).max(3),
})

export const deleteOrganizationSchema = z.object({
  organizationId: z.string().min(1),
  confirmName: z.string().min(1, 'Please type the workspace name to confirm'),
})
