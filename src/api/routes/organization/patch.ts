import { createRoute, z } from '@hono/zod-openapi'
import { and, eq, isNull } from 'drizzle-orm'
import type { app } from '@/api/app'
import { requireApiKey, throwHttp } from '@/api/auth'
import { errorResponse, HEADERS_SCHEMA } from '@/api/schema'
import { db } from '@/server/db'
import { organizations, settings } from '@/server/db/schema'

const bodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    slug: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    settings: z
      .object({
        memberRate: z.number().int().min(0).optional(),
        currency: z.string().length(3).optional(),
        timesheetDuration: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
        invoiceNumberTemplate: z.string().optional(),
        clientInvolvement: z
          .object({
            expenses: z.enum(['on', 'off']),
            invoices: z.enum(['on', 'off']),
            proposals: z.enum(['on', 'off']),
            milestones: z.enum(['on', 'off']),
            timesheets: z.enum(['on', 'off']),
            requirements: z.enum(['on', 'off']),
          })
          .optional(),
      })
      .optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.slug !== undefined ||
      (data.settings &&
        (data.settings.memberRate !== undefined ||
          data.settings.currency !== undefined ||
          data.settings.timesheetDuration !== undefined ||
          data.settings.invoiceNumberTemplate !== undefined ||
          data.settings.clientInvolvement !== undefined)),
    { message: 'At least one field must be provided' }
  )

const route = createRoute({
  method: 'patch',
  path: '/organization',
  tags: ['Organization'],
  summary: 'Update organization information',
  description: 'Update organization details and default settings',
  request: {
    headers: HEADERS_SCHEMA,
    body: {
      content: {
        'application/json': {
          schema: bodySchema,
        },
      },
    },
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
              memberRate: z.number(),
              currency: z.string(),
              timesheetDuration: z.enum(['weekly', 'biweekly', 'monthly']),
              invoiceNumberTemplate: z.string().nullable(),
              clientInvolvement: z
                .object({
                  expenses: z.enum(['on', 'off']),
                  invoices: z.enum(['on', 'off']),
                  proposals: z.enum(['on', 'off']),
                  milestones: z.enum(['on', 'off']),
                  timesheets: z.enum(['on', 'off']),
                  requirements: z.enum(['on', 'off']),
                })
                .nullable(),
            }),
          }),
        },
      },
      description: 'Updated organization information',
    },
    400: { ...errorResponse, description: 'Invalid request body' },
    401: { ...errorResponse, description: 'Invalid or missing API key' },
    402: {
      ...errorResponse,
      description: 'Organization is not on the Pro plan',
    },
    403: { ...errorResponse, description: 'Insufficient API key permissions' },
    404: { ...errorResponse, description: 'Organization not found' },
    409: { ...errorResponse, description: 'Slug is already taken' },
    429: { ...errorResponse, description: 'Rate limit exceeded' },
  },
})

export const handler = (hono: typeof app) => {
  hono.openapi(route, async (c) => {
    const key = await requireApiKey(c, { organization: ['update'] })
    const body = c.req.valid('json')

    await db.transaction(async (tx) => {
      const orgUpdate: Partial<typeof organizations.$inferInsert> = {}
      if (body.name !== undefined) {
        orgUpdate.name = body.name
      }
      if (body.slug !== undefined) {
        orgUpdate.slug = body.slug
      }
      if (Object.keys(orgUpdate).length > 0) {
        if (body.slug !== undefined) {
          const [existing] = await tx
            .select({ id: organizations.id })
            .from(organizations)
            .where(eq(organizations.slug, body.slug))
          if (existing && existing.id !== key.organizationId) {
            throwHttp(409, 'Slug is already taken')
          }
        }
        await tx
          .update(organizations)
          .set(orgUpdate)
          .where(eq(organizations.id, key.organizationId))
      }

      if (body.settings) {
        const settingsUpdate: Partial<typeof settings.$inferInsert> = {}
        if (body.settings.memberRate !== undefined) {
          settingsUpdate.memberRate = body.settings.memberRate
        }
        if (body.settings.currency !== undefined) {
          settingsUpdate.currency = body.settings.currency
        }
        if (body.settings.timesheetDuration !== undefined) {
          settingsUpdate.timesheetDuration = body.settings.timesheetDuration
        }
        if (body.settings.invoiceNumberTemplate !== undefined) {
          settingsUpdate.invoiceNumberTemplate =
            body.settings.invoiceNumberTemplate
        }
        if (body.settings.clientInvolvement !== undefined) {
          settingsUpdate.clientInvolvement = body.settings.clientInvolvement
        }
        if (Object.keys(settingsUpdate).length > 0) {
          const [existing] = await tx
            .select({ id: settings.id })
            .from(settings)
            .where(
              and(
                eq(settings.organizationId, key.organizationId),
                isNull(settings.projectId)
              )
            )
          if (existing) {
            await tx
              .update(settings)
              .set(settingsUpdate)
              .where(eq(settings.id, existing.id))
          } else {
            await tx.insert(settings).values({
              organizationId: key.organizationId,
              ...settingsUpdate,
            })
          }
        }
      }
    })

    const [organization] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        defaultMemberRate: settings.memberRate,
        defaultCurrency: settings.currency,
        defaultTimesheetDuration: settings.timesheetDuration,
        invoiceNumberTemplate: settings.invoiceNumberTemplate,
        clientInvolvement: settings.clientInvolvement,
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
          memberRate: organization.defaultMemberRate ?? 0,
          currency: organization.defaultCurrency ?? 'USD',
          timesheetDuration: organization.defaultTimesheetDuration ?? 'weekly',
          invoiceNumberTemplate: organization.invoiceNumberTemplate,
          clientInvolvement: organization.clientInvolvement,
        },
      },
      200
    )
  })
}
