import z from 'zod'
import { billingFrequencyEnum } from '@/server/db/schema'

export const inviteOrgMemberSchema = z.object({
  organizationId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['member', 'admin']),
  payRate: z.number().int().nonnegative().optional(),
  payCurrency: z.string().min(1).optional(),
  payFrequency: z.enum(billingFrequencyEnum.enumValues).optional(),
  // Billing columns are optional and fall back to the pay values when omitted.
  billingRate: z.number().int().nonnegative().optional(),
  billingCurrency: z.string().min(1).optional(),
  billingFrequency: z.enum(billingFrequencyEnum.enumValues).optional(),
  setAsOrgDefault: z.boolean().optional(),
})

export const removeOrgMemberSchema = z.object({
  memberId: z.string().min(1),
})

export const changeOrgMemberRoleSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(['member', 'admin', 'owner']),
})

export const createTeamSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1, 'Team name is required'),
})

export const renameTeamSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(1, 'Team name is required'),
})

export const deleteTeamSchema = z.object({
  teamId: z.string().min(1),
})

export const addTeamMemberSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
})

export const removeTeamMemberSchema = z.object({
  teamMemberId: z.string().min(1),
})
