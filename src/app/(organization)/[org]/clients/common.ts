import z from 'zod'

export const inviteClientSchema = z.object({
  email: z.string().email(),
  organizationId: z.string().min(1),
  projectId: z.string().min(1),
})

export const assignClientToProjectSchema = z.object({
  memberId: z.string().min(1),
  projectId: z.string().min(1),
})

export const removeClientFromProjectSchema = z.object({
  assignmentId: z.string().min(1),
})

export const removeClientFromOrgSchema = z.object({
  memberId: z.string().min(1),
})
