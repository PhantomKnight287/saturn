import type { app } from '@/api/app'
import { requireApiKey } from '@/api/auth'
import { ProjectEntity } from '@/api/entities'
import { errorResponse } from '@/api/schema'
import { db } from '@/server/db'
import { projects } from '@/server/db/schema'
import { createRoute, z } from '@hono/zod-openapi'
import { eq, getTableColumns } from 'drizzle-orm'

const route = createRoute({
  method: 'get',
  path: '/projects',
  responses: {
    401: { ...errorResponse, description: 'Invalid or missing API key' },
    402: {
      ...errorResponse,
      description: 'Organization is not on the Pro plan',
    },
    403: { ...errorResponse, description: 'Insufficient API key permissions' },
    429: { ...errorResponse, description: 'Rate limit exceeded' },
    200: {
      description: 'Organization projects',
      content: {
        'application/json': {
          schema: z.array(ProjectEntity),
        },
      },
    },
  },
  description: 'Get list of projects',
  summary: 'Get list of projects',
  tags: ['Projects'],
})

export const handler = (hono: typeof app) => {
  hono.openapi(route, async (c) => {
    const key = await requireApiKey(c, { project: ['read'] })
    const { organizationId, ...rest } = getTableColumns(projects)
    const orgProjects = await db
      .select({ ...rest })
      .from(projects)
      .where(eq(projects.organizationId, key.organizationId))
    return c.json(orgProjects, { status: 200 })
  })
}
