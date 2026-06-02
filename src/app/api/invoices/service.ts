import { render } from '@react-email/render'
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  or,
} from 'drizzle-orm'

import { projectsService } from '@/app/api/projects/service'
import InvoiceDisputedEmail from '@/emails/templates/invoice-disputed'
import InvoicePaidEmail from '@/emails/templates/invoice-paid'
import InvoiceSentEmail from '@/emails/templates/invoice-sent'
import InvoiceUnpaidEmail from '@/emails/templates/invoice-unpaid'
import ThreadNewMessageEmail from '@/emails/templates/thread-new-message'
import { formatLocalDateOnly } from '@/lib/custom-fields'
import { getAdminsAndOwners, sendEmailsToRecipients } from '@/lib/notifications'
import { formatDateOnly } from '@/lib/utils'
import {
  type ActiveMember,
  type Project,
  projectAccess,
} from '@/server/access/project-access'
import { db } from '@/server/db'
import {
  expenses,
  invoiceConversionRates,
  invoiceExpenses,
  invoiceItems,
  invoiceRecipients,
  invoiceRequirements,
  invoices,
  media,
  members,
  projectClientAssignments,
  projects,
  requirements,
  threadMessages,
  threads,
  users,
} from '@/server/db/schema'
import { CLIENT_VISIBLE_INVOICE_STATUSES } from '@/server/visibility/client-visibility'
import { currencyConversionService } from '@/services/currency-conversion.service'
import type { Role } from '@/types'

export type InvoiceWithMedia = typeof invoices.$inferSelect & {
  senderLogoObject?: typeof media.$inferSelect | null
  senderSignatureObject?: typeof media.$inferSelect | null
}

// Line item the editor sends: the invoice_items columns plus the conversion
// metadata snapshotted into invoice_conversion_rates (not persisted on the row).
type InvoiceItemInput = Pick<
  typeof invoiceItems.$inferInsert,
  'amount' | 'description' | 'quantity' | 'unitPrice'
> & { rateUsed?: number; sourceCurrency?: string }

// The editable invoice fields: the persisted columns (minus what the server
// derives — id/project/total/status/recipient/timestamps), with dates as the
// `Date` the form sends and the relations that live in their own tables.
type InvoiceDetailsInput = Omit<
  typeof invoices.$inferInsert,
  | 'id'
  | 'projectId'
  | 'totalAmount'
  | 'status'
  | 'recipient'
  | 'issueDate'
  | 'dueDate'
  | 'createdAt'
  | 'updatedAt'
> & {
  clientMemberIds: string[]
  // `currency` is optional on $inferInsert (it has a DB default), but the
  // editor always sends it and the rate snapshot requires it.
  currency: string
  dueDate?: Date
  expenseIds?: string[]
  issueDate: Date
  items: InvoiceItemInput[]
  requirementIds?: string[]
}

const listByProject = async ({
  memberId,
  projectId,
  role,
}: {
  projectId: string
  memberId: string
  role: Role
}) => {
  let invoicesList: (typeof invoices.$inferSelect)[]
  if (role === 'client') {
    invoicesList = await db
      .select(getTableColumns(invoices))
      .from(invoices)
      .where(
        and(
          eq(invoices.projectId, projectId),
          inArray(invoices.status, CLIENT_VISIBLE_INVOICE_STATUSES)
        )
      )
      .innerJoin(
        invoiceRecipients,
        and(
          eq(invoiceRecipients.invoiceId, invoices.id),
          eq(invoiceRecipients.memberId, memberId)
        )
      )
      .orderBy(desc(invoices.createdAt))
  } else if (role === 'member') {
    const memberRecipientInvoiceIds = db
      .select({ id: invoiceRecipients.invoiceId })
      .from(invoiceRecipients)
      .where(eq(invoiceRecipients.memberId, memberId))
    invoicesList = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.projectId, projectId),
          or(
            eq(invoices.recipient, 'client'),
            inArray(invoices.id, memberRecipientInvoiceIds)
          )
        )
      )
      .orderBy(desc(invoices.createdAt))
  } else {
    invoicesList = await db
      .select()
      .from(invoices)
      .where(eq(invoices.projectId, projectId))
      .orderBy(desc(invoices.createdAt))
  }

  const withRecipients = await Promise.all(
    invoicesList.map(async (invoice) => {
      const recipients = await db
        .select({
          assignmentId: projectClientAssignments.id,
          memberId: invoiceRecipients.memberId,
          userName: users.name,
          userEmail: users.email,
          assignedAt: members.createdAt,
          userId: members.userId,
          userImage: users.image,
        })
        .from(invoiceRecipients)
        .innerJoin(members, eq(invoiceRecipients.memberId, members.id))
        .innerJoin(users, eq(members.userId, users.id))
        .innerJoin(
          projectClientAssignments,
          and(
            eq(projectClientAssignments.memberId, members.id),
            eq(projectClientAssignments.projectId, projectId)
          )
        )
        .where(eq(invoiceRecipients.invoiceId, invoice.id))

      return {
        ...invoice,
        recipients,
      }
    })
  )

  return withRecipients
}

