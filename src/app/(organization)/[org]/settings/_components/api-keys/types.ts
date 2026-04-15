import type { authClient } from '@/lib/auth-client'

export type ApiKey = NonNullable<
  Awaited<ReturnType<typeof authClient.apiKey.list>>['data']
>['apiKeys'][number]

export interface CreatedApiKey {
  name: string
  value: string
}
