import z from 'zod'

export const createMilestoneSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1, 'Milestone name is required'),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  budgetMinutes: z.number().int().positive().max(2_147_483_647).optional(),
  budgetAmountCents: z.number().int().positive().max(2_147_483_647).optional(),
  currency: z.string().min(1, 'Currency is required'),
})

export const updateMilestoneSchema = z.object({
  milestoneId: z.string().min(1),
  name: z.string().min(1, 'Milestone name is required').optional(),
  description: z.string().optional(),
  dueDate: z.date().nullable().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).optional(),
  blockReason: z.string().optional(),
  budgetMinutes: z
    .number()
    .int()
    .positive()
    .max(2_147_483_647)
    .nullable()
    .optional(),
  budgetAmountCents: z
    .number()
    .int()
    .positive()
    .max(2_147_483_647)
    .nullable()
    .optional(),
  currency: z.string().min(1, 'Currency is required').optional(),
})

export const deleteMilestoneSchema = z.object({
  milestoneId: z.string().min(1),
})

export const completeMilestoneSchema = z.object({
  milestoneId: z.string().min(1),
})

export const reorderMilestonesSchema = z.object({
  projectId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).min(1),
})

export const linkRequirementSchema = z.object({
  milestoneId: z.string().min(1),
  requirementId: z.string().min(1),
})

export const unlinkRequirementSchema = z.object({
  milestoneId: z.string().min(1),
  requirementId: z.string().min(1),
})
