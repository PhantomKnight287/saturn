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
import { getAdminsAndOwners, sendEmailsToRecipients } from '@/lib/notifications'
import { authedActionClient } from '@/lib/safe-action'
import { db } from '@/server/db'
import {
  expenses,
  invoiceItems,
  invoiceRecipients,
  invoiceRequirements,
  invoices,
  members,
  threadMessages,
  threads,
  users,
} from '@/server/db/schema'
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
            issueDate: new Date(issueDate),
            dueDate: dueDate ? new Date(dueDate) : null,
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
          .returning()

        if (clientMemberIds?.length) {
          await tx.insert(invoiceRecipients).values(
            clientMemberIds.map((clientMemberId) => ({
              invoiceId: insertedInvoice!.id,
              clientMemberId,
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
            .update(expenses)
            .set({ invoiceId: insertedInvoice!.id })
            .where(inArray(expenses.id, expenseIds))
        }

        return insertedInvoice
      })

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
      if (existing.status !== 'draft') {
        throw new Error('Only draft invoices can be edited')
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
              issueDate: new Date(issueDate),
              dueDate: dueDate ? new Date(dueDate) : null,
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
                clientMemberId,
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
          if (expenseIds?.length) {
            // Replace linked expenses — clear old, set new
            await tx
              .update(expenses)
              .set({ invoiceId: null })
              .where(eq(expenses.invoiceId, invoiceId))

            await tx
              .update(expenses)
              .set({ invoiceId: insertedInvoice!.id })
              .where(inArray(expenses.id, expenseIds))
          }
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
          clientMemberIds.map((clientMemberId) => ({
            invoiceId,
            clientMemberId,
          }))
        )
        .onConflictDoNothing()

      // Load recipients for email
      const recipients = await db
        .select({
          memberId: invoiceRecipients.clientMemberId,
          userName: users.name,
          userEmail: users.email,
        })
        .from(invoiceRecipients)
        .innerJoin(members, eq(invoiceRecipients.clientMemberId, members.id))
        .innerJoin(users, eq(members.userId, users.id))
        .where(eq(invoiceRecipients.invoiceId, invoiceId))

      // Update status
      await db
        .update(invoices)
        .set({ status: 'sent' })
        .where(eq(invoices.id, invoiceId))

      const { projectName, projectSlug, orgSlug } =
        await projectsService.getProjectDetails(invoice.projectId)

      const formatDateLong = (d: Date) =>
        d.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })

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

      if (clientOff) {
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
          .select({ memberId: invoiceRecipients.clientMemberId })
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
      const paidAt = new Date().toLocaleDateString('en-US', {
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
        .select({ status: invoices.status, projectId: invoices.projectId })
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
      if (invoice.status !== 'draft') {
        throw new Error('Only draft invoices can be deleted')
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
            memberId: invoiceRecipients.clientMemberId,
            userName: users.name,
            userEmail: users.email,
          })
          .from(invoiceRecipients)
          .innerJoin(members, eq(invoiceRecipients.clientMemberId, members.id))
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