const getById = async ({
  invoiceId,
  organizationId,
  projectId,
  role,
  memberId,
}: {
  invoiceId: string
  projectId: string
  organizationId: string
  role: Role
  memberId: string
}) => {
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organizationId)
      )
    )
  if (!project) {
    return null
  }

  let invoice: InvoiceWithMedia | null
  if (role === 'client') {
    const [row] = await db
      .select(getTableColumns(invoices))
      .from(invoices)
      .where(
        and(eq(invoices.id, invoiceId), eq(invoices.projectId, project.id))
      )
      .innerJoin(
        invoiceRecipients,
        and(
          eq(invoiceRecipients.invoiceId, invoices.id),
          eq(invoiceRecipients.memberId, memberId)
        )
      )
      .limit(1)
    invoice = (row ?? null) as unknown as InvoiceWithMedia | null
  } else if (role === 'member') {
    const candidate = (await db.query.invoices.findFirst({
      where: and(
        eq(invoices.id, invoiceId),
        eq(invoices.projectId, project.id)
      ),
    })) as unknown as InvoiceWithMedia | null
    if (candidate?.recipient === 'member') {
      const [recipientRow] = await db
        .select({ id: invoiceRecipients.id })
        .from(invoiceRecipients)
        .where(
          and(
            eq(invoiceRecipients.invoiceId, candidate.id),
            eq(invoiceRecipients.memberId, memberId)
          )
        )
        .limit(1)
      invoice = recipientRow ? candidate : null
    } else {
      invoice = candidate
    }
  } else {
    invoice = (await db.query.invoices.findFirst({
      where: and(
        eq(invoices.id, invoiceId),
        eq(invoices.projectId, project.id)
      ),
    })) as unknown as InvoiceWithMedia | null
  }
  if (invoice) {
    if (invoice.senderLogo) {
      invoice.senderLogoObject = await db.query.media.findFirst({
        where: eq(media.id, invoice.senderLogo),
      })
    }
    if (invoice.senderSignature) {
      invoice.senderSignatureObject = await db.query.media.findFirst({
        where: eq(media.id, invoice.senderSignature),
      })
    }
  }

  return invoice ?? null
}

