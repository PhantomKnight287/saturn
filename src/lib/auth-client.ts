import { apiKeyClient } from '@better-auth/api-key/client'
import {
  inferAdditionalFields,
  lastLoginMethodClient,
  organizationClient,
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { toast } from 'sonner'

import type { auth } from '@/server/auth'
import {
  ac,
  adminRole,
  clientRole,
  memberRole,
  ownerRole,
} from '@/server/auth/permissions'
// import { env } from '@/env'

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),
    apiKeyClient(),
    lastLoginMethodClient(),
    organizationClient({
      teams: { enabled: true },
      ac,
      roles: {
        owner: ownerRole,
        admin: adminRole,
        member: memberRole,
        client: clientRole,
      },
    }),
  ],
  // baseURL: env.NEXT_PUBLIC_BASE_URL,
  fetchOptions: {
    onError(e) {
      if (e.error.status === 429) {
        toast.error('Too many requests. Please try again later.')
      }
    },
  },
})

export const signIn: typeof authClient.signIn = authClient.signIn
export const signOut: typeof authClient.signOut = authClient.signOut
export const useSession: typeof authClient.useSession = authClient.useSession

export type User = (typeof authClient.$Infer.Session)['user']
