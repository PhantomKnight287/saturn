import { and, asc, desc, eq, inArray, isNull, or } from 'drizzle-orm'
import { db } from '@/server/db'
import {
  expenseCategories,
  expenseRecipients,
  expenses,
  invoiceExpenses,
  media,
  members,
  users,
} from '@/server/db/schema'
import type { Role } from '@/types'
import { authService } from '../auth/service'

const listByProject = async ({
  memberId,
  projectId,
  role,
}: {
  role: Role
  memberId: string
  projectId: string
}) => {
  const baseQuery = db
    .select({
      id: expenses.id,
      projectId: expenses.projectId,
      memberId: expenses.memberId,
      categoryId: expenses.categoryId,
      milestoneId: expenses.milestoneId,
      description: expenses.description,
      title: expenses.title,
      amountCents: expenses.amountCents,
      currency: expenses.currency,
      date: expenses.date,
      billable: expenses.billable,
      recurring: expenses.recurring,
      status: expenses.status,
      rejectReason: expenses.rejectReason,
      receiptMediaId: expenses.receiptMediaId,
      receiptContentType: media.contentType,
      createdAt: expenses.createdAt,
      updatedAt: expenses.updatedAt,
      memberName: users.name,
      memberEmail: users.email,
      categoryName: expenseCategories.name,
      categoryColor: expenseCategories.color,
    })
    .from(expenses)
    .leftJoin(members, eq(expenses.memberId, members.id))
    .leftJoin(users, eq(members.userId, users.id))
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .leftJoin(media, eq(expenses.receiptMediaId, media.id))

  if (role === 'client') {
    return await baseQuery
      .innerJoin(
        expenseRecipients,
        and(
          eq(expenses.id, expenseRecipients.expenseId),
          eq(expenseRecipients.clientMemberId, memberId)
        )
      )
      .where(
        and(
          eq(expenses.projectId, projectId),
          inArray(expenses.status, [
            'client_accepted',
            'client_rejected',
            'submitted_to_client',
          ])
        )
      )
      .orderBy(desc(expenses.date))
  }
  if (role === 'member') {
    return await baseQuery
      .where(
        and(eq(expenses.projectId, projectId), eq(expenses.memberId, memberId))
      )
      .orderBy(desc(expenses.date))
  }
  return await baseQuery
    .where(eq(expenses.projectId, projectId))
    .orderBy(desc(expenses.date))
}

const listCategoriesByOrg = async (organizationId: string) =>
  await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.organizationId, organizationId))
    .orderBy(asc(expenseCategories.sortOrder))

const listUnpaidExpensesByProject = async (
  organizationId: string,
  projectId: string,
  currentUserId: string
) => {
  const auth = await authService.checkProjectAccess(
    organizationId,
    projectId,
    currentUserId
  )
  if (!auth.success) {
    return []
  }
  const rows = await db
    .selectDistinctOn([expenses.id], { expense: expenses })
    .from(expenses)
    .leftJoin(invoiceExpenses, eq(invoiceExpenses.expenseId, expenses.id))
    .where(
      and(
        eq(expenses.projectId, projectId),
        eq(expenses.status, 'client_accepted'),
        or(isNull(invoiceExpenses.id), eq(expenses.recurring, true))
      )
    )

  return rows.map((r) => r.expense).sort((a, b) => b.date.localeCompare(a.date))
}

const listExpensesByInvoiceId = async (invoiceId: string) =>
  await db
    .select({ expense: expenses })
    .from(invoiceExpenses)
    .innerJoin(expenses, eq(invoiceExpenses.expenseId, expenses.id))
    .where(eq(invoiceExpenses.invoiceId, invoiceId))
    .then((rows) => rows.map((r) => r.expense))

const listByProjectIds = async (projectIds: string[]) => {
  if (projectIds.length === 0) {
    return []
  }

  return await db
    .select()
    .from(expenses)
    .where(inArray(expenses.projectId, projectIds))
    .orderBy(desc(expenses.date))
}

const getRecipientsByExpenseIds = async (expenseIds: string[]) => {
  if (expenseIds.length === 0) {
    return []
  }
  return await db
    .select({
      id: expenseRecipients.id,
      expenseId: expenseRecipients.expenseId,
      clientMemberId: expenseRecipients.clientMemberId,
      status: expenseRecipients.status,
      rejectReason: expenseRecipients.rejectReason,
      respondedAt: expenseRecipients.respondedAt,
      clientName: users.name,
      clientEmail: users.email,
    })
    .from(expenseRecipients)
    .innerJoin(members, eq(expenseRecipients.clientMemberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .where(inArray(expenseRecipients.expenseId, expenseIds))
}

export const expensesServices = {
  getRecipientsByExpenseIds,
  listByProject,
  listByProjectIds,
  listCategoriesByOrg,
  listExpensesByInvoiceId,
  listUnpaidExpensesByProject,
}
