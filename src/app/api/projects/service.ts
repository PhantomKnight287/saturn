import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { getUserBillingStatus } from '@/cache/billing'
import { formatLocalDateOnly } from '@/lib/custom-fields'
import { titleToSlug } from '@/lib/utils'
import { FREE_PLAN_LIMITS } from '@/limits'
import { projectAccess } from '@/server/access/project-access'
import { customFieldsService } from '@/server/custom-fields/service'
import { db } from '@/server/db'
import {
  members,
  organizations,
  projectClientAssignments,
  projectMemberAssignments,
  projects,
  projectTeamAssignments,
  requirements,
  settings as settingsTable,
  teamMembers,
} from '@/server/db/schema'

type SettingsInsert = typeof settingsTable.$inferInsert
type Frequency = NonNullable<SettingsInsert['payFrequency']>
type TimesheetDuration = NonNullable<SettingsInsert['timesheetDuration']>
type ClientInvolvement = NonNullable<SettingsInsert['clientInvolvement']>

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
      // A project settings row may exist purely for an invoice-contact override.
      // Treat an unset pay rate (0) / billing rate (null) as "no rate override"
      // and inherit the org-level rate triple so the project row can't silently
      // zero out the organization's configured rates.
      const hasPayOverride = !!projectSettings.payRate
      const hasBillingOverride = projectSettings.billingRate != null
      return {
        ...projectSettings,
        invoiceFromName:
          projectSettings.invoiceFromName || fallback.invoiceFromName,
        invoiceFromAddress:
          projectSettings.invoiceFromAddress || fallback.invoiceFromAddress,
        invoiceToName: projectSettings.invoiceToName || fallback.invoiceToName,
        invoiceToAddress:
          projectSettings.invoiceToAddress || fallback.invoiceToAddress,
        payRate: hasPayOverride ? projectSettings.payRate : fallback.payRate,
        payCurrency: hasPayOverride
          ? projectSettings.payCurrency
          : fallback.payCurrency,
        payFrequency: hasPayOverride
          ? projectSettings.payFrequency
          : fallback.payFrequency,
        billingRate: hasBillingOverride
          ? projectSettings.billingRate
          : fallback.billingRate,
        billingCurrency: hasBillingOverride
          ? projectSettings.billingCurrency
          : fallback.billingCurrency,
        billingFrequency: hasBillingOverride
          ? projectSettings.billingFrequency
          : fallback.billingFrequency,
      }
    }
  }

  return orgSettings ?? SETTINGS_DEFAULTS
}

// When no billing rate is set, billing mirrors pay entirely — otherwise stale
// billing currency/frequency could leak into "same as pay" mode.
const resolveRateDefaults = (i: {
  defaultPayRate: number
  defaultPayCurrency: string
  defaultPayFrequency: Frequency
  defaultBillingRate?: number
  defaultBillingCurrency?: string
  defaultBillingFrequency?: Frequency
  defaultTimesheetDuration: TimesheetDuration
}) => {
  const usePayForBilling = i.defaultBillingRate === undefined
  return {
    payRate: i.defaultPayRate,
    payCurrency: i.defaultPayCurrency,
    payFrequency: i.defaultPayFrequency,
    billingRate: usePayForBilling ? i.defaultPayRate : i.defaultBillingRate,
    billingCurrency: usePayForBilling
      ? i.defaultPayCurrency
      : (i.defaultBillingCurrency ?? i.defaultPayCurrency),
    billingFrequency: usePayForBilling
      ? i.defaultPayFrequency
      : (i.defaultBillingFrequency ?? i.defaultPayFrequency),
    timesheetDuration: i.defaultTimesheetDuration,
  }
}

