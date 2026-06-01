import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { formatLocalDateOnly } from '@/lib/custom-fields'
import {
  type ActiveMember,
  projectAccess,
} from '@/server/access/project-access'
import { db } from '@/server/db'
import {
  milestoneRequirements,
  milestones,
  requirements,
} from '@/server/db/schema'

const listByProject = async (projectId: string) =>
  await db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(asc(milestones.sortOrder), asc(milestones.createdAt))

const getById = async (milestoneId: string, projectId: string) => {
  const [milestone] = await db
    .select()
    .from(milestones)
    .where(
      and(eq(milestones.id, milestoneId), eq(milestones.projectId, projectId))
    )

  return milestone ?? null
}

const getLinkedRequirements = async (milestoneId: string) =>
  await db
    .select({
      id: milestoneRequirements.id,
      milestoneId: milestoneRequirements.milestoneId,
      requirementId: milestoneRequirements.requirementId,
      sortOrder: milestoneRequirements.sortOrder,
      requirementTitle: requirements.title,
      requirementSlug: requirements.slug,
      requirementStatus: requirements.status,
    })
    .from(milestoneRequirements)
    .innerJoin(
      requirements,
      eq(milestoneRequirements.requirementId, requirements.id)
    )
    .where(eq(milestoneRequirements.milestoneId, milestoneId))
    .orderBy(asc(milestoneRequirements.sortOrder))

const getProgress = async (milestoneId: string) => {
  const rows = await db
    .select({
      status: requirements.status,
      count: sql<number>`count(*)::int`,
    })
    .from(milestoneRequirements)
    .innerJoin(
      requirements,
      eq(milestoneRequirements.requirementId, requirements.id)
    )
    .where(eq(milestoneRequirements.milestoneId, milestoneId))
    .groupBy(requirements.status)

  const result = {
    total: 0,
    signed: 0,
    draft: 0,
    changesRequested: 0,
    sentForSign: 0,
  }
  for (const row of rows) {
    result.total += row.count
    if (row.status === 'client_accepted') {
      result.signed = row.count
    } else if (row.status === 'draft') {
      result.draft = row.count
    } else if (row.status === 'changes_requested') {
      result.changesRequested = row.count
    } else if (row.status === 'submitted_to_client') {
      result.sentForSign = row.count
    }
  }
  return result
}

const listByProjectWithProgress = async (projectId: string) => {
  const milestoneList = await db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(asc(milestones.sortOrder), asc(milestones.createdAt))

  const withProgress = await Promise.all(
    milestoneList.map(async (ms) => {
      const rows = await db
        .select({
          status: requirements.status,
          count: sql<number>`count(*)::int`,
        })
        .from(milestoneRequirements)
        .innerJoin(
          requirements,
          eq(milestoneRequirements.requirementId, requirements.id)
        )
        .where(eq(milestoneRequirements.milestoneId, ms.id))
        .groupBy(requirements.status)

      const progress = { total: 0, signed: 0 }
      for (const row of rows) {
        progress.total += row.count
        if (row.status === 'client_accepted') {
          progress.signed = row.count
        }
      }

      return { ...ms, progress }
    })
  )

  return withProgress
}

const listByProjectIds = async (projectIds: string[]) => {
  if (projectIds.length === 0) {
    return []
  }

  return await db
    .select()
    .from(milestones)
    .where(inArray(milestones.projectId, projectIds))
}

const create = async ({
  projectId,
  name,
  description,
  dueDate,
  budgetMinutes,
  budgetAmountCents,
  currency,
}: {
  projectId: string
  name: string
  description?: string
  dueDate?: Date
  budgetMinutes?: number
  budgetAmountCents?: number
  currency: string
}) => {
  const existing = await db
    .select({ sortOrder: milestones.sortOrder })
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(milestones.sortOrder)

  const nextSortOrder =
    existing.length > 0 ? Math.max(...existing.map((m) => m.sortOrder)) + 1 : 0

  const [milestone] = await db
    .insert(milestones)
    .values({
      projectId,
      name,
      description,
      dueDate: dueDate ? formatLocalDateOnly(dueDate) : null,
      budgetMinutes,
      budgetAmountCents,
      sortOrder: nextSortOrder,
      currency,
    })
    .returning()

  return milestone
}

const update = async ({
  milestoneId,
  orgMember,
  name,
  description,
  dueDate,
  status,
  blockReason,
  budgetMinutes,
  budgetAmountCents,
}: {
  milestoneId: string
  orgMember: ActiveMember
  name?: string
  description?: string
  dueDate?: Date | null
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked'
  blockReason?: string
  budgetMinutes?: number | null
  budgetAmountCents?: number | null
}) => {
  const existing = await db
    .select({
      id: milestones.id,
      projectId: milestones.projectId,
      blockReason: milestones.blockReason,
    })
    .from(milestones)
    .where(eq(milestones.id, milestoneId))
    .then((r) => r[0])

  if (!existing) {
    throw new Error('Milestone not found')
  }
  await projectAccess.assert(
    existing.projectId,
    orgMember,
    'Milestone not found'
  )

  if (status === 'blocked' && !blockReason && !existing.blockReason) {
    throw new Error('Block reason is required when setting status to blocked')
  }

  const updates: Partial<typeof milestones.$inferInsert> = {}
  if (name !== undefined) {
    updates.name = name
  }
  if (description !== undefined) {
    updates.description = description
  }
  if (dueDate !== undefined) {
    updates.dueDate = dueDate ? formatLocalDateOnly(dueDate) : null
  }
  if (status !== undefined) {
    updates.status = status
  }
  if (blockReason !== undefined) {
    updates.blockReason = blockReason
  }
  if (budgetMinutes !== undefined) {
    updates.budgetMinutes = budgetMinutes
  }
  if (budgetAmountCents !== undefined) {
    updates.budgetAmountCents = budgetAmountCents
  }
  if (status && status !== 'blocked') {
    updates.blockReason = null
  }

  const [milestone] = await db
    .update(milestones)
    .set(updates)
    .where(eq(milestones.id, milestoneId))
    .returning()

  return milestone
}

