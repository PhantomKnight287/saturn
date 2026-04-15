import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { getOrganizationBillingStatus } from '@/cache/billing'
import { auth } from '@/server/auth'
import type { statements } from '@/server/auth/permissions'

type Statements = typeof statements
export type RequiredPermissions = {
  [R in keyof Statements]?: readonly Statements[R][number][]
}

export interface VerifiedApiKey {
  id: string
  metadata: Record<string, unknown>
  organizationId: string
}

const ACTIVE_STATUSES = new Set(['active', 'trialing'])

export function throwHttp(
  status: 401 | 402 | 403 | 404 | 409 | 429,
  message: string,
  headers?: Record<string, string>
): never {
  throw new HTTPException(status, {
    message,
    res: headers
      ? new Response(JSON.stringify({ message }), {
          status,
          headers: { 'content-type': 'application/json', ...headers },
        })
      : undefined,
  })
}

interface RateLimitInfo {
  lastRequest?: Date | string | null
  rateLimitEnabled?: boolean | null
  rateLimitMax?: number | null
  rateLimitTimeWindow?: number | null
  requestCount?: number | null
}

function computeRateLimitHeaders(
  key: RateLimitInfo
): Record<string, string> | null {
  if (key.rateLimitEnabled === false) {
    return null
  }
  const limit = key.rateLimitMax
  const window = key.rateLimitTimeWindow
  if (!(limit && window)) {
    return null
  }
  const used = key.requestCount ?? 0
  const remaining = Math.max(0, limit - used)
  const lastRequestMs = key.lastRequest
    ? new Date(key.lastRequest).getTime()
    : Date.now()
  const resetSeconds = Math.max(
    0,
    Math.ceil((lastRequestMs + window - Date.now()) / 1000)
  )
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(resetSeconds),
  }
}

function readStoredPermissions(
  metadata: Record<string, unknown>
): Record<string, string[]> {
  const perms = metadata.permissions
  if (!perms || typeof perms !== 'object') {
    return {}
  }
  return perms as Record<string, string[]>
}

function assertPermissions(
  stored: Record<string, string[]>,
  required: RequiredPermissions
) {
  for (const [resource, actions] of Object.entries(required)) {
    if (!actions || actions.length === 0) {
      continue
    }
    const granted = stored[resource] ?? []
    for (const action of actions) {
      if (!granted.includes(action)) {
        throwHttp(403, `Missing permission: ${resource}.${action as string}`)
      }
    }
  }
}

export async function requireApiKey(
  c: Context,
  permissions?: RequiredPermissions
): Promise<VerifiedApiKey> {
  const key = c.req.header('x-api-key')
  if (!key) {
    throwHttp(401, 'API key is required')
  }

  const result = await auth.api.verifyApiKey({
    body: { key },
    headers: c.req.raw.headers,
  })

  if (!(result.valid && result.key)) {
    const code = result.error?.code
    if (code === 'RATE_LIMIT_EXCEEDED') {
      throwHttp(429, 'Rate limit exceeded')
    }
    if (code === 'USAGE_EXCEEDED') {
      throwHttp(429, 'API key usage limit reached')
    }
    if (code === 'KEY_EXPIRED') {
      throwHttp(401, 'API key has expired')
    }
    if (code === 'KEY_DISABLED') {
      throwHttp(401, 'API key is disabled')
    }
    throwHttp(401, 'Invalid API key')
  }

  const rateLimitHeaders = computeRateLimitHeaders(result.key as RateLimitInfo)
  if (rateLimitHeaders) {
    for (const [name, value] of Object.entries(rateLimitHeaders)) {
      c.header(name, value)
    }
  }

  const organizationId = result.key.referenceId
  if (!organizationId) {
    throwHttp(401, 'API key is not linked to an organization')
  }

  const metadata = (result.key.metadata ?? {}) as Record<string, unknown>

  if (permissions) {
    assertPermissions(readStoredPermissions(metadata), permissions)
  }

  const billing = await getOrganizationBillingStatus(organizationId)
  const hasActiveSubscription = billing.result.items.some((sub) =>
    ACTIVE_STATUSES.has(sub.status)
  )
  if (!hasActiveSubscription) {
    throwHttp(402, 'Organization does not have an active Pro subscription')
  }

  return { id: result.key.id, organizationId, metadata }
}
