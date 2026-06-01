import { render } from '@react-email/render'
import { and, asc, desc, eq, inArray, isNull, or } from 'drizzle-orm'
import ExpenseApprovedEmail from '@/emails/templates/expense-approved'
import ExpenseRejectedEmail from '@/emails/templates/expense-rejected'
import ExpenseSentToClientEmail from '@/emails/templates/expense-sent-to-client'
import ExpenseSubmittedEmail from '@/emails/templates/expense-submitted'
import { getAdminsAndOwners, sendEmailsToRecipients } from '@/lib/notifications'
import { formatDateOnly } from '@/lib/utils'
import {
  type ActiveMember,
  type Project,
  projectAccess,
} from '@/server/access/project-access'
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
import { projectsService } from '../projects/service'

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

type ExpenseInsert = typeof expenses.$inferInsert
type ExpenseWritable = Pick<
  ExpenseInsert,
  | 'title'
  | 'amountCents'
  | 'currency'
  | 'date'
  | 'categoryId'
  | 'milestoneId'
  | 'billable'
  | 'recurring'
  | 'description'
  | 'receiptMediaId'
>

const create = async ({
  project,
  orgMember,
  title,
  amountCents,
  currency,
  date,
  categoryId,
  milestoneId,
  billable,
  recurring,
  description,
  receiptMediaId,
}: { project: Project; orgMember: ActiveMember } & ExpenseWritable) => {
  // Admin/owner expenses are auto-approved — they don't need admin approval
  const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'
  const settings = await projectsService.getSettings(
    project.organizationId,
    project.id
  )
  const clientOff = settings.clientInvolvement.expenses === 'off'

  const [expense] = await db
    .insert(expenses)
    .values({
      amountCents,
      categoryId,
      currency,
      date,
      memberId: orgMember.id,
      projectId: project.id,
      title,
      billable,
      recurring,
      description,
      status: isAdmin
        ? clientOff
          ? 'client_accepted'
          : 'admin_accepted'
        : 'draft',
      receiptMediaId,
      milestoneId,
    })
    .returning()

  return expense
}