const getRecipients = async (invoiceId: string) =>
  await db
    .select({
      id: invoiceRecipients.id,
      memberId: invoiceRecipients.memberId,
      userName: users.name,
      userEmail: users.email,
    })
    .from(invoiceRecipients)
    .innerJoin(members, eq(invoiceRecipients.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(invoiceRecipients.invoiceId, invoiceId))

const getItems = async (invoiceId: string) =>
  await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .orderBy(asc(invoiceItems.sortOrder))

const getLinkedRequirements = async (invoiceId: string) =>
  await db
    .select({
      id: invoiceRequirements.id,
      requirementId: requirements.id,
      title: requirements.title,
      slug: requirements.slug,
      status: requirements.status,
    })
    .from(invoiceRequirements)
    .innerJoin(
      requirements,
      eq(invoiceRequirements.requirementId, requirements.id)
    )
    .where(eq(invoiceRequirements.invoiceId, invoiceId))

const listByProjectIds = async (
  projectIds: string[],
  opts: { clientView?: boolean } = {}
) => {
  if (projectIds.length === 0) {
    return []
  }

  const whereClause = opts.clientView
    ? and(
        inArray(invoices.projectId, projectIds),
        inArray(invoices.status, CLIENT_VISIBLE_INVOICE_STATUSES)
      )
    : inArray(invoices.projectId, projectIds)

  return await db
    .select()
    .from(invoices)
    .where(whereClause)
    .orderBy(desc(invoices.createdAt))
}

const getConversionRates = async (invoiceId: string) =>
  await db
    .select({
      fromCurrency: invoiceConversionRates.fromCurrency,
      toCurrency: invoiceConversionRates.toCurrency,
      rate: invoiceConversionRates.rate,
      capturedAt: invoiceConversionRates.capturedAt,
    })
    .from(invoiceConversionRates)
    .where(eq(invoiceConversionRates.invoiceId, invoiceId))
    .orderBy(asc(invoiceConversionRates.fromCurrency))

const getNextSequence = async (projectId: string) => {
  const [row] = await db
    .select({ value: count() })
    .from(invoices)
    .where(eq(invoices.projectId, projectId))
  return (row?.value ?? 0) + 1
}

const create = async ({
  project,
  orgMember,
  recipientType,
  details,
}: {
  project: Project
  orgMember: ActiveMember
  recipientType: 'member' | 'client'
  details: InvoiceDetailsInput
}) => {
  const projectId = project.id
  const { clientMemberIds, items, requirementIds, expenseIds } = details

  if (recipientType === 'member' && clientMemberIds.length !== 1) {
    throw new Error('Member invoices must have exactly one recipient member')
  }

  if (clientMemberIds.length) {
    const allowedRoles =
      recipientType === 'member' ? ['member', 'admin', 'owner'] : ['client']
    const validMembers = await db
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          inArray(members.id, clientMemberIds),
          eq(members.organizationId, project.organizationId),
          inArray(members.role, allowedRoles)
        )
      )
    if (validMembers.length !== clientMemberIds.length) {
      throw new Error(
        'One or more recipients are invalid for this organization'
      )
    }
  }

  if (expenseIds?.length) {
    const validExpenses = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(
        and(inArray(expenses.id, expenseIds), eq(expenses.projectId, projectId))
      )
    if (validExpenses.length !== expenseIds.length) {
      throw new Error('One or more expenses are invalid for this project')
    }
  }

  const totalAmount = items
    .reduce((sum, item) => sum + Number(item.amount), 0)
    .toFixed(4)
  const invoiceWithSameNumber = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.projectId, projectId),
        eq(invoices.invoiceNumber, details.invoiceNumber)
      )
    )
  if (invoiceWithSameNumber.length) {
    throw new Error('An invoice with same invoice number already exists.')
  }
  const invoice = await db.transaction(async (tx) => {
    const [insertedInvoice] = await tx
      .insert(invoices)
      .values({
        projectId,
        invoiceNumber: details.invoiceNumber,
        issueDate: formatLocalDateOnly(details.issueDate),
        dueDate: details.dueDate ? formatLocalDateOnly(details.dueDate) : null,
        notes: details.notes || null,
        currency: details.currency,
        totalAmount,
        senderLogo: details.senderLogo || null,
        senderSignature: details.senderSignature || null,
        senderName: details.senderName || null,
        senderAddress: details.senderAddress || null,
        senderCustomFields: details.senderCustomFields?.length
          ? details.senderCustomFields
          : null,
        clientName: details.clientName || null,
        clientAddress: details.clientAddress || null,
        clientCustomFields: details.clientCustomFields?.length
          ? details.clientCustomFields
          : null,
        paymentTerms: details.paymentTerms || null,
        terms: details.terms || null,
        discountLabel: details.discountLabel || null,
        discountAmount: details.discountAmount || null,
        recipient: recipientType,
        status: recipientType === 'member' ? 'sent' : 'draft',
      })
      .returning()

    if (clientMemberIds?.length) {
      await tx.insert(invoiceRecipients).values(
        clientMemberIds.map((clientMemberId) => ({
          invoiceId: insertedInvoice!.id,
          memberId: clientMemberId,
        }))
      )
    }
    if (items?.length) {
      await tx.insert(invoiceItems).values(
        items.map((item, index) => ({
          invoiceId: insertedInvoice!.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          sortOrder: index,
        }))
      )
    }

    if (requirementIds?.length) {
      await tx.insert(invoiceRequirements).values(
        requirementIds.map((requirementId) => ({
          invoiceId: insertedInvoice!.id,
          requirementId,
        }))
      )
    }

    if (expenseIds?.length) {
      await tx
        .insert(invoiceExpenses)
        .values(
          expenseIds.map((expenseId) => ({
            invoiceId: insertedInvoice!.id,
            expenseId,
          }))
        )
        .onConflictDoNothing()
    }

    // Snapshot the rates actually used to price the line items so any future
    // dispute can be settled against the same numbers — even if live rates
    // move. Source currency + rate are carried on each item by the editor
    // (see invoiceItemSchema), so we don't re-derive and risk a different rate.
    // A source currency must resolve to one consistent rate within an invoice.
    const ratesUsed = new Map<string, number>()
    for (const item of items) {
      if (!(item.sourceCurrency && item.rateUsed)) {
        continue
      }
      const existing = ratesUsed.get(item.sourceCurrency)
      if (existing !== undefined && existing !== item.rateUsed) {
        throw new Error(
          `Inconsistent conversion rates for ${item.sourceCurrency}: ${existing} vs ${item.rateUsed}`
        )
      }
      ratesUsed.set(item.sourceCurrency, item.rateUsed)
    }
    await currencyConversionService.snapshotRates(
      tx,
      insertedInvoice!.id,
      ratesUsed,
      details.currency
    )

    return insertedInvoice
  })

  if (recipientType === 'member' && clientMemberIds?.length && invoice) {
    try {
      const recipients = await db
        .select({ userName: users.name, userEmail: users.email })
        .from(invoiceRecipients)
        .innerJoin(members, eq(invoiceRecipients.memberId, members.id))
        .innerJoin(users, eq(members.userId, users.id))
        .where(eq(invoiceRecipients.invoiceId, invoice.id))

      const { projectName, projectSlug, orgSlug } =
        await projectsService.getProjectDetails(projectId)

      await sendEmailsToRecipients(
        recipients.map((r) => ({ email: r.userEmail, name: r.userName })),
        async (recipient) => {
          const html = await render(
            InvoiceSentEmail({
              recipientName: recipient.name ?? 'there',
              invoiceNumber: invoice.invoiceNumber,
              projectName,
              senderName: orgMember.user.name ?? 'there',
              totalAmount: Number(invoice.totalAmount).toLocaleString('en-US', {
                minimumFractionDigits: 2,
              }),
              currency: invoice.currency,
              issueDate: formatDateOnly(invoice.issueDate),
              dueDate: invoice.dueDate
                ? formatDateOnly(invoice.dueDate)
                : 'No due date',
              orgSlug: orgSlug ?? '',
              projectSlug,
              invoiceId: invoice.id,
            })
          )
          return {
            to: recipient.email,
            subject: `Invoice ${invoice.invoiceNumber} — ${invoice.currency} ${Number(invoice.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            html,
          }
        }
      )
    } catch (err) {
      console.error('Failed to send member invoice email', err)
    }
  }

  return invoice
}

const update = async ({
  invoiceId,
  orgMember,
  details,
}: {
  invoiceId: string
  orgMember: ActiveMember
  details: InvoiceDetailsInput
}) => {
  const { clientMemberIds, items, requirementIds, expenseIds } = details
  const existing = await db
    .select({
      status: invoices.status,
      projectId: invoices.projectId,
      recipient: invoices.recipient,
    })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .then((r) => r[0])

  if (!existing) {
    throw new Error('Invoice not found')
  }
  await projectAccess.assert(existing.projectId, orgMember, 'Invoice not found')
  const isMemberInvoice = existing.recipient === 'member'
  const editableStatuses: (typeof existing.status)[] = isMemberInvoice
    ? ['draft', 'sent', 'disputed']
    : ['draft']
  if (!editableStatuses.includes(existing.status)) {
    throw new Error('This invoice can no longer be edited')
  }

  if (isMemberInvoice && clientMemberIds.length !== 1) {
    throw new Error('Member invoices must have exactly one recipient member')
  }

  if (clientMemberIds.length) {
    const allowedRoles = isMemberInvoice
      ? ['member', 'admin', 'owner']
      : ['client']
    const validMembers = await db
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          inArray(members.id, clientMemberIds),
          eq(members.organizationId, orgMember.organizationId),
          inArray(members.role, allowedRoles)
        )
      )
    if (validMembers.length !== clientMemberIds.length) {
      throw new Error(
        'One or more recipients are invalid for this organization'
      )
    }
  }

  if (expenseIds?.length) {
    const validExpenses = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(
        and(
          inArray(expenses.id, expenseIds),
          eq(expenses.projectId, existing.projectId)
        )
      )
    if (validExpenses.length !== expenseIds.length) {
      throw new Error('One or more expenses are invalid for this invoice')
    }
  }

  const totalAmount = items
    .reduce((sum, item) => sum + Number(item.amount), 0)
    .toFixed(4)
  try {
    return await db.transaction(async (tx) => {
      const [insertedInvoice] = await tx
        .update(invoices)
        .set({
          invoiceNumber: details.invoiceNumber,
          issueDate: formatLocalDateOnly(details.issueDate),
          dueDate: details.dueDate
            ? formatLocalDateOnly(details.dueDate)
            : null,
          notes: details.notes || null,
          currency: details.currency,
          totalAmount,
          senderLogo: details.senderLogo || null,
          senderSignature: details.senderSignature || null,
          senderName: details.senderName || null,
          senderAddress: details.senderAddress || null,
          senderCustomFields: details.senderCustomFields?.length
            ? details.senderCustomFields
            : null,
          clientName: details.clientName || null,
          clientAddress: details.clientAddress || null,
          clientCustomFields: details.clientCustomFields?.length
            ? details.clientCustomFields
            : null,
          paymentTerms: details.paymentTerms || null,
          terms: details.terms || null,
          discountLabel: details.discountLabel || null,
          discountAmount: details.discountAmount || null,
        })
        .where(eq(invoices.id, invoiceId))
        .returning()

      await tx
        .delete(invoiceRecipients)
        .where(eq(invoiceRecipients.invoiceId, invoiceId))
      if (clientMemberIds?.length) {
        await tx.insert(invoiceRecipients).values(
          clientMemberIds.map((clientMemberId) => ({
            invoiceId: insertedInvoice!.id,
            memberId: clientMemberId,
          }))
        )
      }

      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId))
      if (items?.length) {
        await tx.insert(invoiceItems).values(
          items.map((item, index) => ({
            invoiceId: insertedInvoice!.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            sortOrder: index,
          }))
        )
      }

      await tx
        .delete(invoiceRequirements)
        .where(eq(invoiceRequirements.invoiceId, invoiceId))
      if (requirementIds?.length) {
        await tx.insert(invoiceRequirements).values(
          requirementIds.map((requirementId) => ({
            invoiceId: insertedInvoice!.id,
            requirementId,
          }))
        )
      }
      // Replace linked expenses for this invoice — clear old, set new
      await tx
        .delete(invoiceExpenses)
        .where(eq(invoiceExpenses.invoiceId, invoiceId))

      if (expenseIds?.length) {
        await tx.insert(invoiceExpenses).values(
          expenseIds.map((expenseId) => ({
            invoiceId: insertedInvoice!.id,
            expenseId,
          }))
        )
      }

      const ratesUsed = new Map<string, number>()
      for (const item of items) {
        if (!(item.sourceCurrency && item.rateUsed)) {
          continue
        }
        const existing = ratesUsed.get(item.sourceCurrency)
        if (existing !== undefined && existing !== item.rateUsed) {
          throw new Error(
            `Inconsistent conversion rates for ${item.sourceCurrency}: ${existing} vs ${item.rateUsed}`
          )
        }
        ratesUsed.set(item.sourceCurrency, item.rateUsed)
      }
      await currencyConversionService.snapshotRates(
        tx,
        invoiceId,
        ratesUsed,
        details.currency
      )
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update invoice')
  }
}

const send = async ({
  invoiceId,
  clientMemberIds,
  orgMember,
}: {
  invoiceId: string
  clientMemberIds: string[]
  orgMember: ActiveMember
}) => {
  const invoice = await db
    .select({
      id: invoices.id,
      projectId: invoices.projectId,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      totalAmount: invoices.totalAmount,
      currency: invoices.currency,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
    })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .then((r) => r[0])

  if (!invoice) {
    throw new Error('Invoice not found')
  }
  await projectAccess.assert(invoice.projectId, orgMember, 'Invoice not found')
  const settings = await projectsService.getSettings(
    orgMember.organizationId,
    invoice.projectId
  )
  if (settings.clientInvolvement.invoices === 'off') {
    throw new Error(
      'Client involvement is disabled for invoices in this project'
    )
  }
  if (invoice.status !== 'draft') {
    throw new Error('Only draft invoices can be sent')
  }

  const items = await db
    .select({ id: invoiceItems.id })
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId))

  if (items.length === 0) {
    throw new Error('Invoice must have at least one item')
  }

  if (clientMemberIds.length === 0) {
    throw new Error('Invoice must have at least one recipient')
  }

  const validRecipients = await db
    .select({ id: members.id })
    .from(members)
    .innerJoin(
      projectClientAssignments,
      and(
        eq(projectClientAssignments.memberId, members.id),
        eq(projectClientAssignments.projectId, invoice.projectId)
      )
    )
    .where(
      and(
        inArray(members.id, clientMemberIds),
        eq(members.organizationId, orgMember.organizationId),
        eq(members.role, 'client')
      )
    )

  if (validRecipients.length !== clientMemberIds.length) {
    throw new Error('One or more recipients are invalid for this project')
  }

  await db
    .delete(invoiceRecipients)
    .where(eq(invoiceRecipients.invoiceId, invoiceId))

  await db
    .insert(invoiceRecipients)
    .values(
      clientMemberIds.map((memberId) => ({
        invoiceId,
        memberId,
      }))
    )
    .onConflictDoNothing()

  const recipients = await db
    .select({
      memberId: invoiceRecipients.memberId,
      userName: users.name,
      userEmail: users.email,
    })
    .from(invoiceRecipients)
    .innerJoin(members, eq(invoiceRecipients.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(invoiceRecipients.invoiceId, invoiceId))

  await db
    .update(invoices)
    .set({ status: 'sent' })
    .where(eq(invoices.id, invoiceId))

  const { projectName, projectSlug, orgSlug } =
    await projectsService.getProjectDetails(invoice.projectId)

  await sendEmailsToRecipients(
    recipients.map((r) => ({ email: r.userEmail, name: r.userName })),
    async (recipient) => {
      const html = await render(
        InvoiceSentEmail({
          recipientName: recipient.name ?? 'there',
          invoiceNumber: invoice.invoiceNumber,
          projectName,
          senderName: orgMember.user.name ?? 'there',
          totalAmount: Number(invoice.totalAmount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
          }),
          currency: invoice.currency,
          issueDate: formatDateOnly(invoice.issueDate),
          dueDate: invoice.dueDate
            ? formatDateOnly(invoice.dueDate)
            : 'No due date',
          orgSlug: orgSlug ?? '',
          projectSlug,
          invoiceId: invoice.id,
        })
      )
      return {
        to: recipient.email,
        subject: `Invoice ${invoice.invoiceNumber} — ${invoice.currency} ${Number(invoice.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        html,
      }
    }
  )

  return invoice
}

const markPaid = async ({
  invoiceId,
  orgMember,
}: {
  invoiceId: string
  orgMember: ActiveMember
}) => {
  const invoice = await db
    .select({
      id: invoices.id,
      projectId: invoices.projectId,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      totalAmount: invoices.totalAmount,
      currency: invoices.currency,
      recipient: invoices.recipient,
    })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .then((r) => r[0])

  if (!invoice) {
    throw new Error('Invoice not found')
  }
  await projectAccess.assert(invoice.projectId, orgMember, 'Invoice not found')

  const settings = await projectsService.getSettings(
    orgMember.organizationId,
    invoice.projectId
  )
  const clientOff = settings.clientInvolvement.invoices === 'off'
  const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'
  const isMemberInvoice = invoice.recipient === 'member'

  // Member invoices are internal: admins/owners can mark them paid regardless
  // of the project's clientInvolvement setting.
  if (clientOff || isMemberInvoice) {
    if (!isAdmin) {
      throw new Error('Only admins can mark invoices as paid')
    }
    if (invoice.status !== 'sent' && invoice.status !== 'draft') {
      throw new Error('Only draft or sent invoices can be marked as paid')
    }
  } else {
    if (invoice.status !== 'sent') {
      throw new Error('Only sent invoices can be marked as paid')
    }
    const allRecipients = await db
      .select({ memberId: invoiceRecipients.memberId })
      .from(invoiceRecipients)
      .where(eq(invoiceRecipients.invoiceId, invoiceId))
    const isRecipient = allRecipients.some((r) => r.memberId === orgMember.id)
    if (!isRecipient) {
      throw new Error('Only an invoice recipient can mark it as paid')
    }
  }

  await db
    .update(invoices)
    .set({ status: 'paid' })
    .where(eq(invoices.id, invoiceId))

  const { projectName, projectSlug, orgSlug } =
    await projectsService.getProjectDetails(invoice.projectId)

  const admins = await getAdminsAndOwners(orgMember.organizationId)

  const totalFormatted = Number(invoice.totalAmount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
  })
  const paidAt = new Date().toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  await sendEmailsToRecipients(admins, async (admin) => {
    const html = await render(
      InvoicePaidEmail({
        recipientName: admin.name ?? 'there',
        invoiceNumber: invoice.invoiceNumber,
        projectName,
        paidByName: orgMember.user.name ?? 'there',
        totalAmount: totalFormatted,
        currency: invoice.currency,
        paidAt,
        orgSlug: orgSlug ?? '',
        projectSlug,
        invoiceId: invoice.id,
      })
    )
    return {
      to: admin.email,
      subject: `Invoice ${invoice.invoiceNumber} marked as paid`,
      html,
    }
  })

  return { success: true }
}

const remove = async ({
  invoiceId,
  orgMember,
}: {
  invoiceId: string
  orgMember: ActiveMember
}) => {
  const invoice = await db
    .select({
      status: invoices.status,
      projectId: invoices.projectId,
      recipient: invoices.recipient,
    })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .then((r) => r[0])

  if (!invoice) {
    throw new Error('Invoice not found')
  }
  await projectAccess.assert(invoice.projectId, orgMember, 'Invoice not found')
  const deletableStatuses: (typeof invoice.status)[] =
    invoice.recipient === 'member' ? ['draft', 'sent', 'disputed'] : ['draft']
  if (!deletableStatuses.includes(invoice.status)) {
    throw new Error('This invoice can no longer be deleted')
  }

  await db.delete(invoices).where(eq(invoices.id, invoiceId))

  return { success: true }
}

const createThread = async ({
  invoiceId,
  body,
  orgMember,
}: {
  invoiceId: string
  body: string
  orgMember: ActiveMember
}) => {
  const invoice = await db
    .select({
      id: invoices.id,
      projectId: invoices.projectId,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      totalAmount: invoices.totalAmount,
      currency: invoices.currency,
    })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .then((r) => r[0])

  if (!invoice) {
    throw new Error('Invoice not found')
  }
  await projectAccess.assert(invoice.projectId, orgMember, 'Invoice not found')
  const settings = await projectsService.getSettings(
    orgMember.organizationId,
    invoice.projectId
  )
  if (settings.clientInvolvement.invoices === 'off') {
    throw new Error(
      'Client involvement is disabled for invoices in this project'
    )
  }
  if (invoice.status !== 'sent' && invoice.status !== 'disputed') {
    throw new Error('Threads can only be created on sent or disputed invoices')
  }

  const [recipientRow] = await db
    .select({ id: invoiceRecipients.id })
    .from(invoiceRecipients)
    .where(
      and(
        eq(invoiceRecipients.invoiceId, invoiceId),
        eq(invoiceRecipients.memberId, orgMember.id)
      )
    )
    .limit(1)
  if (!recipientRow) {
    throw new Error('Only an invoice recipient can raise a dispute')
  }

  const thread = await db.transaction(async (tx) => {
    const [t] = await tx
      .insert(threads)
      .values({
        selectedText: body,
        createdByMemberId: orgMember.id,
        entityId: invoiceId,
        projectId: invoice.projectId,
      })
      .returning()

    await tx.insert(threadMessages).values({
      threadId: t!.id,
      authorMemberId: orgMember.id,
      body,
    })

    if (invoice.status === 'sent') {
      await tx
        .update(invoices)
        .set({ status: 'disputed' })
        .where(eq(invoices.id, invoiceId))
    }

    return t
  })

  const { projectName, projectSlug, orgSlug } =
    await projectsService.getProjectDetails(invoice.projectId)

  const admins = await getAdminsAndOwners(orgMember.organizationId)

  const totalFormatted = Number(invoice.totalAmount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
  })

  await sendEmailsToRecipients(admins, async (admin) => {
    const html = await render(
      InvoiceDisputedEmail({
        recipientName: admin.name ?? 'there',
        invoiceNumber: invoice.invoiceNumber,
        projectName,
        disputedByName: orgMember.user.name ?? 'there',
        totalAmount: totalFormatted,
        currency: invoice.currency,
        orgSlug: orgSlug ?? '',
        projectSlug,
        invoiceId: invoice.id,
      })
    )
    return {
      to: admin.email,
      subject: `Invoice ${invoice.invoiceNumber} — dispute raised`,
      html,
    }
  })

  return thread
}

const replyToThread = async ({
  threadId,
  body,
  orgMember,
}: {
  threadId: string
  body: string
  orgMember: ActiveMember
}) => {
  const thread = await db
    .select()
    .from(threads)
    .where(eq(threads.id, threadId))
    .then((r) => r[0])

  if (!thread) {
    throw new Error('Thread not found')
  }

  const [inv] = await db
    .select({ projectId: invoices.projectId })
    .from(invoices)
    .where(eq(invoices.id, thread.entityId))
  if (!inv) {
    throw new Error('Thread not found')
  }
  await projectAccess.assert(inv.projectId, orgMember, 'Thread not found')

  if (thread.status === 'resolved') {
    throw new Error('Cannot reply to a resolved thread')
  }

  const [message] = await db
    .insert(threadMessages)
    .values({
      threadId,
      authorMemberId: orgMember.id,
      body,
    })
    .returning()

  const existingMessages = await db
    .select({ authorMemberId: threadMessages.authorMemberId })
    .from(threadMessages)
    .where(eq(threadMessages.threadId, threadId))

  const participantIds = [
    ...new Set([
      ...existingMessages
        .map((m) => m.authorMemberId)
        .filter((id): id is string => id !== null),
      ...(thread.createdByMemberId ? [thread.createdByMemberId] : []),
    ]),
  ].filter((id) => id !== orgMember.id)

  if (participantIds.length > 0) {
    const invoice = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
      })
      .from(invoices)
      .where(eq(invoices.id, thread.entityId))
      .then((r) => r[0])

    const { projectName, projectSlug, orgSlug } =
      await projectsService.getProjectDetails(inv.projectId)

    const participants = await db
      .select({
        email: users.email,
        name: users.name,
        memberId: members.id,
      })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(inArray(members.id, participantIds))

    const threadLink = invoice
      ? `/${orgSlug}/${projectSlug}/invoices/${invoice.id}`
      : `/${orgSlug}/${projectSlug}/invoices`

    await sendEmailsToRecipients(participants, async (participant) => {
      const html = await render(
        ThreadNewMessageEmail({
          recipientName: participant.name ?? 'there',
          senderName: orgMember.user.name ?? 'there',
          threadTitle: thread.selectedText,
          messagePreview: body.length > 200 ? `${body.slice(0, 200)}...` : body,
          contextType: 'invoice',
          contextName: invoice?.invoiceNumber ?? 'Invoice',
          projectName,
          orgSlug: orgSlug ?? '',
          projectSlug,
          threadLink,
        })
      )
      return {
        to: participant.email,
        subject: `Re: ${thread.selectedText} — ${orgMember.user.name ?? 'Someone'} replied`,
        html,
      }
    })
  }

  return message
}

