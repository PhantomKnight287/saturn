import { createId } from '@paralleldrive/cuid2'
import type { ActiveMember } from '@/server/access/project-access'
import { db } from '@/server/db'
import {
  expenseCategories,
  invoices,
  media,
  members,
  organizations,
  projectClientAssignments,
  projectMemberAssignments,
  projects,
  requirements,
  teamMembers,
  teams,
  users,
} from '@/server/db/schema'

export async function createOrganization(
  overrides: Partial<typeof organizations.$inferInsert> = {}
) {
  const id = `org_${createId()}`
  const [row] = await db
    .insert(organizations)
    .values({
      id,
      name: `Org ${id}`,
      slug: id,
      createdAt: new Date(),
      ...overrides,
    })
    .returning()
  return row!
}

export async function createProject(
  overrides: Partial<typeof projects.$inferInsert> & {
    organizationId?: string
  } = {}
) {
  const organizationId =
    overrides.organizationId ?? (await createOrganization()).id
  const slug = overrides.slug ?? `prj-${createId().slice(0, 8)}`
  const [row] = await db
    .insert(projects)
    .values({
      name: `Project ${slug}`,
      slug,
      organizationId,
      ...overrides,
    })
    .returning()
  return row!
}

export async function createUser(
  overrides: Partial<typeof users.$inferInsert> = {}
) {
  const id = overrides.id ?? `usr_${createId()}`
  const [row] = await db
    .insert(users)
    .values({
      id,
      name: `User ${id}`,
      email: `${id}@example.com`,
      ...overrides,
    })
    .returning()
  return row!
}

export async function createMember(
  overrides: Partial<typeof members.$inferInsert> & {
    organizationId?: string
    userId?: string
  } = {}
) {
  const organizationId =
    overrides.organizationId ?? (await createOrganization()).id
  const userId = overrides.userId ?? (await createUser()).id
  const [row] = await db
    .insert(members)
    .values({
      id: `mem_${createId()}`,
      organizationId,
      userId,
      role: 'member',
      createdAt: new Date(),
      ...overrides,
    })
    .returning()
  return row!
}

/**
 * Build the `ActiveMember` shape services expect (`ctx.orgMember`) from a
 * member row, hydrating the `user` relation used for notification emails.
 */
export async function activeMemberFor(
  member: typeof members.$inferSelect
): Promise<ActiveMember> {
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, member.userId),
  })
  return {
    id: member.id,
    role: member.role,
    userId: member.userId,
    organizationId: member.organizationId,
    user: user!,
  } as ActiveMember
}

export async function assignProjectMember(projectId: string, memberId: string) {
  await db
    .insert(projectMemberAssignments)
    .values({ projectId, memberId })
    .onConflictDoNothing()
}

export async function assignProjectClient(projectId: string, memberId: string) {
  await db
    .insert(projectClientAssignments)
    .values({ projectId, memberId })
    .onConflictDoNothing()
}

/**
 * The baseline every service-mutation test needs: an org, its owner (as both the
 * raw member row and the hydrated `ActiveMember` services receive in `ctx`), and
 * a project. State is then driven through the services' own mutations.
 */
export async function setupProject() {
  const org = await createOrganization()
  const ownerMember = await createMember({
    organizationId: org.id,
    role: 'owner',
  })
  const owner = await activeMemberFor(ownerMember)
  const project = await createProject({ organizationId: org.id })
  return { org, owner, ownerMember, project }
}

/** Create a client member and assign them to the project. */
export async function addProjectClient(
  organizationId: string,
  projectId: string
) {
  const member = await createMember({ organizationId, role: 'client' })
  await assignProjectClient(projectId, member.id)
  return member
}

/** Create a member-role teammate and assign them to the project. */
export async function addProjectMember(
  organizationId: string,
  projectId: string
) {
  const member = await createMember({ organizationId, role: 'member' })
  await assignProjectMember(projectId, member.id)
  return member
}

export async function createExpenseCategory(
  overrides: Partial<typeof expenseCategories.$inferInsert> & {
    organizationId?: string
  } = {}
) {
  const organizationId =
    overrides.organizationId ?? (await createOrganization()).id
  const [row] = await db
    .insert(expenseCategories)
    .values({
      organizationId,
      name: `Category ${createId().slice(0, 6)}`,
      ...overrides,
    })
    .returning()
  return row!
}

export async function createInvoice(
  overrides: Partial<typeof invoices.$inferInsert> & { projectId?: string } = {}
) {
  const projectId = overrides.projectId ?? (await createProject()).id
  const [row] = await db
    .insert(invoices)
    .values({
      projectId,
      invoiceNumber: `INV-${createId().slice(0, 6)}`,
      issueDate: '2026-01-01',
      ...overrides,
    })
    .returning()
  return row!
}

export async function createRequirement(
  overrides: Partial<typeof requirements.$inferInsert> & {
    projectId?: string
  } = {}
) {
  const projectId = overrides.projectId ?? (await createProject()).id
  const [row] = await db
    .insert(requirements)
    .values({
      projectId,
      slug: `req-${createId().slice(0, 6)}`,
      title: 'Build the thing',
      ...overrides,
    })
    .returning()
  return row!
}

export async function createMedia(
  overrides: Partial<typeof media.$inferInsert> & { userId?: string } = {}
) {
  const userId = overrides.userId ?? (await createUser()).id
  const [row] = await db
    .insert(media)
    .values({
      userId,
      name: 'signature.png',
      key: `media/${createId()}`,
      contentType: 'image/png',
      size: 1024,
      ...overrides,
    })
    .returning()
  return row!
}

export async function createTeam(
  overrides: Partial<typeof teams.$inferInsert> & {
    organizationId?: string
  } = {}
) {
  const organizationId =
    overrides.organizationId ?? (await createOrganization()).id
  const [row] = await db
    .insert(teams)
    .values({
      id: `team_${createId()}`,
      name: `Team ${createId().slice(0, 6)}`,
      organizationId,
      createdAt: new Date(),
      ...overrides,
    })
    .returning()
  return row!
}

export async function addTeamMember(teamId: string, userId: string) {
  const [row] = await db
    .insert(teamMembers)
    .values({ id: `tm_${createId()}`, teamId, userId, createdAt: new Date() })
    .returning()
  return row!
}
