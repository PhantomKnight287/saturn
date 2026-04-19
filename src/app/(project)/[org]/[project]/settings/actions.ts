'use server'

import { and, eq } from 'drizzle-orm'
import { authedActionClient } from '@/lib/safe-action'
import { db } from '@/server/db'
import { settings as settingsTable } from '@/server/db/schema'
import { projects } from '@/server/db/schema/project'
import {
  deleteProjectSchema,
  renameProjectSchema,
  updateProjectStatusSchema,
  updateProjectTimesheetDefaultsSchema,
} from './common'

export const renameProjectAction = authedActionClient
  .inputSchema(renameProjectSchema)
  .action(
    async ({
      parsedInput: { projectId, organizationId, name, slug },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error('You do not have permission to update project settings')
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      await db
        .update(projects)
        .set({ name, slug })
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )

      return { success: true, slug }
    }
  )

export const updateProjectTimesheetDefaultsAction = authedActionClient
  .inputSchema(updateProjectTimesheetDefaultsSchema)
  .action(
    async ({
      parsedInput: {
        organizationId,
        projectId,
        defaultMemberRate,
        defaultCurrency,
        defaultTimesheetDuration,
      },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error('You do not have permission to update project settings')
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      await db
        .insert(settingsTable)
        .values({
          organizationId,
          projectId,
          defaultMemberRate,
          defaultCurrency,
          defaultTimesheetDuration,
        })
        .onConflictDoUpdate({
          target: [settingsTable.organizationId, settingsTable.projectId],
          set: {
            defaultMemberRate,
            defaultCurrency,
            defaultTimesheetDuration,
          },
        })

      return { success: true }
    }
  )

export const updateProjectStatusAction = authedActionClient
  .inputSchema(updateProjectStatusSchema)
  .action(
    async ({
      parsedInput: { projectId, organizationId, status },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['update'] }).success) {
        throw new Error('You do not have permission to update project status')
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      await db
        .update(projects)
        .set({ status })
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )

      return { success: true, status }
    }
  )

export const deleteProjectAction = authedActionClient
  .inputSchema(deleteProjectSchema)
  .action(
    async ({
      parsedInput: { projectId, organizationId, confirmName },
      ctx: { role, orgMember },
    }) => {
      if (!role.authorize({ organization: ['delete'] }).success) {
        throw new Error('You do not have permission to delete this project')
      }

      if (orgMember.organizationId !== organizationId) {
        throw new Error('Organization mismatch')
      }

      const [project] = await db
        .select({ name: projects.name })
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )

      if (!project) {
        throw new Error('Project not found')
      }

      if (project.name !== confirmName) {
        throw new Error('Project name does not match')
      }

      await db
        .delete(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )

      return { success: true }
    }
  )
