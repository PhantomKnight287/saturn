import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/server/db'
import {
  organizations,
  projectClientAssignments,
  projectMemberAssignments,
  projects,
  projectTeamAssignments,
  settings as settingsTable,
  teamMembers,
} from '@/server/db/schema'

export const PROJECTS_CACHE_TAG = 'projects'

const SETTINGS_DEFAULTS = {
  currency: 'USD' as const,
  billingRate: null as number | null,
  billingCurrency: 'USD' as const,
  billingFrequency: 'hourly' as const,
  payRate: 0,
  payCurrency: 'USD' as const,
  payFrequency: 'hourly' as const,
  timesheetDuration: 'weekly' as const,
  invoiceTimeUnit: 'hours' as const,
  invoiceNumberTemplate: 'INV-%year(short)%month(num)-%seq(4)',
  clientInvolvement: {
    proposals: 'on',
    requirements: 'on',
    milestones: 'on',
    timesheets: 'on',
    expenses: 'on',
    invoices: 'on',
  } as const,
  invoiceFromName: null as string | null,
  invoiceFromAddress: null as string | null,
  invoiceToName: null as string | null,
  invoiceToAddress: null as string | null,
}

const listByOrganization = async (organizationId: string) =>
  await db
    .select()
    .from(projects)
    .where(eq(projects.organizationId, organizationId))

const getBySlug = async (organizationId: string, slug: string) => {
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.organizationId, organizationId), eq(projects.slug, slug))
    )

  return project ?? null
}

const listAccessible = async (
  organizationId: string,
  orgMember: { id: string; userId: string; role: string }
) => {
  if (orgMember.role === 'owner' || orgMember.role === 'admin') {
    return db
      .select()
      .from(projects)
      .where(eq(projects.organizationId, organizationId))
      .orderBy(desc(projects.createdAt))
  }

  const memberTeams = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, orgMember.userId))

  const teamIds = memberTeams.map((t) => t.teamId)

  const assignedProjectIds = await db
    .selectDistinct({ projectId: projectMemberAssignments.projectId })
    .from(projectMemberAssignments)
    .where(eq(projectMemberAssignments.memberId, orgMember.id))

  const clientProjectIds = await db
    .selectDistinct({ projectId: projectClientAssignments.projectId })
    .from(projectClientAssignments)
    .where(eq(projectClientAssignments.memberId, orgMember.id))

  const teamProjectIds =
    teamIds.length > 0
      ? await db
          .selectDistinct({ projectId: projectTeamAssignments.projectId })
          .from(projectTeamAssignments)
          .where(inArray(projectTeamAssignments.teamId, teamIds))
      : []

  const allProjectIds = [
    ...new Set([
      ...assignedProjectIds.map((r) => r.projectId),
      ...clientProjectIds.map((r) => r.projectId),
      ...teamProjectIds.map((r) => r.projectId),
    ]),
  ]

  if (allProjectIds.length === 0) {
    return []
  }

  return db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, organizationId),
        inArray(projects.id, allProjectIds)
      )
    )
    .orderBy(desc(projects.createdAt))
}

async function getProjectDetails(projectId: string) {
  const [result] = await db
    .select({
      projectName: projects.name,
      projectSlug: projects.slug,
      orgSlug: organizations.slug,
      orgName: organizations.name,
    })
    .from(projects)
    .innerJoin(organizations, eq(projects.organizationId, organizations.id))
    .where(eq(projects.id, projectId))

  return (
    result ?? { projectName: '', projectSlug: '', orgSlug: '', orgName: '' }
  )
}

const getById = async (projectId: string) => {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))

  return project ?? null
}

/**
 * Resolves settings with fallback chain:
 *   1. Project-level settings (if projectId provided)
 *   2. Organization-level settings
 *   3. Hard-coded defaults
 */
const getSettings = async (organizationId: string, projectId?: string) => {
  const [orgSettings] = await db
    .select()
    .from(settingsTable)
    .where(
      and(
        eq(settingsTable.organizationId, organizationId),
        isNull(settingsTable.projectId)
      )
    )

  if (projectId) {
    const [projectSettings] = await db
      .select()
      .from(settingsTable)
      .where(
        and(
          eq(settingsTable.organizationId, organizationId),
          eq(settingsTable.projectId, projectId)
        )
      )

    if (projectSettings) {
      const fallback = orgSettings ?? SETTINGS_DEFAULTS
      // Nullable invoice contact fields are "no override" when null/empty,
      // so fall back to the organization-level values.
      return {
        ...projectSettings,
        invoiceFromName:
          projectSettings.invoiceFromName || fallback.invoiceFromName,
        invoiceFromAddress:
          projectSettings.invoiceFromAddress || fallback.invoiceFromAddress,
        invoiceToName: projectSettings.invoiceToName || fallback.invoiceToName,
        invoiceToAddress:
          projectSettings.invoiceToAddress || fallback.invoiceToAddress,
      }
    }
  }

  return orgSettings ?? SETTINGS_DEFAULTS
}

export const projectsService = {
  listByOrganization,
  getBySlug,
  listAccessible,
  getProjectDetails,
  getById,
  getSettings,
}
