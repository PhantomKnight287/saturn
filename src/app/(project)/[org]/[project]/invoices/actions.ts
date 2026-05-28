'use server'

import { render } from '@react-email/render'
import { and, eq, inArray } from 'drizzle-orm'
import { authService } from '@/app/api/auth/service'
import { projectsService } from '@/app/api/projects/service'
import InvoiceDisputedEmail from '@/emails/templates/invoice-disputed'
import InvoicePaidEmail from '@/emails/templates/invoice-paid'
import InvoiceSentEmail from '@/emails/templates/invoice-sent'
import InvoiceUnpaidEmail from '@/emails/templates/invoice-unpaid'
import ThreadNewMessageEmail from '@/emails/templates/thread-new-message'
import { formatLocalDateOnly } from '@/lib/custom-fields'
import { getAdminsAndOwners, sendEmailsToRecipients } from '@/lib/notifications'
import { authedActionClient } from '@/lib/safe-action'
import { db } from '@/server/db'
import {
  expenses,
  invoiceExpenses,
  invoiceItems,
  invoiceRecipients,
  invoiceRequirements,
  invoices,
  members,
  threadMessages,
  threads,
  users,
} from '@/server/db/schema'
import { currencyConversionService } from '@/services/currency-conversion.service'
import {
  changeInvoiceStatusSchema,
  createInvoiceSchema,
  createInvoiceThreadSchema,
  deleteInvoiceSchema,
  markInvoicePaidSchema,
  replyToThreadSchema,
  resolveThreadSchema,
  sendInvoiceSchema,
  updateInvoiceSchema,
} from './common'

// Items track the rate that was applied at conversion time. Collapse the
// list down to one entry per source currency — if the same currency was
// converted at different rates (shouldn't happen, but defensively), the last
// one wins. Items without a rate (`manual` lines, or pre-metadata legacy
// items) contribute nothing.
function collectRatesFromItems(
  items: { sourceCurrency?: string; rateUsed?: number }[]
): Map<string, number> {
  const rates = new Map<string, number>()
  for (const item of items) {
    if (item.sourceCurrency && item.rateUsed) {
      rates.set(item.sourceCurrency, item.rateUsed)
    }
  }
  return rates
}