const resolveThread = async ({
  threadId,
  orgMember,
}: {
  threadId: string
  orgMember: ActiveMember
}) => {
  const thread = await db
    .select({
      id: threads.id,
      entityId: threads.entityId,
      status: threads.status,
    })
    .from(threads)
    .where(eq(threads.id, threadId))
    .then((r) => r[0])

  if (!thread) {
    throw new Error('Thread not found')
  }

  const [inv] = await db
    .select({ projectId: invoices.projectId })
    .from(invoices)
    .where(eq(invoices.id, thread.entityId))
  if (!inv) {
    throw new Error('Thread not found')
  }
  await projectAccess.assert(inv.projectId, orgMember, 'Thread not found')

  await db
    .update(threads)
    .set({ status: 'resolved' })
    .where(eq(threads.id, threadId))

  const remaining = await db
    .select({ id: threads.id, status: threads.status })
    .from(threads)
    .where(eq(threads.entityId, thread.entityId))

  const stillOpen = remaining.some(
    (t) => t.status === 'open' && t.id !== threadId
  )

  if (!stillOpen) {
    await db
      .update(invoices)
      .set({ status: 'sent' })
      .where(eq(invoices.id, thread.entityId))
  }

  return { success: true }
}

const changeStatus = async ({
  invoiceId,
  status,
  orgMember,
}: {
  invoiceId: string
  status: 'draft' | 'sent' | 'paid' | 'disputed' | 'cancelled'
  orgMember: ActiveMember
}) => {
  const invoice = await db
    .select({
      id: invoices.id,
      projectId: invoices.projectId,
      status: invoices.status,
      invoiceNumber: invoices.invoiceNumber,
      totalAmount: invoices.totalAmount,
      currency: invoices.currency,
    })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .then((r) => r[0])

  if (!invoice) {
    throw new Error('Invoice not found')
  }
  await projectAccess.assert(invoice.projectId, orgMember, 'Invoice not found')

  await db.update(invoices).set({ status }).where(eq(invoices.id, invoiceId))

  // Notify recipients when invoice is marked as unpaid (paid → sent)
  if (invoice.status === 'paid' && status === 'sent') {
    const recipients = await db
      .select({
        memberId: invoiceRecipients.memberId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(invoiceRecipients)
      .innerJoin(members, eq(invoiceRecipients.memberId, members.id))
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(invoiceRecipients.invoiceId, invoiceId))

    if (recipients.length > 0) {
      const { projectName, projectSlug, orgSlug } =
        await projectsService.getProjectDetails(invoice.projectId)

      const totalFormatted = Number(invoice.totalAmount).toLocaleString(
        'en-US',
        { minimumFractionDigits: 2 }
      )

      await sendEmailsToRecipients(
        recipients.map((r) => ({ email: r.userEmail, name: r.userName })),
        async (recipient) => {
          const html = await render(
            InvoiceUnpaidEmail({
              recipientName: recipient.name ?? 'there',
              invoiceNumber: invoice.invoiceNumber,
              projectName,
              markedByName: orgMember.user.name ?? 'there',
              totalAmount: totalFormatted,
              currency: invoice.currency,
              orgSlug: orgSlug ?? '',
              projectSlug,
              invoiceId: invoice.id,
            })
          )
          return {
            to: recipient.email,
            subject: `Invoice ${invoice.invoiceNumber} marked as unpaid`,
            html,
          }
        }
      )
    }
  }

  return { success: true }
}

export const invoicesService = {
  listByProject,
  listByProjectIds,
  getById,
  getRecipients,
  getItems,
  getLinkedRequirements,
  getConversionRates,
  getNextSequence,
  create,
  update,
  send,
  markPaid,
  remove,
  createThread,
  replyToThread,
  resolveThread,
  changeStatus,
}
