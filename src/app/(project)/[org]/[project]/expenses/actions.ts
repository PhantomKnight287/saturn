'use server'

import { expensesServices } from '@/app/api/expenses/service'
import {
  orgScopedActionClient,
  projectScopedActionClient,
} from '@/lib/safe-action'
import {
  approveExpensesSchema,
  archiveExpenseCategorySchema,
  clientRespondExpensesSchema,
  createExpenseCategorySchema,
  createExpenseSchema,
  deleteExpenseSchema,
  rejectExpensesSchema,
  sendExpensesToClientSchema,
  submitExpensesSchema,
  updateExpenseCategorySchema,
  updateExpenseSchema,
} from './common'

export const createExpenseAction = projectScopedActionClient
  .metadata({ authorize: { expense: ['create'] } })
  .inputSchema(createExpenseSchema)
  .action(({ parsedInput, ctx: { orgMember, project } }) =>
    expensesServices.create({
      project,
      orgMember,
      title: parsedInput.title,
      amountCents: parsedInput.amountCents,
      currency: parsedInput.currency,
      date: parsedInput.date,
      categoryId: parsedInput.categoryId,
      milestoneId: parsedInput.milestoneId,
      billable: parsedInput.billable,
      recurring: parsedInput.recurring,
      description: parsedInput.description,
      receiptMediaId: parsedInput.receiptMediaId,
    })
  )

export const updateExpenseAction = orgScopedActionClient
  .metadata({ authorize: { expense: ['update'] } })
  .inputSchema(updateExpenseSchema)
  .action(({ parsedInput: { expenseId, ...updates }, ctx: { orgMember } }) =>
    expensesServices.update({ expenseId, orgMember, updates })
  )

export const deleteExpenseAction = orgScopedActionClient
  .metadata({ authorize: { expense: ['delete'] } })
  .inputSchema(deleteExpenseSchema)
  .action(({ parsedInput: { expenseId }, ctx: { orgMember } }) =>
    expensesServices.remove({ expenseId, orgMember })
  )

export const submitExpensesAction = orgScopedActionClient
  .metadata({ authorize: { expense: ['submit'] } })
  .inputSchema(submitExpensesSchema)
  .action(({ parsedInput: { expenseIds }, ctx: { orgMember } }) =>
    expensesServices.submit({ expenseIds, orgMember })
  )

export const approveExpensesAction = orgScopedActionClient
  .metadata({ authorize: { expense: ['approve'] } })
  .inputSchema(approveExpensesSchema)
  .action(({ parsedInput: { expenseIds }, ctx: { orgMember } }) =>
    expensesServices.approve({ expenseIds, orgMember })
  )

export const rejectExpensesAction = orgScopedActionClient
  .metadata({ authorize: { expense: ['reject'] } })
  .inputSchema(rejectExpensesSchema)
  .action(({ parsedInput: { expenseIds, reason }, ctx: { orgMember } }) =>
    expensesServices.reject({ expenseIds, reason, orgMember })
  )

export const sendExpensesToClientAction = orgScopedActionClient
  .metadata({ authorize: { expense: ['approve'] } })
  .inputSchema(sendExpensesToClientSchema)
  .action(
    ({ parsedInput: { expenseIds, clientMemberIds }, ctx: { orgMember } }) =>
      expensesServices.sendToClient({ expenseIds, clientMemberIds, orgMember })
  )

export const clientRespondExpensesAction = orgScopedActionClient
  .metadata({})
  .inputSchema(clientRespondExpensesSchema)
  .action(
    ({
      parsedInput: { expenseIds, action, reason },
      ctx: { role, orgMember },
    }) => {
      const permission = action === 'approve' ? 'approve' : 'reject'
      if (!role.authorize({ expense: [permission] }).success) {
        throw new Error(`You do not have permission to ${action} expenses`)
      }
      return expensesServices.clientRespond({
        expenseIds,
        action,
        reason,
        orgMember,
      })
    }
  )

export const createExpenseCategoryAction = orgScopedActionClient
  .metadata({ authorize: { expense_category: ['create'] } })
  .inputSchema(createExpenseCategorySchema)
  .action(({ parsedInput: { name, color }, ctx: { orgMember } }) =>
    expensesServices.createCategory({
      organizationId: orgMember.organizationId,
      name,
      color,
    })
  )

export const updateExpenseCategoryAction = orgScopedActionClient
  .metadata({ authorize: { expense_category: ['update'] } })
  .inputSchema(updateExpenseCategorySchema)
  .action(({ parsedInput: { categoryId, name, color }, ctx: { orgMember } }) =>
    expensesServices.updateCategory({
      categoryId,
      organizationId: orgMember.organizationId,
      name,
      color,
    })
  )

export const archiveExpenseCategoryAction = orgScopedActionClient
  .metadata({ authorize: { expense_category: ['delete'] } })
  .inputSchema(archiveExpenseCategorySchema)
  .action(({ parsedInput: { categoryId }, ctx: { orgMember } }) =>
    expensesServices.archiveCategory({
      categoryId,
      organizationId: orgMember.organizationId,
    })
  )
