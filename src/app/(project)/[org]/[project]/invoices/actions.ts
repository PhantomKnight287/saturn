'use server'

import { invoicesService } from '@/app/api/invoices/service'
import {
  orgScopedActionClient,
  projectScopedActionClient,
} from '@/lib/safe-action'
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

export const createInvoiceAction = projectScopedActionClient
  .metadata({ authorize: { invoice: ['create'] } })
  .inputSchema(createInvoiceSchema)
  .action(({ parsedInput, ctx: { orgMember, project } }) => {
    const { projectId: _projectId, recipientType, ...details } = parsedInput
    return invoicesService.create({
      project,
      orgMember,
      recipientType,
      details,
    })
  })

export const updateInvoiceAction = orgScopedActionClient
  .metadata({ authorize: { invoice: ['update'] } })
  .inputSchema(updateInvoiceSchema)
  .action(({ parsedInput, ctx: { orgMember } }) => {
    const { invoiceId, ...details } = parsedInput
    return invoicesService.update({ invoiceId, orgMember, details })
  })

export const sendInvoiceAction = orgScopedActionClient
  .metadata({ authorize: { invoice: ['send'] } })
  .inputSchema(sendInvoiceSchema)
  .action(
    ({ parsedInput: { invoiceId, clientMemberIds }, ctx: { orgMember } }) =>
      invoicesService.send({ invoiceId, clientMemberIds, orgMember })
  )

export const markInvoicePaidAction = orgScopedActionClient
  .metadata({ authorize: { invoice: ['sign'] } })
  .inputSchema(markInvoicePaidSchema)
  .action(({ parsedInput: { invoiceId }, ctx: { orgMember } }) =>
    invoicesService.markPaid({ invoiceId, orgMember })
  )

export const deleteInvoiceAction = orgScopedActionClient
  .metadata({ authorize: { invoice: ['delete'] } })
  .inputSchema(deleteInvoiceSchema)
  .action(({ parsedInput: { invoiceId }, ctx: { orgMember } }) =>
    invoicesService.remove({ invoiceId, orgMember })
  )

export const createInvoiceThreadAction = orgScopedActionClient
  .metadata({ authorize: { thread: ['create'] } })
  .inputSchema(createInvoiceThreadSchema)
  .action(({ parsedInput: { invoiceId, body }, ctx: { orgMember } }) =>
    invoicesService.createThread({ invoiceId, body, orgMember })
  )

export const replyToThreadAction = orgScopedActionClient
  .metadata({ authorize: { thread: ['read'] } })
  .inputSchema(replyToThreadSchema)
  .action(({ parsedInput: { threadId, body }, ctx: { orgMember } }) =>
    invoicesService.replyToThread({ threadId, body, orgMember })
  )

export const resolveThreadAction = orgScopedActionClient
  .metadata({ authorize: { thread: ['resolve'] } })
  .inputSchema(resolveThreadSchema)
  .action(({ parsedInput: { threadId }, ctx: { orgMember } }) =>
    invoicesService.resolveThread({ threadId, orgMember })
  )

export const changeInvoiceStatusAction = orgScopedActionClient
  .metadata({ authorize: { invoice: ['update'] } })
  .inputSchema(changeInvoiceStatusSchema)
  .action(({ parsedInput: { invoiceId, status }, ctx: { orgMember } }) =>
    invoicesService.changeStatus({ invoiceId, status, orgMember })
  )
