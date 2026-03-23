import { headers } from 'next/headers'
import { createSafeActionClient } from 'next-safe-action'
import { getSession } from '@/server/auth'
import { roles } from '@/server/auth/permissions'
import { authClient } from './auth-client'

export const actionClient = createSafeActionClient({
  handleServerError(error) {
    return error.message
  },
})

export const authedActionClient = actionClient.use(async ({ next }) => {
  const session = await getSession()
  if (!session) {
    throw new Error('Not authenticated')
  }

  const member = await authClient.organization.getActiveMember({
    fetchOptions: { headers: await headers() },
  })

  if (!member.data) {
    throw new Error('Not an organization member')
  }

  const role = roles[member.data.role as keyof typeof roles]

  return next({
    ctx: {
      user: session.user,
      session: session.session,
      orgMember: member.data,
      role,
    },
  })
})
