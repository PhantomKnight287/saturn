import z from 'zod'
import { billingFrequencyEnum } from '@/server/db/schema'

export const linkInvitationSchema = z.object({
  invitationId: z.string().min(1),
  projectId: z.string().min(1),
  type: z.enum(['member', 'client']),
})

export const removeMemberSchema = z.object({
  assignmentId: z.string().min(1),
  orgSlug: z.string().min(1),
  projectSlug: z.string().min(1),
})

export const removeClientSchema = z.object({
  assignmentId: z.string().min(1),
  orgSlug: z.string().min(1),
  projectSlug: z.string().min(1),
})

export const assignTeamSchema = z.object({
  projectId: z.string().min(1),
  teamId: z.string().min(1),
})

export const unassignTeamSchema = z.object({
  assignmentId: z.string().min(1),
  orgSlug: z.string().min(1),
  projectSlug: z.string().min(1),
})

export const addExistingMemberToProjectSchema = z.object({
  email: z.string().email(),
  projectId: z.string().min(1),
  organizationId: z.string().min(1),
  type: z.enum(['member', 'client']),
  payRate: z.number().int().nonnegative().optional(),
  payCurrency: z.string().min(1).optional(),
  payFrequency: z.enum(billingFrequencyEnum.enumValues).optional(),
  // Billing columns are optional and fall back to the pay values when omitted.
  billingRate: z.number().int().nonnegative().optional(),
  billingCurrency: z.string().min(1).optional(),
  billingFrequency: z.enum(billingFrequencyEnum.enumValues).optional(),
  setAsOrgDefault: z.boolean().optional(),
})
