import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers'
import { getCachedActiveOrgMember } from '@/app/(organization)/[org]/cache'
import { db } from '@/server/db'
import { expenseCategories, expenses, members, users } from '@/server/db/schema'
import { authService } from '../auth/service'

const listByProject = async (projectId: string, headers: ReadonlyHeaders) => {
  const activeMember = await getCachedActiveOrgMember(headers)

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
      status: expenses.status,
      rejectReason: expenses.rejectReason,
      receiptMediaId: expenses.receiptMediaId,
      invoiceId: expenses.invoiceId,
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

  if (activeMember?.role === 'client') {
    return baseQuery
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
  if (activeMember?.role === 'member') {
    return baseQuery
      .where(
        and(
          eq(expenses.projectId, projectId),
          eq(expenses.memberId, activeMember.id)
        )
      )
      .orderBy(desc(expenses.date))
  }
  return baseQuery
    .where(eq(expenses.projectId, projectId))
    .orderBy(desc(expenses.date))
}

const listCategoriesByOrg = async (organizationId: string) => {
  return await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.organizationId, organizationId))
    .orderBy(asc(expenseCategories.sortOrder))
}

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
  const unpaidExpenses = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.projectId, projectId),
        eq(expenses.status, 'client_accepted'),
        isNull(expenses.invoiceId)
      )
    )
    .orderBy(desc(expenses.date))

  return unpaidExpenses
}

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

export const expensesServices = {
  listByProject,
  listByProjectIds,
  listCategoriesByOrg,
  listUnpaidExpensesByProject,
}
