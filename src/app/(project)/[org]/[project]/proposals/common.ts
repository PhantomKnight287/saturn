import z from 'zod'

export const proposalDeliverableSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.string().min(1),
  unitPrice: z.string().min(1),
  amount: z.string().min(1),
})

export const createProposalSchema = z.object({
  projectId: z.string().min(1),
  orgSlug: z.string().min(1),
  projectSlug: z.string().min(1),
  title: z.string().min(1, 'Title is required'),
  body: z.string().optional(),
  terms: z.string().optional(),
  validUntil: z.string().optional(),
  currency: z.string().default('USD'),
  deliverables: z.array(proposalDeliverableSchema).optional(),
})

export const updateProposalSchema = z.object({
  proposalId: z.string().min(1),
  projectId: z.string().min(1),
  orgSlug: z.string().min(1),
  projectSlug: z.string().min(1),
  title: z.string().min(1, 'Title is required'),
  body: z.string().optional(),
  terms: z.string().optional(),
  validUntil: z.string().optional(),
  currency: z.string().optional(),
  deliverables: z.array(proposalDeliverableSchema).optional(),
})

export const sendProposalSchema = z.object({
  proposalId: z.string().min(1),
  projectId: z.string().min(1),
  orgSlug: z.string().min(1),
  recipients: z
    .array(z.string().min(1))
    .min(1, 'At least one recipient is required'),
})

export const signProposalSchema = z.object({
  proposalId: z.string().min(1),
  projectId: z.string().min(1),
  orgSlug: z.string().min(1),
  mediaId: z.string().min(1),
})

export const declineProposalSchema = z.object({
  proposalId: z.string().min(1),
  projectId: z.string().min(1),
  orgSlug: z.string().min(1),
  reason: z.string().optional(),
})

export const addThreadSchema = z.object({
  proposalId: z.string().min(1),
  projectId: z.string().min(1),
  orgSlug: z.string().min(1),
  selectedText: z.string().min(1, 'Selected text is required'),
  threadBody: z.string().min(1, 'Comment body is required'),
})

export const addReplySchema = z.object({
  threadId: z.string().min(1),
  proposalId: z.string().min(1),
  projectId: z.string().min(1),
  orgSlug: z.string().min(1),
  replyBody: z.string().min(1, 'Reply body is required'),
})

export const deleteProposalSchema = z.object({
  proposalId: z.string().min(1),
  projectId: z.string().min(1),
  orgSlug: z.string().min(1),
})

export const proposalFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().optional(),
  terms: z.string().optional(),
  validUntil: z.string().optional(),
  currency: z.string().default('USD'),
  deliverables: z.array(proposalDeliverableSchema).optional(),
})
