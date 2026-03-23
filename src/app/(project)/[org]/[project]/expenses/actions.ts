'use server'

import { render } from '@react-email/render'
import { eq, inArray } from 'drizzle-orm'
import { authService } from '@/app/api/auth/service'
import { projectsService } from '@/app/api/projects/service'
import ExpenseApprovedEmail from '@/emails/templates/expense-approved'
import ExpenseRejectedEmail from '@/emails/templates/expense-rejected'
import ExpenseSentToClientEmail from '@/emails/templates/expense-sent-to-client'
import ExpenseSubmittedEmail from '@/emails/templates/expense-submitted'
import { getAdminsAndOwners, sendEmailsToRecipients } from '@/lib/notifications'
import { authedActionClient } from '@/lib/safe-action'
import { formatDate } from '@/lib/utils'
import { db } from '@/server/db'
import { expenseCategories, expenses, members, users } from '@/server/db/schema'
import {
  approveExpensesSchema,
  archiveExpenseCategorySchema,
  clientRespondExpensesSchema,
  createExpenseCategorySchema,
  createExpenseSchema,
  deleteExpenseSchema,
  formatCurrency,
  rejectExpensesSchema,
  sendExpensesToClientSchema,
  submitExpensesSchema,
  updateExpenseCategorySchema,
  updateExpenseSchema,
} from './common'

const bulkExpenseColumns = {
  id: expenses.id,
  projectId: expenses.projectId,
  memberId: expenses.memberId,
  amountCents: expenses.amountCents,
  currency: expenses.currency,
  date: expenses.date,
  status: expenses.status,
  categoryId: expenses.categoryId,
  title: expenses.title,
  billable: expenses.billable,
} as const

function assertSameProject(entries: { projectId: string }[]): string {
  const projectIds = new Set(entries.map((e) => e.projectId))
  if (projectIds.size !== 1) {
    throw new Error('All expenses must belong to the same project')
  }
  return entries[0]!.projectId
}

async function batchFetchCategoryNames(
  categoryIds: string[]
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(categoryIds)]
  if (uniqueIds.length === 0) {
    return new Map()
  }
  const categories = await db
    .select({ id: expenseCategories.id, name: expenseCategories.name })
    .from(expenseCategories)
    .where(inArray(expenseCategories.id, uniqueIds))
  return new Map(categories.map((c) => [c.id, c.name]))
}

export const createExpenseAction = authedActionClient
  .inputSchema(createExpenseSchema)
  .action(
    async ({
      parsedInput: {
        projectId,
        description,
        amountCents,
        currency,
        date,
        categoryId,
        milestoneId,
        billable,
        receiptMediaId,
        title,
      },
      ctx: { role, orgMember, user },
    }) => {
      if (!role.authorize({ expense: ['create'] }).success) {
        throw new Error('You do not have permission to create expenses')
      }
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('You do not have access to this project')
      }

      // Admin/owner expenses are auto-approved — they don't need admin approval
      const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'

      const [expense] = await db
        .insert(expenses)
        .values({
          amountCents,
          categoryId,
          currency,
          date: new Date(date),
          memberId: orgMember.id,
          projectId,
          title,
          billable,
          description,
          status: isAdmin ? 'admin_accepted' : 'draft',
          receiptMediaId,
          milestoneId,
        })
        .returning()

      return expense
    }
  )

