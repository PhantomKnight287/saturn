import z from 'zod'
import { changeRequestStatusEnum } from '@/server/db/schema'

export const requirementFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string(),
})

export const createRequirementSchema = z.object({
  projectId: z.string().min(1),
  orgSlug: z.string().min(1),
  title: z.string().min(1, 'Title is required'),
  body: z.string().optional(),
})

export const updateRequirementSchema = createRequirementSchema.extend({
  requirementId: z.string().min(1),
})

export const sendForSignSchema = z.object({
  requirementId: z.string().min(1),
  projectId: z.string().min(1),
  orgSlug: z.string().min(1),
  recipients: z.array(z.string()).min(1),
})

export const createThreadSchema = z.object({
  requirementId: z.string().min(1),
  projectId: z.string().min(1),
  orgSlug: z.string().min(1),
  selectedText: z.string().min(1),
  threadBody: z.string().min(1),
})

export const requestChangesSchema = z.object({
  requirementId: z.string().min(1),
  projectId: z.string().min(1),
  orgSlug: z.string().min(1),
  description: z.string().optional(),
  referencedThreadIds: z.array(z.string()).optional(),
})

export const resolveChangeRequestSchema = z.object({
  changeRequestId: z.string().min(1),
  requirementId: z.string().min(1),
  projectId: z.string().min(1),
  orgSlug: z.string().min(1),
  resolution: z.enum(changeRequestStatusEnum.enumValues).exclude(['pending']),
})

export const signRequirementSchema = z.object({
  requirementId: z.string().min(1),
  projectId: z.string().min(1),
  orgSlug: z.string().min(1),
  mediaId: z.string().min(1),
})

export const addThreadReplySchema = z.object({
  threadId: z.string().min(1),
  projectId: z.string().min(1),
  requirementId: z.string().min(1),
  orgSlug: z.string().min(1),
  replyBody: z.string().min(1),
})