const update = async ({
  expenseId,
  orgMember,
  updates,
}: {
  expenseId: string
  orgMember: ActiveMember
  updates: Partial<ExpenseWritable>
}) => {
  const existing = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .then((r) => r.at(0))

  if (!existing) {
    throw new Error('Expense not found')
  }
  await projectAccess.assert(existing.projectId, orgMember, 'Expense not found')

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
    setValues.date = updates.date
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
  if (updates.recurring !== undefined) {
    setValues.recurring = updates.recurring
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

const remove = async ({
  expenseId,
  orgMember,
}: {
  expenseId: string
  orgMember: ActiveMember
}) => {
  const existing = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .then((r) => r.at(0))

  if (!existing) {
    throw new Error('Expense not found')
  }
  await projectAccess.assert(existing.projectId, orgMember, 'Expense not found')

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

const submit = async ({
  expenseIds,
  orgMember,
}: {
  expenseIds: string[]
  orgMember: ActiveMember
}) => {
  const entries = await db
    .select()
    .from(expenses)
    .where(inArray(expenses.id, expenseIds))
  if (entries.length === 0) {
    throw new Error('No expenses found')
  }
  if (new Set(entries.map((e) => e.projectId)).size !== 1) {
    throw new Error('All expenses must belong to the same project')
  }
  const projectId = entries[0]!.projectId
  await projectAccess.assert(projectId, orgMember, 'No expenses found')

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

  const details = await projectsService.getProjectDetails(projectId)
  const adminsAndOwners = await getAdminsAndOwners(orgMember.organizationId)
  const categoryIds = [...new Set(entries.map((e) => e.categoryId))]
  const categories = categoryIds.length
    ? await db
        .select({ id: expenseCategories.id, name: expenseCategories.name })
        .from(expenseCategories)
        .where(inArray(expenseCategories.id, categoryIds))
    : []
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  const totalCents = entries.reduce((sum, e) => sum + e.amountCents, 0)
  const currency = entries.at(0)?.currency ?? 'USD'
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(totalCents / 100)

  const firstEntry = entries[0]
  const category = categoryMap.get(firstEntry!.categoryId) ?? 'Uncategorized'
  const desc =
    entries.length === 1
      ? firstEntry!.title
      : `${entries.length} expenses submitted`

  await sendEmailsToRecipients(adminsAndOwners, async (recipient) => {
    const html = await render(
      ExpenseSubmittedEmail({
        recipientName: recipient.name ?? 'there',
        memberName: orgMember.user.name ?? 'there',
        projectName: details.projectName,
        title: desc,
        amount: formattedAmount,
        category,
        expenseDate: formatDateOnly(firstEntry!.date),
        billable: firstEntry!.billable,
        orgSlug: details.orgSlug ?? '',
        projectSlug: details.projectSlug,
      })
    )
    return {
      to: recipient.email,
      subject: `Expense submitted — ${orgMember.user.name ?? 'A member'} (${formattedAmount})`,
      html,
    }
  })

  return { success: true }
}

const approve = async ({
  expenseIds,
  orgMember,
}: {
  expenseIds: string[]
  orgMember: ActiveMember
}) => {
  const entries = await db
    .select()
    .from(expenses)
    .where(inArray(expenses.id, expenseIds))
  if (entries.length === 0) {
    throw new Error('No expenses found')
  }
  if (new Set(entries.map((e) => e.projectId)).size !== 1) {
    throw new Error('All expenses must belong to the same project')
  }
  const projectId = entries[0]!.projectId
  await projectAccess.assert(projectId, orgMember, 'No expenses found')

  for (const entry of entries) {
    if (entry.status !== 'submitted_to_admin') {
      throw new Error('Only submitted expenses can be approved')
    }
  }

  const approveSettings = await projectsService.getSettings(
    orgMember.organizationId,
    projectId
  )
  const approvedStatus =
    approveSettings.clientInvolvement.expenses === 'off'
      ? 'client_accepted'
      : 'admin_accepted'

  await db
    .update(expenses)
    .set({ status: approvedStatus })
    .where(inArray(expenses.id, expenseIds))

  const details = await projectsService.getProjectDetails(projectId)
  const categoryIds = [...new Set(entries.map((e) => e.categoryId))]
  const categories = categoryIds.length
    ? await db
        .select({ id: expenseCategories.id, name: expenseCategories.name })
        .from(expenseCategories)
        .where(inArray(expenseCategories.id, categoryIds))
    : []
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  const memberIds = [...new Set(entries.map((e) => e.memberId))]
  for (const memberId of memberIds) {
    const memberExpenses = entries.filter((e) => e.memberId === memberId)
    const totalCents = memberExpenses.reduce((sum, e) => sum + e.amountCents, 0)
    const currency = memberExpenses.at(0)?.currency ?? 'USD'

    const [recipientMember] = await db
      .select({ email: users.email, name: users.name })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.id, memberId))

    if (recipientMember) {
      const firstEntry = memberExpenses[0]
      const category =
        categoryMap.get(firstEntry!.categoryId) ?? 'Uncategorized'
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(totalCents / 100)

      await sendEmailsToRecipients([recipientMember], async (recipient) => {
        const html = await render(
          ExpenseApprovedEmail({
            recipientName: recipient.name ?? 'there',
            approverName: orgMember.user.name ?? 'there',
            projectName: details.projectName,
            title:
              memberExpenses.length === 1
                ? firstEntry!.title
                : `${memberExpenses.length} expenses`,
            amount: formattedAmount,
            category,
            expenseDate: formatDateOnly(firstEntry!.date),
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

const reject = async ({
  expenseIds,
  reason,
  orgMember,
}: {
  expenseIds: string[]
  reason: string
  orgMember: ActiveMember
}) => {
  const entries = await db
    .select()
    .from(expenses)
    .where(inArray(expenses.id, expenseIds))
  if (entries.length === 0) {
    throw new Error('No expenses found')
  }
  if (new Set(entries.map((e) => e.projectId)).size !== 1) {
    throw new Error('All expenses must belong to the same project')
  }
  const projectId = entries[0]!.projectId
  await projectAccess.assert(projectId, orgMember, 'No expenses found')

  for (const entry of entries) {
    if (entry.status !== 'submitted_to_admin') {
      throw new Error('Only submitted expenses can be rejected')
    }
  }

  await db
    .update(expenses)
    .set({ status: 'admin_rejected', rejectReason: reason })
    .where(inArray(expenses.id, expenseIds))

  const details = await projectsService.getProjectDetails(projectId)
  const categoryIds = [...new Set(entries.map((e) => e.categoryId))]
  const categories = categoryIds.length
    ? await db
        .select({ id: expenseCategories.id, name: expenseCategories.name })
        .from(expenseCategories)
        .where(inArray(expenseCategories.id, categoryIds))
    : []
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  const memberIds = [...new Set(entries.map((e) => e.memberId))]
  for (const memberId of memberIds) {
    const memberExpenses = entries.filter((e) => e.memberId === memberId)
    const totalCents = memberExpenses.reduce((sum, e) => sum + e.amountCents, 0)
    const currency = memberExpenses.at(0)?.currency ?? 'USD'

    const [recipientMember] = await db
      .select({ email: users.email, name: users.name })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.id, memberId))

    if (recipientMember) {
      const firstEntry = memberExpenses[0]
      const category =
        categoryMap.get(firstEntry!.categoryId) ?? 'Uncategorized'
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(totalCents / 100)

      await sendEmailsToRecipients([recipientMember], async (recipient) => {
        const html = await render(
          ExpenseRejectedEmail({
            recipientName: recipient.name ?? 'there',
            rejectorName: orgMember.user.name ?? 'there',
            projectName: details.projectName,
            title:
              memberExpenses.length === 1
                ? firstEntry!.title
                : `${memberExpenses.length} expenses`,
            amount: formattedAmount,
            category,
            expenseDate: formatDateOnly(firstEntry!.date),
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

const sendToClient = async ({
  expenseIds,
  clientMemberIds,
  orgMember,
}: {
  expenseIds: string[]
  clientMemberIds: string[]
  orgMember: ActiveMember
}) => {
  const entries = await db
    .select()
    .from(expenses)
    .where(inArray(expenses.id, expenseIds))
  if (entries.length === 0) {
    throw new Error('No expenses found')
  }
  if (new Set(entries.map((e) => e.projectId)).size !== 1) {
    throw new Error('All expenses must belong to the same project')
  }
  const projectId = entries[0]!.projectId
  await projectAccess.assert(projectId, orgMember, 'No expenses found')

  const settings = await projectsService.getSettings(
    orgMember.organizationId,
    projectId
  )
  if (settings.clientInvolvement.expenses === 'off') {
    throw new Error(
      'Client involvement is disabled for expenses in this project'
    )
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
      throw new Error('Selected client does not have access to this project')
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(expenses)
      .set({ status: 'submitted_to_client', rejectReason: null })
      .where(inArray(expenses.id, expenseIds))

    const recipientRows = expenseIds.flatMap((expenseId) =>
      clientMemberIds.map((clientMemberId) => ({
        expenseId,
        clientMemberId,
        status: 'pending' as const,
      }))
    )

    await tx
      .insert(expenseRecipients)
      .values(recipientRows)
      .onConflictDoUpdate({
        target: [expenseRecipients.expenseId, expenseRecipients.clientMemberId],
        set: {
          status: 'pending',
          rejectReason: null,
          respondedAt: null,
        },
      })
  })

  const uniqueRecipients = [
    ...new Map(selectedClients.map((c) => [c.email, c])).values(),
  ]

  const details = await projectsService.getProjectDetails(projectId)
  const totalCents = entries.reduce((sum, e) => sum + e.amountCents, 0)
  const currency = entries.at(0)?.currency ?? 'USD'
  const totalAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(totalCents / 100)

  await sendEmailsToRecipients(uniqueRecipients, async (recipient) => {
    const html = await render(
      ExpenseSentToClientEmail({
        recipientName: recipient.name ?? 'there',
        senderName: orgMember.user.name ?? 'there',
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

const clientRespond = async ({
  expenseIds,
  action,
  reason,
  orgMember,
}: {
  expenseIds: string[]
  action: 'approve' | 'reject'
  reason?: string
  orgMember: ActiveMember
}) => {
  const entries = await db
    .select()
    .from(expenses)
    .where(inArray(expenses.id, expenseIds))
  if (entries.length === 0) {
    throw new Error('No expenses found')
  }
  if (new Set(entries.map((e) => e.projectId)).size !== 1) {
    throw new Error('All expenses must belong to the same project')
  }
  const projectId = entries[0]!.projectId
  await projectAccess.assert(projectId, orgMember, 'No expenses found')

  const settings = await projectsService.getSettings(
    orgMember.organizationId,
    projectId
  )
  if (settings.clientInvolvement.expenses === 'off') {
    throw new Error(
      'Client involvement is disabled for expenses in this project'
    )
  }

  for (const entry of entries) {
    if (entry.status !== 'submitted_to_client') {
      throw new Error('Only sent expenses can be responded to')
    }
  }

  const recipientStatus = action === 'approve' ? 'approved' : 'rejected'

  await db.transaction(async (tx) => {
    const recipients = await tx
      .select({
        id: expenseRecipients.id,
        expenseId: expenseRecipients.expenseId,
        clientMemberId: expenseRecipients.clientMemberId,
        status: expenseRecipients.status,
      })
      .from(expenseRecipients)
      .where(inArray(expenseRecipients.expenseId, expenseIds))

    for (const expenseId of expenseIds) {
      const currentRecipient = recipients.find(
        (r) => r.expenseId === expenseId && r.clientMemberId === orgMember.id
      )
      if (!currentRecipient) {
        throw new Error(
          'You are not a recipient of one or more of these expenses'
        )
      }
      if (currentRecipient.status !== 'pending') {
        throw new Error('You have already responded to this expense')
      }
    }

    await tx
      .update(expenseRecipients)
      .set({
        status: recipientStatus,
        rejectReason: action === 'reject' ? (reason ?? null) : null,
        respondedAt: new Date(),
      })
      .where(
        and(
          inArray(expenseRecipients.expenseId, expenseIds),
          eq(expenseRecipients.clientMemberId, orgMember.id)
        )
      )

    for (const expenseId of expenseIds) {
      if (action === 'reject') {
        await tx
          .update(expenses)
          .set({
            status: 'client_rejected',
            rejectReason: reason ?? null,
          })
          .where(eq(expenses.id, expenseId))
      } else {
        const freshRecips = await tx
          .select({ status: expenseRecipients.status })
          .from(expenseRecipients)
          .where(eq(expenseRecipients.expenseId, expenseId))
        const allApproved =
          freshRecips.length > 0 &&
          freshRecips.every((r) => r.status === 'approved')
        if (allApproved) {
          await tx
            .update(expenses)
            .set({
              status: 'client_accepted',
              rejectReason: null,
            })
            .where(eq(expenses.id, expenseId))
        }
      }
    }
  })

  const details = await projectsService.getProjectDetails(projectId)
  const adminsAndOwners = await getAdminsAndOwners(orgMember.organizationId)

  const categoryIds = [...new Set(entries.map((e) => e.categoryId))]
  const categories = categoryIds.length
    ? await db
        .select({ id: expenseCategories.id, name: expenseCategories.name })
        .from(expenseCategories)
        .where(inArray(expenseCategories.id, categoryIds))
    : []
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))
  const totalCents = entries.reduce((sum, e) => sum + e.amountCents, 0)
  const currency = entries.at(0)?.currency ?? 'USD'
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(totalCents / 100)

  const firstEntry = entries[0]!
  const category = categoryMap.get(firstEntry.categoryId) ?? 'Uncategorized'
  const desc =
    entries.length === 1 ? firstEntry.title : `${entries.length} expenses`

  if (action === 'approve') {
    await sendEmailsToRecipients(adminsAndOwners, async (recipient) => {
      const html = await render(
        ExpenseApprovedEmail({
          recipientName: recipient.name ?? 'there',
          approverName: orgMember.user.name ?? 'A client',
          projectName: details.projectName,
          title: desc,
          amount: formattedAmount,
          category,
          expenseDate: formatDateOnly(firstEntry.date),
          billable: firstEntry.billable,
          orgSlug: details.orgSlug ?? '',
          projectSlug: details.projectSlug,
        })
      )
      return {
        to: recipient.email,
        subject: `Expense approved by client — ${formattedAmount}`,
        html,
      }
    })
  } else {
    await sendEmailsToRecipients(adminsAndOwners, async (recipient) => {
      const html = await render(
        ExpenseRejectedEmail({
          recipientName: recipient.name ?? 'there',
          rejectorName: orgMember.user.name ?? 'A client',
          projectName: details.projectName,
          title: desc,
          amount: formattedAmount,
          category,
          expenseDate: formatDateOnly(firstEntry.date),
          reason: reason ?? '',
          orgSlug: details.orgSlug ?? '',
          projectSlug: details.projectSlug,
        })
      )
      return {
        to: recipient.email,
        subject: `Expense rejected by client — ${formattedAmount}`,
        html,
      }
    })
  }

  return { success: true }
}

type CategoryInsert = typeof expenseCategories.$inferInsert

const createCategory = async ({
  organizationId,
  name,
  color,
}: Pick<CategoryInsert, 'organizationId' | 'name' | 'color'>) => {
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

const updateCategory = async ({
  categoryId,
  organizationId,
  name,
  color,
}: { categoryId: string } & Pick<CategoryInsert, 'organizationId'> &
  Partial<Pick<CategoryInsert, 'name' | 'color'>>) => {
  const [cat] = await db
    .select({ organizationId: expenseCategories.organizationId })
    .from(expenseCategories)
    .where(eq(expenseCategories.id, categoryId))
  if (!cat) {
    throw new Error('Category not found')
  }
  if (cat.organizationId !== organizationId) {
    throw new Error('Category not found')
  }

  const setValues: Partial<typeof expenseCategories.$inferInsert> = {}
  if (name !== undefined) {
    setValues.name = name
  }
  if (color !== undefined) {
    setValues.color = color
  }

  const [updated] = await db
    .update(expenseCategories)
    .set(setValues)
    .where(eq(expenseCategories.id, categoryId))
    .returning()

  return updated
}

const archiveCategory = async ({
  categoryId,
  organizationId,
}: {
  categoryId: string
  organizationId: string
}) => {
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
  if (existing.organizationId !== organizationId) {
    throw new Error('Category not found')
  }

  await db
    .update(expenseCategories)
    .set({ isArchived: !existing.isArchived })
    .where(eq(expenseCategories.id, categoryId))

  return { success: true }
}

export const expensesServices = {
  getRecipientsByExpenseIds,
  listByProject,
  listByProjectIds,
  listCategoriesByOrg,
  listExpensesByInvoiceId,
  listUnpaidExpensesByProject,
  create,
  update,
  remove,
  submit,
  approve,
  reject,
  sendToClient,
  clientRespond,
  createCategory,
  updateCategory,
  archiveCategory,
}
