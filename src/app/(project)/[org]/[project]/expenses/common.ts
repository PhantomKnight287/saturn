import z from 'zod'

export const createExpenseSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1, 'Title is required'),
  amountCents: z.number().int().min(1, 'Amount is required'),
  currency: z.string().min(1).default('USD'),
  date: z.string().min(1, 'Date is required'),
  categoryId: z.string().min(1, 'Category is required'),
  milestoneId: z.string().optional(),
  billable: z.boolean().default(true),
  description: z.string().optional(),
  receiptMediaId: z.string().optional(),
})

export const updateExpenseSchema = z.object({
  expenseId: z.string().min(1),
  title: z.string().min(1).optional(),
  amountCents: z.number().int().min(1).optional(),
  currency: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  milestoneId: z.string().nullable().optional(),
  billable: z.boolean().optional(),
  description: z.string().nullable().optional(),
  receiptMediaId: z.string().nullable().optional(),
})

export const deleteExpenseSchema = z.object({
  expenseId: z.string().min(1),
})

export const submitExpensesSchema = z.object({
  expenseIds: z.array(z.string().min(1)).min(1, 'Select at least one expense'),
})

export const approveExpensesSchema = z.object({
  expenseIds: z.array(z.string().min(1)).min(1),
})

export const rejectExpensesSchema = z.object({
  expenseIds: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1, 'Reason is required'),
})

export const sendExpensesToClientSchema = z.object({
  expenseIds: z.array(z.string().min(1)).min(1),
  clientMemberIds: z.array(z.string().min(1)).min(1, 'Select a client'),
})

export const clientRespondExpensesSchema = z.object({
  expenseIds: z.array(z.string().min(1)).min(1),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
})

export const createExpenseCategorySchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1, 'Name is required'),
  color: z.string().optional(),
})

export const updateExpenseCategorySchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
})

export const archiveExpenseCategorySchema = z.object({
  categoryId: z.string().min(1),
})

export function formatCurrency(amountCents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amountCents / 100)
}
