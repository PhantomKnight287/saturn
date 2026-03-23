import z from 'zod'

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.string().min(1),
  unitPrice: z.string().min(1),
  amount: z.string().min(1),
})

const customFieldSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
})

const invoiceDetailsBase = z.object({
  clientMemberIds: z.array(z.string().min(1)).default([]),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  currency: z.string().min(1).default('USD'),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  requirementIds: z.array(z.string().min(1)).optional(),
  expenseIds: z.array(z.string().min(1)).optional(),
  // Sender (From) details
  senderLogo: z.string().optional(),
  senderSignature: z.string().optional(),
  senderName: z.string().optional(),
  senderAddress: z.string().optional(),
  senderCustomFields: z.array(customFieldSchema).optional(),
  // Client (To) details
  clientName: z.string().optional(),
  clientAddress: z.string().optional(),
  clientCustomFields: z.array(customFieldSchema).optional(),
  // Additional details
  paymentTerms: z.string().optional(),
  terms: z.string().optional(),
  // Discount
  discountLabel: z.string().optional(),
  discountAmount: z.string().optional(),
})

export const createInvoiceSchema = invoiceDetailsBase.extend({
  projectId: z.string().min(1),
})

export const updateInvoiceSchema = invoiceDetailsBase.extend({
  invoiceId: z.string().min(1),
})

export const sendInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  clientMemberIds: z.array(z.string().min(1)).min(1),
})

export const markInvoicePaidSchema = z.object({
  invoiceId: z.string().min(1),
})

export const deleteInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
})

export const extendInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
})

export const createInvoiceThreadSchema = z.object({
  invoiceId: z.string().min(1),
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Message is required'),
})

export const replyToThreadSchema = z.object({
  threadId: z.string().min(1),
  body: z.string().min(1, 'Message is required'),
})

export const resolveThreadSchema = z.object({
  threadId: z.string().min(1),
})

export const changeInvoiceStatusSchema = z.object({
  invoiceId: z.string().min(1),
  status: z.enum(['draft', 'sent', 'paid', 'disputed', 'cancelled']),
})

export const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  currency: z.string().min(1),
  issueDate: z.string().min(1),
  dueDate: z.string(),
  senderLogo: z.string().nullable(),
  senderSignature: z.string().nullable(),
  senderName: z.string(),
  senderAddress: z.string(),
  senderCustomFields: z.array(customFieldSchema),
  clientName: z.string(),
  clientAddress: z.string(),
  clientCustomFields: z.array(customFieldSchema),
  clientMemberIds: z.array(z.string()),
  items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.string(),
        unitPrice: z.string(),
        amount: z.string(),
      })
    )
    .min(1),
  expenseIds: z.array(z.string()),
  selectedRequirementIds: z.array(z.string()),
  paymentTerms: z.string(),
  notes: z.string(),
  terms: z.string(),
  discountLabel: z.string(),
  discountAmount: z.string(),
})