export const updateExpenseAction = authedActionClient
  .inputSchema(updateExpenseSchema)
  .action(
    async ({
      parsedInput: { expenseId, ...updates },
      ctx: { role, orgMember, user },
    }) => {
      if (!role.authorize({ expense: ['update'] }).success) {
        throw new Error('You do not have permission to update expenses')
      }

      const existing = await db
        .select(bulkExpenseColumns)
        .from(expenses)
        .where(eq(expenses.id, expenseId))
        .then((r) => r.at(0))

      if (!existing) {
        throw new Error('Expense not found')
      }
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        existing.projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('Expense not found')
      }

      const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'
      if (!isAdmin && existing.memberId !== orgMember.id) {
        throw new Error('You can only edit your own expenses')
      }
      if (
        !isAdmin &&
        existing.status !== 'draft' &&
        existing.status !== 'admin_rejected'
      ) {
        throw new Error('Only draft or rejected expenses can be edited')
      }

      const setValues: Partial<typeof expenses.$inferInsert> = {}
      if (updates.title !== undefined) {
        setValues.title = updates.title
      }
      if (updates.amountCents !== undefined) {
        setValues.amountCents = updates.amountCents
      }
      if (updates.currency !== undefined) {
        setValues.currency = updates.currency
      }
      if (updates.date !== undefined) {
        setValues.date = new Date(updates.date)
      }
      if (updates.categoryId !== undefined) {
        setValues.categoryId = updates.categoryId
      }
      if (updates.milestoneId !== undefined) {
        setValues.milestoneId = updates.milestoneId
      }
      if (updates.billable !== undefined) {
        setValues.billable = updates.billable
      }
      if (updates.description !== undefined) {
        setValues.description = updates.description
      }
      if (updates.receiptMediaId !== undefined) {
        setValues.receiptMediaId = updates.receiptMediaId
      }

      // Reset rejected expenses when edited
      if (existing.status === 'admin_rejected' && !isAdmin) {
        setValues.status = 'draft'
        setValues.rejectReason = null
      }
      if (existing.status === 'client_rejected' && isAdmin) {
        setValues.status = 'admin_accepted'
        setValues.rejectReason = null
      }

      const [updated] = await db
        .update(expenses)
        .set(setValues)
        .where(eq(expenses.id, expenseId))
        .returning()

      return updated
    }
  )

export const deleteExpenseAction = authedActionClient
  .inputSchema(deleteExpenseSchema)
  .action(
    async ({ parsedInput: { expenseId }, ctx: { role, orgMember, user } }) => {
      if (!role.authorize({ expense: ['delete'] }).success) {
        throw new Error('You do not have permission to delete expenses')
      }

      const existing = await db
        .select(bulkExpenseColumns)
        .from(expenses)
        .where(eq(expenses.id, expenseId))
        .then((r) => r.at(0))

      if (!existing) {
        throw new Error('Expense not found')
      }
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        existing.projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('Expense not found')
      }

      const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'
      if (!isAdmin && existing.memberId !== orgMember.id) {
        throw new Error('You can only delete your own expenses')
      }
      if (!isAdmin && existing.status !== 'draft') {
        throw new Error('Only draft expenses can be deleted')
      }

      await db.delete(expenses).where(eq(expenses.id, expenseId))

      return { success: true }
    }
  )

export const submitExpensesAction = authedActionClient
  .inputSchema(submitExpensesSchema)
  .action(
    async ({ parsedInput: { expenseIds }, ctx: { role, orgMember, user } }) => {
      if (!role.authorize({ expense: ['submit'] }).success) {
        throw new Error('You do not have permission to submit expenses')
      }

      const entries = await db
        .select(bulkExpenseColumns)
        .from(expenses)
        .where(inArray(expenses.id, expenseIds))

      if (entries.length === 0) {
        throw new Error('No expenses found')
      }
      const projectId = assertSameProject(entries)
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('No expenses found')
      }

      for (const entry of entries) {
        if (entry.memberId !== orgMember.id) {
          throw new Error('You can only submit your own expenses')
        }
        if (entry.status !== 'draft' && entry.status !== 'admin_rejected') {
          throw new Error('Only draft or rejected expenses can be submitted')
        }
      }

      await db
        .update(expenses)
        .set({ status: 'submitted_to_admin', rejectReason: null })
        .where(inArray(expenses.id, expenseIds))

      // Notify admins/owners
      const details = await projectsService.getProjectDetails(projectId)
      const adminsAndOwners = await getAdminsAndOwners(orgMember.organizationId)

      const categoryMap = await batchFetchCategoryNames(
        entries.map((e) => e.categoryId)
      )

      const totalCents = entries.reduce((sum, e) => sum + e.amountCents, 0)
      const currency = entries.at(0)?.currency ?? 'USD'
      const formattedAmount = formatCurrency(totalCents, currency)

      const firstEntry = entries[0]
      const category =
        categoryMap.get(firstEntry!.categoryId) ?? 'Uncategorized'
      const desc =
        entries.length === 1
          ? firstEntry!.title
          : `${entries.length} expenses submitted`

      await sendEmailsToRecipients(adminsAndOwners, async (recipient) => {
        const html = await render(
          ExpenseSubmittedEmail({
            recipientName: recipient.name ?? 'there',
            memberName: user.name ?? 'there',
            projectName: details.projectName,
            title: desc,
            amount: formattedAmount,
            category,
            expenseDate: formatDate(firstEntry!.date),
            billable: firstEntry!.billable,
            orgSlug: details.orgSlug ?? '',
            projectSlug: details.projectSlug,
          })
        )
        return {
          to: recipient.email,
          subject: `Expense submitted — ${user.name ?? 'A member'} (${formattedAmount})`,
          html,
        }
      })

      return { success: true }
    }
  )