const create = async ({
  organizationId,
  authorId,
  name,
  description,
  dueDate,
  invoiceFromName,
  invoiceFromAddress,
  invoiceToName,
  invoiceToAddress,
}: {
  organizationId: string
  authorId: string
  name: string
  description?: string
  dueDate?: Date
  invoiceFromName?: string
  invoiceFromAddress?: string
  invoiceToName?: string
  invoiceToAddress?: string
}) => {
  const { slugified, slugifiedWithSuffix } = titleToSlug(name)

  return await db.transaction(async (tx) => {
    const [ownerRow] = await tx
      .select({ ownerId: members.userId })
      .from(members)
      .where(
        and(
          eq(members.organizationId, organizationId),
          eq(members.role, 'owner')
        )
      )
      .for('update')
      .limit(1)

    if (!ownerRow) {
      throw new Error('Workspace owner not found')
    }

    const ownerHasPro = await getUserBillingStatus(ownerRow.ownerId)
    if (!ownerHasPro) {
      const [projectCountRow] = await tx
        .select({ value: count() })
        .from(projects)
        .innerJoin(members, eq(members.organizationId, projects.organizationId))
        .where(
          and(eq(members.userId, ownerRow.ownerId), eq(members.role, 'owner'))
        )
      const projectCount = projectCountRow?.value ?? 0
      if (projectCount >= FREE_PLAN_LIMITS.PROJECTS) {
        throw new Error(
          `Free plan is limited to ${FREE_PLAN_LIMITS.PROJECTS} projects across all workspaces. Please upgrade to Pro.`
        )
      }
    }

    const [projectWithSlug] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, organizationId),
          eq(projects.slug, slugified)
        )
      )
      .limit(1)

    const [createdProject] = await tx
      .insert(projects)
      .values({
        name,
        slug: projectWithSlug ? slugifiedWithSuffix : slugified,
        description: description || null,
        organizationId,
        dueDate: dueDate ? formatLocalDateOnly(dueDate) : null,
      })
      .returning()

    if (!createdProject) {
      throw new Error('Failed to create project')
    }

    // This is the requirement called "General Work"
    await tx.insert(requirements).values({
      projectId: createdProject.id,
      slug: 'saturn_default_general_work',
      title: 'General Work',
      body: '<h1> This is a default requirement generated by Saturn to categorize under General Work </h1>',
      status: 'client_accepted',
      authorId,
    })

    await customFieldsService.copyOrgTemplatesToProject(
      tx,
      organizationId,
      createdProject.id
    )

    const fromName = invoiceFromName?.trim() || null
    const fromAddress = invoiceFromAddress?.trim() || null
    const toName = invoiceToName?.trim() || null
    const toAddress = invoiceToAddress?.trim() || null
    if (fromName || fromAddress || toName || toAddress) {
      await tx.insert(settingsTable).values({
        organizationId,
        projectId: createdProject.id,
        invoiceFromName: fromName,
        invoiceFromAddress: fromAddress,
        invoiceToName: toName,
        invoiceToAddress: toAddress,
      })
    }

    return createdProject
  })
}

const rename = async ({
  projectId,
  organizationId,
  name,
  slug,
  dueDate,
}: {
  projectId: string
  organizationId: string
  name: string
  slug: string
  dueDate?: Date
}) => {
  await db
    .update(projects)
    .set({
      name,
      slug,
      dueDate: dueDate ? formatLocalDateOnly(dueDate) : null,
    })
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organizationId)
      )
    )

  return { success: true, slug }
}

