import { createId } from '@paralleldrive/cuid2'
import { db } from '@/server/db'
import { invoices, organizations, projects } from '@/server/db/schema'

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