export const createInvoiceAction = authedActionClient
  .inputSchema(createInvoiceSchema)
  .action(
    async ({
      parsedInput: {
        projectId,
        clientMemberIds,
        invoiceNumber,
        issueDate,
        dueDate,
        notes,
        currency,
        items,
        requirementIds,
        expenseIds,
        senderLogo,
        senderSignature,
        senderName,
        senderAddress,
        senderCustomFields,
        clientName,
        clientAddress,
        clientCustomFields,
        paymentTerms,
        terms,
        discountLabel,
        discountAmount,
        recipientType,
      },
      ctx: { role, user, orgMember },
    }) => {
      if (!role.authorize({ invoice: ['create'] }).success) {
        throw new Error('You do not have permission to create invoices')
      }
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('You do not have access to this project')
      }

      if (recipientType === 'member' && clientMemberIds.length !== 1) {
        throw new Error(
          'Member invoices must have exactly one recipient member'
        )
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
              eq(expenses.projectId, projectId)
            )
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
            eq(invoices.invoiceNumber, invoiceNumber)
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
            invoiceNumber,
            issueDate: formatLocalDateOnly(issueDate),
            dueDate: dueDate ? formatLocalDateOnly(dueDate) : null,
            notes: notes || null,
            currency,
            totalAmount,
            senderLogo: senderLogo || null,
            senderSignature: senderSignature || null,
            senderName: senderName || null,
            senderAddress: senderAddress || null,
            senderCustomFields: senderCustomFields?.length
              ? senderCustomFields
              : null,
            clientName: clientName || null,
            clientAddress: clientAddress || null,
            clientCustomFields: clientCustomFields?.length
              ? clientCustomFields
              : null,
            paymentTerms: paymentTerms || null,
            terms: terms || null,
            discountLabel: discountLabel || null,
            discountAmount: discountAmount || null,
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

        // Link requirements
        if (requirementIds?.length) {
          await tx.insert(invoiceRequirements).values(
            requirementIds.map((requirementId) => ({
              invoiceId: insertedInvoice!.id,
              requirementId,
            }))
          )
        }

        // Link expenses
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

        // Snapshot the rates actually used to price the line items so any
        // future dispute can be settled against the same numbers — even if
        // live rates move. Source currency + rate are carried on each item
        // by the editor (see invoiceItemSchema), so we don't have to
        // re-derive them and risk capturing a different rate.
        const ratesUsed = collectRatesFromItems(items)
        await currencyConversionService.snapshotRates(
          tx,
          insertedInvoice!.id,
          ratesUsed,
          currency
        )

        return insertedInvoice
      })

      if (recipientType === 'member' && clientMemberIds?.length && invoice) {
        try {
          const recipients = await db
            .select({
              userName: users.name,
              userEmail: users.email,
            })
            .from(invoiceRecipients)
            .innerJoin(members, eq(invoiceRecipients.memberId, members.id))
            .innerJoin(users, eq(members.userId, users.id))
            .where(eq(invoiceRecipients.invoiceId, invoice.id))

          const { projectName, projectSlug, orgSlug } =
            await projectsService.getProjectDetails(projectId)

          const formatDateLong = (value: string) => {
            const [y, m, d] = value.split('-').map(Number)
            return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
          }

          await sendEmailsToRecipients(
            recipients.map((r) => ({ email: r.userEmail, name: r.userName })),
            async (recipient) => {
              const html = await render(
                InvoiceSentEmail({
                  recipientName: recipient.name ?? 'there',
                  invoiceNumber: invoice.invoiceNumber,
                  projectName,
                  senderName: user.name ?? 'there',
                  totalAmount: Number(invoice.totalAmount).toLocaleString(
                    'en-US',
                    { minimumFractionDigits: 2 }
                  ),
                  currency: invoice.currency,
                  issueDate: formatDateLong(invoice.issueDate),
                  dueDate: invoice.dueDate
                    ? formatDateLong(invoice.dueDate)
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
  )

export const updateInvoiceAction = authedActionClient
  .inputSchema(updateInvoiceSchema)
  .action(
    async ({
      parsedInput: {
        invoiceId,
        clientMemberIds,
        invoiceNumber,
        issueDate,
        dueDate,
        notes,
        currency,
        items,
        requirementIds,
        expenseIds,
        senderLogo,
        senderSignature,
        senderName,
        senderAddress,
        senderCustomFields,
        clientName,
        clientAddress,
        clientCustomFields,
        paymentTerms,
        terms,
        discountLabel,
        discountAmount,
      },
      ctx: { role, user, orgMember },
    }) => {
      if (!role.authorize({ invoice: ['update'] }).success) {
        throw new Error('You do not have permission to update invoices')
      }

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
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        existing.projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('Invoice not found')
      }
      const isMemberInvoice = existing.recipient === 'member'
      const editableStatuses: (typeof existing.status)[] = isMemberInvoice
        ? ['draft', 'sent', 'disputed']
        : ['draft']
      if (!editableStatuses.includes(existing.status)) {
        throw new Error('This invoice can no longer be edited')
      }

      if (isMemberInvoice && clientMemberIds.length !== 1) {
        throw new Error(
          'Member invoices must have exactly one recipient member'
        )
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
        const invoice = await db.transaction(async (tx) => {
          const [insertedInvoice] = await tx
            .update(invoices)
            .set({
              invoiceNumber,
              issueDate: formatLocalDateOnly(issueDate),
              dueDate: dueDate ? formatLocalDateOnly(dueDate) : null,
              notes: notes || null,
              currency,
              totalAmount,
              senderLogo: senderLogo || null,
              senderSignature: senderSignature || null,
              senderName: senderName || null,
              senderAddress: senderAddress || null,
              senderCustomFields: senderCustomFields?.length
                ? senderCustomFields
                : null,
              clientName: clientName || null,
              clientAddress: clientAddress || null,
              clientCustomFields: clientCustomFields?.length
                ? clientCustomFields
                : null,
              paymentTerms: paymentTerms || null,
              terms: terms || null,
              discountLabel: discountLabel || null,
              discountAmount: discountAmount || null,
            })
            .where(eq(invoices.id, invoiceId))
            .returning()

          if (clientMemberIds?.length) {
            await tx
              .delete(invoiceRecipients)
              .where(eq(invoiceRecipients.invoiceId, invoiceId))

            await tx.insert(invoiceRecipients).values(
              clientMemberIds.map((clientMemberId) => ({
                invoiceId: insertedInvoice!.id,
                memberId: clientMemberId,
              }))
            )
          }

          if (items?.length) {
            await tx
              .delete(invoiceItems)
              .where(eq(invoiceItems.invoiceId, invoiceId))

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
            // Replace linked requirements
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

          await currencyConversionService.snapshotRates(
            tx,
            invoiceId,
            collectRatesFromItems(items),
            currency
          )
        })

        return invoice
      } catch (error) {
        console.error(error)
        throw new Error('Failed to update invoice')
      }
    }
  )

export const sendInvoiceAction = authedActionClient
  .inputSchema(sendInvoiceSchema)
  .action(
    async ({
      parsedInput: { invoiceId, clientMemberIds },
      ctx: { role, user, orgMember },
    }) => {
      if (!role.authorize({ invoice: ['send'] }).success) {
        throw new Error('You do not have permission to send invoices')
      }

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
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        invoice.projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('Invoice not found')
      }
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

      // Check has items
      const items = await db
        .select({ id: invoiceItems.id })
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoiceId))

      if (items.length === 0) {
        throw new Error('Invoice must have at least one item')
      }

      // Upsert recipients from the selected clients
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

      // Load recipients for email
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

      // Update status
      await db
        .update(invoices)
        .set({ status: 'sent' })
        .where(eq(invoices.id, invoiceId))

      const { projectName, projectSlug, orgSlug } =
        await projectsService.getProjectDetails(invoice.projectId)

      const formatDateLong = (value: string) => {
        const [y, m, d] = value.split('-').map(Number)
        return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      }

      // Send email to all recipients
      await sendEmailsToRecipients(
        recipients.map((r) => ({ email: r.userEmail, name: r.userName })),
        async (recipient) => {
          const html = await render(
            InvoiceSentEmail({
              recipientName: recipient.name ?? 'there',
              invoiceNumber: invoice.invoiceNumber,
              projectName,
              senderName: user.name ?? 'there',
              totalAmount: Number(invoice.totalAmount).toLocaleString('en-US', {
                minimumFractionDigits: 2,
              }),
              currency: invoice.currency,
              issueDate: formatDateLong(invoice.issueDate),
              dueDate: invoice.dueDate
                ? formatDateLong(invoice.dueDate)
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
  )

export const markInvoicePaidAction = authedActionClient
  .inputSchema(markInvoicePaidSchema)
  .action(
    async ({ parsedInput: { invoiceId }, ctx: { orgMember, role, user } }) => {
      if (!role.authorize({ invoice: ['sign'] }).success) {
        throw new Error('You do not have permission to sign invoices')
      }

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
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        invoice.projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('Invoice not found')
      }

      const settings = await projectsService.getSettings(
        orgMember.organizationId,
        invoice.projectId
      )
      const clientOff = settings.clientInvolvement.invoices === 'off'
      const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'
      const isMemberInvoice = invoice.recipient === 'member'

      // Member invoices are internal: admins/owners can mark them paid
      // regardless of the project's clientInvolvement setting.
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
        const isRecipient = allRecipients.some(
          (r) => r.memberId === orgMember.id
        )
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

      const totalFormatted = Number(invoice.totalAmount).toLocaleString(
        'en-US',
        { minimumFractionDigits: 2 }
      )
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
            paidByName: user.name ?? 'there',
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
  )

export const deleteInvoiceAction = authedActionClient
  .inputSchema(deleteInvoiceSchema)
  .action(
    async ({ parsedInput: { invoiceId }, ctx: { role, user, orgMember } }) => {
      if (!role.authorize({ invoice: ['delete'] }).success) {
        throw new Error('You do not have permission to delete invoices')
      }

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
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        invoice.projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('Invoice not found')
      }
      const deletableStatuses: (typeof invoice.status)[] =
        invoice.recipient === 'member'
          ? ['draft', 'sent', 'disputed']
          : ['draft']
      if (!deletableStatuses.includes(invoice.status)) {
        throw new Error('This invoice can no longer be deleted')
      }

      await db.delete(invoices).where(eq(invoices.id, invoiceId))

      return { success: true }
    }
  )

// ── Invoice Threads ──

export const createInvoiceThreadAction = authedActionClient
  .inputSchema(createInvoiceThreadSchema)
  .action(
    async ({
      parsedInput: { invoiceId, body },
      ctx: { role, orgMember, user },
    }) => {
      if (!role.authorize({ thread: ['create'] }).success) {
        throw new Error('You do not have permission to create threads')
      }

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
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        invoice.projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('Invoice not found')
      }
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
        throw new Error(
          'Threads can only be created on sent or disputed invoices'
        )
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

        // Set invoice to disputed if it was sent
        if (invoice.status === 'sent') {
          await tx
            .update(invoices)
            .set({ status: 'disputed' })
            .where(eq(invoices.id, invoiceId))
        }

        return t
      })

      // Notify admins/owners about the dispute
      const { projectName, projectSlug, orgSlug } =
        await projectsService.getProjectDetails(invoice.projectId)

      const admins = await getAdminsAndOwners(orgMember.organizationId)

      const totalFormatted = Number(invoice.totalAmount).toLocaleString(
        'en-US',
        { minimumFractionDigits: 2 }
      )

      await sendEmailsToRecipients(admins, async (admin) => {
        const html = await render(
          InvoiceDisputedEmail({
            recipientName: admin.name ?? 'there',
            invoiceNumber: invoice.invoiceNumber,
            projectName,
            disputedByName: user.name ?? 'there',
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
  )

export const replyToThreadAction = authedActionClient
  .inputSchema(replyToThreadSchema)
  .action(
    async ({
      parsedInput: { threadId, body },
      ctx: { role, orgMember, user },
    }) => {
      if (!role.authorize({ thread: ['read'] }).success) {
        throw new Error('You do not have permission to reply to threads')
      }

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
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        inv.projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('Thread not found')
      }

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

      // Notify other thread participants
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
              senderName: user.name ?? 'there',
              threadTitle: thread.selectedText,
              messagePreview:
                body.length > 200 ? `${body.slice(0, 200)}...` : body,
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
            subject: `Re: ${thread.selectedText} — ${user.name ?? 'Someone'} replied`,
            html,
          }
        })
      }

      return message
    }
  )

export const resolveThreadAction = authedActionClient
  .inputSchema(resolveThreadSchema)
  .action(
    async ({ parsedInput: { threadId }, ctx: { role, user, orgMember } }) => {
      if (!role.authorize({ thread: ['resolve'] }).success) {
        throw new Error('You do not have permission to resolve threads')
      }

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
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        inv.projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('Thread not found')
      }

      await db
        .update(threads)
        .set({ status: 'resolved' })
        .where(eq(threads.id, threadId))

      // If no more open threads remain, revert invoice to sent
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
  )

// ── Change Invoice Status (admin/owner) ──

export const changeInvoiceStatusAction = authedActionClient
  .inputSchema(changeInvoiceStatusSchema)
  .action(
    async ({
      parsedInput: { invoiceId, status },
      ctx: { role, user, orgMember },
    }) => {
      if (!role.authorize({ invoice: ['update'] }).success) {
        throw new Error('You do not have permission to change invoice status')
      }

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

      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        invoice.projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('Invoice not found')
      }

      await db
        .update(invoices)
        .set({ status })
        .where(eq(invoices.id, invoiceId))

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
                  markedByName: user.name ?? 'there',
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
  )