const updateStatus = async ({
  projectId,
  organizationId,
  status,
}: {
  projectId: string
  organizationId: string
  status: typeof projects.$inferInsert.status
}) => {
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

const remove = async ({
  projectId,
  organizationId,
  confirmName,
}: {
  projectId: string
  organizationId: string
  confirmName: string
}) => {
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

const updateProjectBillingDetails = async ({
  projectId,
  organizationId,
  invoiceFromName,
  invoiceFromAddress,
  invoiceToName,
  invoiceToAddress,
}: {
  projectId: string
  organizationId: string
  invoiceFromName?: string
  invoiceFromAddress?: string
  invoiceToName?: string
  invoiceToAddress?: string
}) => {
  await projectAccess.assertInOrg(projectId, organizationId)

  const values = {
    invoiceFromName: invoiceFromName?.trim() || null,
    invoiceFromAddress: invoiceFromAddress?.trim() || null,
    invoiceToName: invoiceToName?.trim() || null,
    invoiceToAddress: invoiceToAddress?.trim() || null,
  }

  await db
    .insert(settingsTable)
    .values({ organizationId, projectId, ...values })
    .onConflictDoUpdate({
      target: [settingsTable.organizationId, settingsTable.projectId],
      set: values,
    })

  return { success: true }
}

const updateProjectTimesheetDefaults = async ({
  organizationId,
  projectId,
  ...rates
}: {
  organizationId: string
  projectId: string
  defaultPayRate: number
  defaultPayCurrency: string
  defaultPayFrequency: Frequency
  defaultBillingRate?: number
  defaultBillingCurrency?: string
  defaultBillingFrequency?: Frequency
  defaultTimesheetDuration: TimesheetDuration
}) => {
  await projectAccess.assertInOrg(projectId, organizationId)
  const defaults = resolveRateDefaults(rates)
  await db
    .insert(settingsTable)
    .values({ organizationId, projectId, ...defaults })
    .onConflictDoUpdate({
      target: [settingsTable.organizationId, settingsTable.projectId],
      set: defaults,
    })

  return { success: true }
}

const updateProjectClientInvolvement = async ({
  organizationId,
  projectId,
  clientInvolvement,
}: {
  organizationId: string
  projectId: string
  clientInvolvement: ClientInvolvement
}) => {
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
  await db
    .insert(settingsTable)
    .values({ organizationId, projectId, clientInvolvement })
    .onConflictDoUpdate({
      target: [settingsTable.organizationId, settingsTable.projectId],
      set: { clientInvolvement },
    })

  return { success: true }
}

const updateOrgTimesheetDefaults = async ({
  organizationId,
  ...rates
}: {
  organizationId: string
  defaultPayRate: number
  defaultPayCurrency: string
  defaultPayFrequency: Frequency
  defaultBillingRate?: number
  defaultBillingCurrency?: string
  defaultBillingFrequency?: Frequency
  defaultTimesheetDuration: TimesheetDuration
}) => {
  const defaults = resolveRateDefaults(rates)
  await db
    .insert(settingsTable)
    .values({ organizationId, ...defaults })
    .onConflictDoUpdate({
      target: [settingsTable.organizationId],
      targetWhere: sql`${settingsTable.projectId} IS NULL`,
      set: defaults,
    })

  return { success: true }
}

const updateInvoiceNumberTemplate = async ({
  organizationId,
  projectId,
  invoiceNumberTemplate,
}: {
  organizationId: string
  projectId?: string | null
  invoiceNumberTemplate: string
}) => {
  if (projectId) {
    await db
      .insert(settingsTable)
      .values({ organizationId, projectId, invoiceNumberTemplate })
      .onConflictDoUpdate({
        target: [settingsTable.organizationId, settingsTable.projectId],
        set: { invoiceNumberTemplate },
      })
  } else {
    await db
      .insert(settingsTable)
      .values({ organizationId, invoiceNumberTemplate })
      .onConflictDoUpdate({
        target: [settingsTable.organizationId],
        targetWhere: sql`${settingsTable.projectId} IS NULL`,
        set: { invoiceNumberTemplate },
      })
  }

  return { success: true }
}

const updateInvoiceImportDefaults = async ({
  organizationId,
  projectId,
  invoiceTimeUnit,
}: {
  organizationId: string
  projectId?: string | null
  invoiceTimeUnit: NonNullable<SettingsInsert['invoiceTimeUnit']>
}) => {
  if (projectId) {
    await projectAccess.assertInOrg(projectId, organizationId)
    await db
      .insert(settingsTable)
      .values({ organizationId, projectId, invoiceTimeUnit })
      .onConflictDoUpdate({
        target: [settingsTable.organizationId, settingsTable.projectId],
        set: { invoiceTimeUnit },
      })
  } else {
    await db
      .insert(settingsTable)
      .values({ organizationId, invoiceTimeUnit })
      .onConflictDoUpdate({
        target: [settingsTable.organizationId],
        targetWhere: sql`${settingsTable.projectId} IS NULL`,
        set: { invoiceTimeUnit },
      })
  }

  return { success: true }
}

const updateInvoiceFromDetails = async ({
  organizationId,
  invoiceFromName,
  invoiceFromAddress,
}: {
  organizationId: string
  invoiceFromName?: string
  invoiceFromAddress?: string
}) => {
  const values = {
    invoiceFromName: invoiceFromName?.trim() || null,
    invoiceFromAddress: invoiceFromAddress?.trim() || null,
  }
  await db
    .insert(settingsTable)
    .values({ organizationId, ...values })
    .onConflictDoUpdate({
      target: [settingsTable.organizationId],
      targetWhere: sql`${settingsTable.projectId} IS NULL`,
      set: values,
    })

  return { success: true }
}

const updateOrgClientInvolvement = async ({
  organizationId,
  clientInvolvement,
}: {
  organizationId: string
  clientInvolvement: ClientInvolvement
}) => {
  await db
    .insert(settingsTable)
    .values({ organizationId, clientInvolvement })
    .onConflictDoUpdate({
      target: [settingsTable.organizationId],
      targetWhere: sql`${settingsTable.projectId} IS NULL`,
      set: { clientInvolvement },
    })

  return { success: true }
}

export const projectsService = {
  listByOrganization,
  getBySlug,
  listAccessible,
  getProjectDetails,
  getById,
  getSettings,
  create,
  rename,
  updateStatus,
  remove,
  updateProjectBillingDetails,
  updateProjectTimesheetDefaults,
  updateProjectClientInvolvement,
  updateOrgTimesheetDefaults,
  updateInvoiceNumberTemplate,
  updateInvoiceImportDefaults,
  updateInvoiceFromDetails,
  updateOrgClientInvolvement,
}