export const approveExpensesAction = authedActionClient
  .inputSchema(approveExpensesSchema)
  .action(
    async ({ parsedInput: { expenseIds }, ctx: { role, user, orgMember } }) => {
      if (!role.authorize({ expense: ['approve'] }).success) {
        throw new Error('You do not have permission to approve expenses')
      }

      const entries = await db
        .select(bulkExpenseColumns)
        .from(expenses)
        .where(inArray(expenses.id, expenseIds))

      if (entries.length === 0) {
        throw new Error('No expenses found')
      }
      const projectId = assertSameProject(entries)
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('No expenses found')
      }

      for (const entry of entries) {
        if (entry.status !== 'submitted_to_admin') {
          throw new Error('Only submitted expenses can be approved')
        }
      }

      await db
        .update(expenses)
        .set({ status: 'admin_accepted' })
        .where(inArray(expenses.id, expenseIds))

      // Notify each submitter
      const details = await projectsService.getProjectDetails(projectId)
      const categoryMap = await batchFetchCategoryNames(
        entries.map((e) => e.categoryId)
      )

      const memberIds = [...new Set(entries.map((e) => e.memberId))]
      for (const memberId of memberIds) {
        const memberExpenses = entries.filter((e) => e.memberId === memberId)
        const totalCents = memberExpenses.reduce(
          (sum, e) => sum + e.amountCents,
          0
        )
        const currency = memberExpenses.at(0)?.currency ?? 'USD'

        const [member] = await db
          .select({ email: users.email, name: users.name })
          .from(members)
          .innerJoin(users, eq(members.userId, users.id))
          .where(eq(members.id, memberId))

        if (member) {
          const firstEntry = memberExpenses[0]
          const category =
            categoryMap.get(firstEntry!.categoryId) ?? 'Uncategorized'
          const formattedAmount = formatCurrency(totalCents, currency)

          await sendEmailsToRecipients([member], async (recipient) => {
            const html = await render(
              ExpenseApprovedEmail({
                recipientName: recipient.name ?? 'there',
                approverName: user.name ?? 'there',
                projectName: details.projectName,
                title:
                  memberExpenses.length === 1
                    ? firstEntry!.title
                    : `${memberExpenses.length} expenses`,
                amount: formattedAmount,
                category,
                expenseDate: formatDate(firstEntry!.date),
                billable: firstEntry!.billable,
                orgSlug: details.orgSlug ?? '',
                projectSlug: details.projectSlug,
              })
            )
            return {
              to: recipient.email,
              subject: `Expense approved — ${formattedAmount}`,
              html,
            }
          })
        }
      }

      return { success: true }
    }
  )

