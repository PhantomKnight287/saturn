import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/server/db'
import {
  milestoneRequirements,
  milestones,
  requirements,
} from '@/server/db/schema'

const listByProject = async (projectId: string) => {
  return await db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(asc(milestones.sortOrder), asc(milestones.createdAt))
}

const getById = async (milestoneId: string, projectId: string) => {
  const [milestone] = await db
    .select()
    .from(milestones)
    .where(
      and(eq(milestones.id, milestoneId), eq(milestones.projectId, projectId))
    )

  return milestone ?? null
}

const getLinkedRequirements = async (milestoneId: string) => {
  return await db
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
}

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

export const milestonesService = {
  listByProject,
  listByProjectIds,
  listByProjectWithProgress,
  getById,
  getLinkedRequirements,
  getProgress,
}
