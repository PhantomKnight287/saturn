import z from 'zod'

export const inviteOrgMemberSchema = z.object({
  organizationId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['member', 'admin']),
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