export const rejectExpensesAction = authedActionClient
  .inputSchema(rejectExpensesSchema)
  .action(
    async ({
      parsedInput: { expenseIds, reason },
      ctx: { role, user, orgMember },
    }) => {
      if (!role.authorize({ expense: ['reject'] }).success) {
        throw new Error('You do not have permission to reject expenses')
      }

      const entries = await db
        .select(bulkExpenseColumns)
        .from(expenses)
        .where(inArray(expenses.id, expenseIds))

      if (entries.length === 0) {
        throw new Error('No expenses found')
      }
      const projectId = assertSameProject(entries)
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('No expenses found')
      }

      for (const entry of entries) {
        if (entry.status !== 'submitted_to_admin') {
          throw new Error('Only submitted expenses can be rejected')
        }
      }

      await db
        .update(expenses)
        .set({ status: 'admin_rejected', rejectReason: reason })
        .where(inArray(expenses.id, expenseIds))

      // Notify each submitter
      const details = await projectsService.getProjectDetails(projectId)
      const categoryMap = await batchFetchCategoryNames(
        entries.map((e) => e.categoryId)
      )

      const memberIds = [...new Set(entries.map((e) => e.memberId))]
      for (const memberId of memberIds) {
        const memberExpenses = entries.filter((e) => e.memberId === memberId)
        const totalCents = memberExpenses.reduce(
          (sum, e) => sum + e.amountCents,
          0
        )
        const currency = memberExpenses.at(0)?.currency ?? 'USD'

        const [member] = await db
          .select({ email: users.email, name: users.name })
          .from(members)
          .innerJoin(users, eq(members.userId, users.id))
          .where(eq(members.id, memberId))

        if (member) {
          const firstEntry = memberExpenses[0]
          const category =
            categoryMap.get(firstEntry!.categoryId) ?? 'Uncategorized'
          const formattedAmount = formatCurrency(totalCents, currency)

          await sendEmailsToRecipients([member], async (recipient) => {
            const html = await render(
              ExpenseRejectedEmail({
                recipientName: recipient.name ?? 'there',
                rejectorName: user.name ?? 'there',
                projectName: details.projectName,
                title:
                  memberExpenses.length === 1
                    ? firstEntry!.title
                    : `${memberExpenses.length} expenses`,
                amount: formattedAmount,
                category,
                expenseDate: formatDate(firstEntry!.date),
                reason,
                orgSlug: details.orgSlug ?? '',
                projectSlug: details.projectSlug,
              })
            )
            return {
              to: recipient.email,
              subject: 'Expense rejected — changes requested',
              html,
            }
          })
        }
      }

      return { success: true }
    }
  )

export const sendExpensesToClientAction = authedActionClient
  .inputSchema(sendExpensesToClientSchema)
  .action(
    async ({
      parsedInput: { expenseIds, clientMemberIds },
      ctx: { role, user, orgMember },
    }) => {
      if (!role.authorize({ expense: ['approve'] }).success) {
        throw new Error('You do not have permission to send expenses to client')
      }

      const entries = await db
        .select(bulkExpenseColumns)
        .from(expenses)
        .where(inArray(expenses.id, expenseIds))

      if (entries.length === 0) {
        throw new Error('No expenses found')
      }
      const projectId = assertSameProject(entries)
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('No expenses found')
      }

      for (const entry of entries) {
        if (
          entry.status !== 'admin_accepted' &&
          entry.status !== 'client_rejected'
        ) {
          throw new Error(
            'Only admin-approved or client-rejected expenses can be sent to client'
          )
        }
      }

      await db
        .update(expenses)
        .set({ status: 'submitted_to_client', rejectReason: null })
        .where(inArray(expenses.id, expenseIds))

      const selectedClients = await db
        .select({
          memberId: members.id,
          userId: members.userId,
          email: users.email,
          name: users.name,
        })
        .from(members)
        .innerJoin(users, eq(members.userId, users.id))
        .where(inArray(members.id, clientMemberIds))

      if (selectedClients.length === 0) {
        throw new Error('Selected client not found')
      }

      for (const client of selectedClients) {
        const clientHasProjectAccess = await authService.checkProjectAccess(
          orgMember.organizationId,
          projectId,
          client.userId
        )
        if (!clientHasProjectAccess.success) {
          throw new Error(
            'Selected client does not have access to this project'
          )
        }
      }

      const uniqueRecipients = [
        ...new Map(selectedClients.map((c) => [c.email, c])).values(),
      ]

      const details = await projectsService.getProjectDetails(projectId)
      const totalCents = entries.reduce((sum, e) => sum + e.amountCents, 0)
      const currency = entries.at(0)?.currency ?? 'USD'
      const totalAmount = formatCurrency(totalCents, currency)

      await sendEmailsToRecipients(uniqueRecipients, async (recipient) => {
        const html = await render(
          ExpenseSentToClientEmail({
            recipientName: recipient.name ?? 'there',
            senderName: user.name ?? 'there',
            projectName: details.projectName,
            expenseCount: entries.length,
            totalAmount,
            currency,
            orgSlug: details.orgSlug ?? '',
            projectSlug: details.projectSlug,
          })
        )
        return {
          to: recipient.email,
          subject: `Expenses for review — ${totalAmount}`,
          html,
        }
      })

      return { success: true }
    }
  )

