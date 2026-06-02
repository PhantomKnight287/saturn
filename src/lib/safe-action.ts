import { headers } from 'next/headers'
import { createSafeActionClient } from 'next-safe-action'
import { z } from 'zod'
import { projectAccess } from '@/server/access/project-access'
import { getSession } from '@/server/auth'
import { roles } from '@/server/auth/permissions'
import { authClient } from './auth-client'

type RoleClient = (typeof roles)[keyof typeof roles]

export type AuthorizeArg = Parameters<RoleClient['authorize']>[0]

const handleServerError = (error: Error) => {
  console.error(error)
  return error.message
}

const resolveAuthCtx = async () => {
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

  return {
    user: session.user,
    session: session.session,
    orgMember: member.data,
    role: roles[member.data.role as keyof typeof roles],
  }
}

export const actionClient = createSafeActionClient({ handleServerError })

export const authedActionClient = actionClient.use(async ({ next }) =>
  next({ ctx: await resolveAuthCtx() })
)

/**
 * Base for org/project-scoped actions. Carries an optional `authorize` claim in
 * metadata that the scoped clients enforce, so actions don't hand-roll the
 * `role.authorize(...)` check.
 */
const scopedBase = createSafeActionClient({
  handleServerError,
  defineMetadataSchema: () =>
    z.object({ authorize: z.custom<AuthorizeArg>().optional() }),
})
  .use(async ({ next }) => next({ ctx: await resolveAuthCtx() }))
  .use(({ next, ctx, metadata }) => {
    if (metadata.authorize && !ctx.role.authorize(metadata.authorize).success) {
      throw new Error('You do not have permission to perform this action')
    }
    return next()
  })

/**
 * Actions scoped to an organization (no project). Enforces the declared
 * `authorize` claim against the caller's active membership, and — when the
 * input carries an `organizationId` — that it matches the caller's active org.
 */
export const orgScopedActionClient = scopedBase.use(
  ({ next, ctx, clientInput }) => {
    const organizationId = (
      clientInput as { organizationId?: unknown } | undefined
    )?.organizationId
    if (
      typeof organizationId === 'string' &&
      organizationId !== ctx.orgMember.organizationId
    ) {
      throw new Error('Organization mismatch')
    }
    return next()
  }
)

/**
 * Actions scoped to a single project. Reads `projectId` from the input,
 * verifies the project belongs to the caller's org and that they have
 * [[Project Access]], and injects the verified `project` row into `ctx`.
 * Every action built on this client must include `projectId` in its input.
 */
export const projectScopedActionClient = scopedBase.use(
  async ({ next, ctx, clientInput }) => {
    const projectId = (clientInput as { projectId?: unknown } | undefined)
      ?.projectId
    if (typeof projectId !== 'string' || projectId.length === 0) {
      throw new Error('projectId is required')
    }

    const project = await projectAccess.resolveById(
      projectId,
      ctx.orgMember.organizationId
    )
    if (!project) {
      throw new Error('Project not found')
    }

    const granted = await projectAccess.hasAccess(project, ctx.orgMember)
    if (!granted) {
      throw new Error('You do not have access to this project')
    }

    return next({ ctx: { project } })
  }
)