const remove = async ({
  milestoneId,
  orgMember,
}: {
  milestoneId: string
  orgMember: ActiveMember
}) => {
  const existing = await db
    .select({ id: milestones.id, projectId: milestones.projectId })
    .from(milestones)
    .where(eq(milestones.id, milestoneId))
    .then((r) => r[0])

  if (!existing) {
    throw new Error('Milestone not found')
  }
  await projectAccess.assert(
    existing.projectId,
    orgMember,
    'Milestone not found'
  )

  await db.delete(milestones).where(eq(milestones.id, milestoneId))

  return { success: true }
}

const complete = async ({
  milestoneId,
  orgMember,
}: {
  milestoneId: string
  orgMember: ActiveMember
}) => {
  const existing = await db
    .select({
      id: milestones.id,
      projectId: milestones.projectId,
      status: milestones.status,
    })
    .from(milestones)
    .where(eq(milestones.id, milestoneId))
    .then((r) => r[0])

  if (!existing) {
    throw new Error('Milestone not found')
  }
  await projectAccess.assert(
    existing.projectId,
    orgMember,
    'Milestone not found'
  )
  if (existing.status === 'completed') {
    throw new Error('Milestone is already completed')
  }

  const [milestone] = await db
    .update(milestones)
    .set({
      status: 'completed',
      completedAt: new Date(),
      blockReason: null,
    })
    .where(eq(milestones.id, milestoneId))
    .returning()

  return milestone
}

const reorder = async ({
  projectId,
  orderedIds,
}: {
  projectId: string
  orderedIds: string[]
}) => {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(milestones)
        .set({ sortOrder: i })
        .where(
          and(
            eq(milestones.id, orderedIds[i]!),
            eq(milestones.projectId, projectId)
          )
        )
    }
  })

  return { success: true }
}

const linkRequirement = async ({
  milestoneId,
  requirementId,
  orgMember,
}: {
  milestoneId: string
  requirementId: string
  orgMember: ActiveMember
}) => {
  const milestone = await db
    .select({ id: milestones.id, projectId: milestones.projectId })
    .from(milestones)
    .where(eq(milestones.id, milestoneId))
    .then((r) => r[0])

  if (!milestone) {
    throw new Error('Milestone not found')
  }
  await projectAccess.assert(
    milestone.projectId,
    orgMember,
    'Milestone not found'
  )

  const requirement = await db
    .select({ id: requirements.id, projectId: requirements.projectId })
    .from(requirements)
    .where(eq(requirements.id, requirementId))
    .then((r) => r[0])

  if (!requirement) {
    throw new Error('Requirement not found')
  }
  if (requirement.projectId !== milestone.projectId) {
    throw new Error('Requirement does not belong to the same project')
  }

  const existingLinks = await db
    .select({ sortOrder: milestoneRequirements.sortOrder })
    .from(milestoneRequirements)
    .where(eq(milestoneRequirements.milestoneId, milestoneId))

  const nextSortOrder =
    existingLinks.length > 0
      ? Math.max(...existingLinks.map((l) => l.sortOrder)) + 1
      : 0

  const [link] = await db
    .insert(milestoneRequirements)
    .values({
      milestoneId,
      requirementId,
      sortOrder: nextSortOrder,
    })
    .returning()

  return link
}

const unlinkRequirement = async ({
  milestoneId,
  requirementId,
  orgMember,
}: {
  milestoneId: string
  requirementId: string
  orgMember: ActiveMember
}) => {
  const [milestone] = await db
    .select({ projectId: milestones.projectId })
    .from(milestones)
    .where(eq(milestones.id, milestoneId))
  if (!milestone) {
    throw new Error('Milestone not found')
  }
  await projectAccess.assert(
    milestone.projectId,
    orgMember,
    'Milestone not found'
  )

  await db
    .delete(milestoneRequirements)
    .where(
      and(
        eq(milestoneRequirements.milestoneId, milestoneId),
        eq(milestoneRequirements.requirementId, requirementId)
      )
    )

  return { success: true }
}

export const milestonesService = {
  listByProject,
  listByProjectIds,
  listByProjectWithProgress,
  getById,
  getLinkedRequirements,
  getProgress,
  create,
  update,
  remove,
  complete,
  reorder,
  linkRequirement,
  unlinkRequirement,
}
