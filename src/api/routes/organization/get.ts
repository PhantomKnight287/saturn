import { createRoute, z } from '@hono/zod-openapi'
import { and, eq, isNull } from 'drizzle-orm'
import type { app } from '@/api/app'
import { requireApiKey, throwHttp } from '@/api/auth'
import { errorResponse, HEADERS_SCHEMA } from '@/api/schema'
import { db } from '@/server/db'
import { organizations, settings } from '@/server/db/schema'

const route = createRoute({
  method: 'get',
  path: '/organization',
  tags: ['Organization'],
  summary: 'Get organization information',
  description: 'Get organization information',
  request: {
    headers: HEADERS_SCHEMA,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            id: z.string(),
            name: z.string(),
            slug: z.string(),
            settings: z.object({
              memberRate: z.number().nullable(),
              currency: z.string().nullable(),
              timesheetDuration: z
                .enum(['weekly', 'biweekly', 'monthly'])
                .nullable(),
            }),
          }),
        },
      },
      description: 'Organization information',
    },
    401: { ...errorResponse, description: 'Invalid or missing API key' },
    402: {
      ...errorResponse,
      description: 'Organization is not on the Pro plan',
    },
    403: { ...errorResponse, description: 'Insufficient API key permissions' },
    429: { ...errorResponse, description: 'Rate limit exceeded' },
  },
})

export const handler = (hono: typeof app) => {
  hono.openapi(route, async (c) => {
    const key = await requireApiKey(c, { organization: ['read'] })
    const [organization] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        memberRate: settings.memberRate,
        currency: settings.currency,
        timesheetDuration: settings.timesheetDuration,
      })
      .from(organizations)
      .where(eq(organizations.id, key.organizationId))
      .leftJoin(
        settings,
        and(
          eq(settings.organizationId, organizations.id),
          isNull(settings.projectId)
        )
      )
    if (!organization) {
      throwHttp(404, 'No organization found')
    }
    return c.json(
      {
        id: key.organizationId,
        name: organization.name,
        slug: organization.slug,
        settings: {
          memberRate: organization?.memberRate,
          currency: organization?.currency,
          timesheetDuration: organization?.timesheetDuration,
        },
      },
      200
    )
  })
}