export const clientRespondExpensesAction = authedActionClient
  .inputSchema(clientRespondExpensesSchema)
  .action(
    async ({
      parsedInput: { expenseIds, action, reason },
      ctx: { role, user, orgMember },
    }) => {
      const permission =
        action === 'approve' ? ('approve' as const) : ('reject' as const)
      if (!role.authorize({ expense: [permission] }).success) {
        throw new Error(`You do not have permission to ${action} expenses`)
      }

      const entries = await db
        .select(bulkExpenseColumns)
        .from(expenses)
        .where(inArray(expenses.id, expenseIds))

      if (entries.length === 0) {
        throw new Error('No expenses found')
      }
      const projectId = assertSameProject(entries)
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('No expenses found')
      }

      for (const entry of entries) {
        if (entry.status !== 'submitted_to_client') {
          throw new Error('Only sent expenses can be responded to')
        }
      }

      const newStatus =
        action === 'approve' ? 'client_accepted' : 'client_rejected'

      await db
        .update(expenses)
        .set({
          status: newStatus,
          rejectReason: action === 'reject' ? (reason ?? null) : null,
        })
        .where(inArray(expenses.id, expenseIds))

      return { success: true }
    }
  )

export const createExpenseCategoryAction = authedActionClient
  .inputSchema(createExpenseCategorySchema)
  .action(
    async ({
      parsedInput: { organizationId, name, color },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ expense_category: ['create'] }).success) {
        throw new Error(
          'You do not have permission to manage expense categories'
        )
      }
      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      const [category] = await db
        .insert(expenseCategories)
        .values({
          organizationId,
          name,
          color: color || null,
        })
        .returning()

      return category
    }
  )

export const updateExpenseCategoryAction = authedActionClient
  .inputSchema(updateExpenseCategorySchema)
  .action(
    async ({
      parsedInput: { categoryId, ...updates },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ expense_category: ['update'] }).success) {
        throw new Error(
          'You do not have permission to manage expense categories'
        )
      }

      const [cat] = await db
        .select({ organizationId: expenseCategories.organizationId })
        .from(expenseCategories)
        .where(eq(expenseCategories.id, categoryId))
      if (!cat) {
        throw new Error('Category not found')
      }
      if (cat.organizationId !== orgMember.organizationId) {
        throw new Error('Category not found')
      }

      const setValues: Partial<typeof expenseCategories.$inferInsert> = {}
      if (updates.name !== undefined) {
        setValues.name = updates.name
      }
      if (updates.color !== undefined) {
        setValues.color = updates.color
      }

      const [updated] = await db
        .update(expenseCategories)
        .set(setValues)
        .where(eq(expenseCategories.id, categoryId))
        .returning()

      return updated
    }
  )

export const archiveExpenseCategoryAction = authedActionClient
  .inputSchema(archiveExpenseCategorySchema)
  .action(async ({ parsedInput: { categoryId }, ctx: { role, orgMember } }) => {
    if (!role.authorize({ expense_category: ['delete'] }).success) {
      throw new Error('You do not have permission to manage expense categories')
    }

    const existing = await db
      .select({
        id: expenseCategories.id,
        organizationId: expenseCategories.organizationId,
        isArchived: expenseCategories.isArchived,
      })
      .from(expenseCategories)
      .where(eq(expenseCategories.id, categoryId))
      .then((r) => r.at(0))

    if (!existing) {
      throw new Error('Category not found')
    }
    if (existing.organizationId !== orgMember.organizationId) {
      throw new Error('Category not found')
    }

    await db
      .update(expenseCategories)
      .set({ isArchived: !existing.isArchived })
      .where(eq(expenseCategories.id, categoryId))

    return { success: true }
  })
