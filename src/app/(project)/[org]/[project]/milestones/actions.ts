'use server'

import { and, eq } from 'drizzle-orm'
import { formatLocalDateOnly } from '@/lib/custom-fields'
import {
  orgScopedActionClient,
  projectScopedActionClient,
} from '@/lib/safe-action'
import { projectAccess } from '@/server/access/project-access'
import { db } from '@/server/db'
import {
  milestoneRequirements,
  milestones,
  requirements,
} from '@/server/db/schema'
import type { Role } from '@/types'
import {
  completeMilestoneSchema,
  createMilestoneSchema,
  deleteMilestoneSchema,
  linkRequirementSchema,
  reorderMilestonesSchema,
  unlinkRequirementSchema,
  updateMilestoneSchema,
} from './common'

export const createMilestoneAction = projectScopedActionClient
  .metadata({ authorize: { milestone: ['create'] } })
  .inputSchema(createMilestoneSchema)
  .action(
    async ({
      parsedInput: {
        projectId,
        name,
        description,
        dueDate,
        budgetMinutes,
        budgetAmountCents,
        currency,
      },
    }) => {
      // Get the next sort order
      const existing = await db
        .select({ sortOrder: milestones.sortOrder })
        .from(milestones)
        .where(eq(milestones.projectId, projectId))
        .orderBy(milestones.sortOrder)

      const nextSortOrder =
        existing.length > 0
          ? Math.max(...existing.map((m) => m.sortOrder)) + 1
          : 0

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
  )

export const updateMilestoneAction = orgScopedActionClient
  .metadata({ authorize: { milestone: ['update'] } })
  .inputSchema(updateMilestoneSchema)
  .action(
    async ({
      parsedInput: {
        milestoneId,
        name,
        description,
        dueDate,
        status,
        blockReason,
        budgetMinutes,
        budgetAmountCents,
      },
      ctx: { orgMember },
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
      const granted = await projectAccess.check(
        existing.projectId,
        orgMember.organizationId,
        {
          id: orgMember.id,
          userId: orgMember.userId,
          role: orgMember.role as Role,
        }
      )
      if (!granted) {
        throw new Error('Milestone not found')
      }

      // If setting to blocked, require a block reason
      if (status === 'blocked' && !blockReason && !existing.blockReason) {
        throw new Error(
          'Block reason is required when setting status to blocked'
        )
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

      // Clear block reason when moving away from blocked
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
  )

export const deleteMilestoneAction = orgScopedActionClient
  .metadata({ authorize: { milestone: ['delete'] } })
  .inputSchema(deleteMilestoneSchema)
  .action(async ({ parsedInput: { milestoneId }, ctx: { orgMember } }) => {
    const existing = await db
      .select({ id: milestones.id, projectId: milestones.projectId })
      .from(milestones)
      .where(eq(milestones.id, milestoneId))
      .then((r) => r[0])

    if (!existing) {
      throw new Error('Milestone not found')
    }
    const granted = await projectAccess.check(
      existing.projectId,
      orgMember.organizationId,
      {
        id: orgMember.id,
        userId: orgMember.userId,
        role: orgMember.role as Role,
      }
    )
    if (!granted) {
      throw new Error('Milestone not found')
    }

    await db.delete(milestones).where(eq(milestones.id, milestoneId))

    return { success: true }
  })

export const completeMilestoneAction = orgScopedActionClient
  .metadata({ authorize: { milestone: ['complete'] } })
  .inputSchema(completeMilestoneSchema)
  .action(async ({ parsedInput: { milestoneId }, ctx: { orgMember } }) => {
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
    const granted = await projectAccess.check(
      existing.projectId,
      orgMember.organizationId,
      {
        id: orgMember.id,
        userId: orgMember.userId,
        role: orgMember.role as Role,
      }
    )
    if (!granted) {
      throw new Error('Milestone not found')
    }
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
  })

export const reorderMilestonesAction = projectScopedActionClient
  .metadata({ authorize: { milestone: ['update'] } })
  .inputSchema(reorderMilestonesSchema)
  .action(async ({ parsedInput: { projectId, orderedIds } }) => {
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
  })

export const linkRequirementAction = orgScopedActionClient
  .metadata({ authorize: { milestone: ['update'] } })
  .inputSchema(linkRequirementSchema)
  .action(
    async ({
      parsedInput: { milestoneId, requirementId },
      ctx: { orgMember },
    }) => {
      const milestone = await db
        .select({ id: milestones.id, projectId: milestones.projectId })
        .from(milestones)
        .where(eq(milestones.id, milestoneId))
        .then((r) => r[0])

      if (!milestone) {
        throw new Error('Milestone not found')
      }
      const granted = await projectAccess.check(
        milestone.projectId,
        orgMember.organizationId,
        {
          id: orgMember.id,
          userId: orgMember.userId,
          role: orgMember.role as Role,
        }
      )
      if (!granted) {
        throw new Error('Milestone not found')
      }

      // Verify requirement exists and belongs to same project
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

      // Get the next sort order within this milestone
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
  )

export const unlinkRequirementAction = orgScopedActionClient
  .metadata({ authorize: { milestone: ['update'] } })
  .inputSchema(unlinkRequirementSchema)
  .action(
    async ({
      parsedInput: { milestoneId, requirementId },
      ctx: { orgMember },
    }) => {
      const [milestone] = await db
        .select({ projectId: milestones.projectId })
        .from(milestones)
        .where(eq(milestones.id, milestoneId))
      if (!milestone) {
        throw new Error('Milestone not found')
      }
      const granted = await projectAccess.check(
        milestone.projectId,
        orgMember.organizationId,
        {
          id: orgMember.id,
          userId: orgMember.userId,
          role: orgMember.role as Role,
        }
      )
      if (!granted) {
        throw new Error('Milestone not found')
      }

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
  )
