import z from 'zod'

export const createProjectSchema = z.object({
  organizationId: z.string().min(1),
  orgSlug: z.string().min(1),
  name: z.string().min(1, 'Project name is required'),
  dueDate: z.date().optional(),
  description: z.string().optional(),
  invoiceFromName: z.string().max(200).optional(),
  invoiceFromAddress: z.string().max(1000).optional(),
  invoiceToName: z.string().max(200).optional(),
  invoiceToAddress: z.string().max(1000).optional(),
})
