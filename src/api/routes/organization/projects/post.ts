import { createRoute, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import type { app } from '@/api/app'
import { requireApiKey, throwHttp } from '@/api/auth'
import { errorResponse } from '@/api/schema'
import { db } from '@/server/db'
import { projects, projectStatus } from '@/server/db/schema'
import { ProjectEntity } from '@/api/entities'

const bodySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  status: z.enum(projectStatus.enumValues).optional(),
  dueDate: z.coerce.date().optional(),
})

const route = createRoute({
  method: 'post',
  path: '/projects',
  tags: ['Projects'],
  summary: 'Create a project',
  description: 'Create a new project within the organization',
  request: {
    body: {
      content: {
        'application/json': {
          schema: bodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Created project',
      content: {
        'application/json': {
          schema: ProjectEntity,
        },
      },
    },
    400: { ...errorResponse, description: 'Invalid request body' },
    401: { ...errorResponse, description: 'Invalid or missing API key' },
    402: {
      ...errorResponse,
      description: 'Organization is not on the Pro plan',
    },
    403: { ...errorResponse, description: 'Insufficient API key permissions' },
    409: { ...errorResponse, description: 'Slug is already taken' },
    429: { ...errorResponse, description: 'Rate limit exceeded' },
  },
})

export const handler = (hono: typeof app) => {
  hono.openapi(route, async (c) => {
    const key = await requireApiKey(c, { project: ['create'] })
    const body = c.req.valid('json')

    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, body.slug))
    if (existing) {
      throwHttp(409, 'Slug is already taken')
    }

    const [project] = await db
      .insert(projects)
      .values({
        name: body.name,
        slug: body.slug,
        description: body.description,
        status: body.status,
        dueDate: body.dueDate,
        organizationId: key.organizationId,
      })
      .returning()
    if (!project) {
      throwHttp(500, 'Failed to create project')
    }
    return c.json(project, 201)
  })
}
