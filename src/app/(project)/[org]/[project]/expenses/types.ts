import type { expensesServices } from '@/app/api/expenses/service'
import type { expenseCategories, expenses } from '@/server/db/schema'
import type { ProjectClient } from '../team/types'

export type ExpenseStatus = typeof expenses.$inferSelect.status

export type ExpenseWithDetails = Awaited<
  ReturnType<typeof expensesServices.listByProject>
>[number]

export type ExpenseCategory = typeof expenseCategories.$inferSelect

export interface ExpensesClientProps {
  allCategories: ExpenseCategory[]
  canApprove: boolean
  canCreate: boolean
  canSubmit: boolean
  categories: ExpenseCategory[]
  clients: ProjectClient[]
  currentMemberId: string
  expenses: ExpenseWithDetails[]
  isAdmin: boolean
  isClient: boolean
  organizationId: string
  orgSlug: string
  projectId: string
  projectName: string
  projectSlug: string
}
