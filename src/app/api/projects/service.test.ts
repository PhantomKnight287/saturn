import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/server/db'
import { projects, requirements, settings } from '@/server/db/schema'
import { resetDb } from '../../../../tests/helpers/db'
import {
  addProjectMember,
  createMember,
  createOrganization,
  createProject,
  setupProject,
} from '../../../../tests/helpers/factories'
import { projectsService } from './service'

const billingStatus = vi.hoisted(() => ({ isPro: true }))

vi.mock('@/cache/billing', () => ({
  getUserBillingStatus: vi.fn(async () => billingStatus.isPro),
  getOrganizationBillingStatus: vi.fn(async () => billingStatus.isPro),
}))

beforeEach(async () => {
  await resetDb()
  billingStatus.isPro = true
})

describe('projectsService.getBySlug / getById', () => {
  it('returns the project scoped to the organization', async () => {
    const project = await createProject({ slug: 'website' })

    const bySlug = await projectsService.getBySlug(
      project.organizationId,
      'website'
    )
    expect(bySlug?.id).toBe(project.id)
    expect(await projectsService.getById(project.id)).not.toBeNull()
  })

  it('returns null when the slug belongs to another org', async () => {
    await createProject({ slug: 'website' })
    expect(await projectsService.getBySlug('org_other', 'website')).toBeNull()
  })
})

describe('projectsService.listByOrganization', () => {
  it('returns only the projects of the organization', async () => {
    const org = await createOrganization()
    await createProject({ organizationId: org.id })
    await createProject({ organizationId: org.id })
    await createProject()

    const result = await projectsService.listByOrganization(org.id)

    expect(result).toHaveLength(2)
  })
})

describe('projectsService.listAccessible', () => {
  it('returns every project for an owner', async () => {
    const { org, owner } = await setupProject()
    await createProject({ organizationId: org.id })

    const result = await projectsService.listAccessible(org.id, owner)

    expect(result).toHaveLength(2)
  })

  it('returns only assigned projects for a plain member', async () => {
    const { org, project } = await setupProject()
    await createProject({ organizationId: org.id })
    const teammate = await addProjectMember(org.id, project.id)

    const result = await projectsService.listAccessible(org.id, {
      id: teammate.id,
      userId: teammate.userId,
      role: 'member',
    })

    expect(result.map((p) => p.id)).toEqual([project.id])
  })
})

describe('projectsService.getSettings', () => {
  it('falls back to hard-coded defaults when nothing is configured', async () => {
    const org = await createOrganization()

    const result = await projectsService.getSettings(org.id)

    expect(result.currency).toBe('USD')
    expect(result.clientInvolvement.proposals).toBe('on')
  })

  it('returns the org-level row when present', async () => {
    const org = await createOrganization()
    await db
      .insert(settings)
      .values({ organizationId: org.id, currency: 'EUR' })

    const result = await projectsService.getSettings(org.id)

    expect(result.currency).toBe('EUR')
  })

  it('inherits the org pay rate when the project row has no rate override', async () => {
    const { org, project } = await setupProject()
    await db
      .insert(settings)
      .values({ organizationId: org.id, payRate: 8000, payCurrency: 'USD' })
    // Project row exists only for an invoice-contact override (payRate stays 0).
    await db.insert(settings).values({
      organizationId: org.id,
      projectId: project.id,
      invoiceFromName: 'Acme LLC',
    })

    const result = await projectsService.getSettings(org.id, project.id)

    expect(result.invoiceFromName).toBe('Acme LLC')
    expect(result.payRate).toBe(8000)
  })
})

describe('projectsService.create', () => {
  it('creates a project with a slug and a default General Work requirement', async () => {
    const { org, ownerMember } = await setupProject()

    const project = await projectsService.create({
      organizationId: org.id,
      authorId: ownerMember.id,
      name: 'Marketing Site',
    })

    expect(project.slug).toBe('marketing-site')
    const reqs = await db
      .select()
      .from(requirements)
      .where(eq(requirements.projectId, project.id))
    expect(reqs).toHaveLength(1)
    expect(reqs[0]!.title).toBe('General Work')
  })

  it('suffixes the slug when the name collides within the org', async () => {
    const { org, ownerMember } = await setupProject()
    await projectsService.create({
      organizationId: org.id,
      authorId: ownerMember.id,
      name: 'Same Name',
    })

    const second = await projectsService.create({
      organizationId: org.id,
      authorId: ownerMember.id,
      name: 'Same Name',
    })

    expect(second.slug).not.toBe('same-name')
  })

  it('enforces the free-plan project limit for non-pro owners', async () => {
    billingStatus.isPro = false
    const org = await createOrganization()
    const ownerMember = await createMember({
      organizationId: org.id,
      role: 'owner',
    })
    // Free plan allows 2 projects.
    await projectsService.create({
      organizationId: org.id,
      authorId: ownerMember.id,
      name: 'One',
    })
    await projectsService.create({
      organizationId: org.id,
      authorId: ownerMember.id,
      name: 'Two',
    })

    await expect(
      projectsService.create({
        organizationId: org.id,
        authorId: ownerMember.id,
        name: 'Three',
      })
    ).rejects.toThrow('Free plan is limited to')
  })
})

describe('projectsService.rename', () => {
  it('updates the name and slug', async () => {
    const project = await createProject()

    const result = await projectsService.rename({
      projectId: project.id,
      organizationId: project.organizationId,
      name: 'Renamed',
      slug: 'renamed',
    })

    expect(result).toEqual({ success: true, slug: 'renamed' })
    const [row] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, project.id))
    expect(row!.name).toBe('Renamed')
    expect(row!.slug).toBe('renamed')
  })
})

describe('projectsService.updateStatus', () => {
  it('updates the project status', async () => {
    const project = await createProject()

    const result = await projectsService.updateStatus({
      projectId: project.id,
      organizationId: project.organizationId,
      status: 'completed',
    })

    expect(result).toEqual({ success: true, status: 'completed' })
    const [row] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, project.id))
    expect(row!.status).toBe('completed')
  })
})

describe('projectsService.remove', () => {
  it('deletes the project when the confirmation name matches', async () => {
    const project = await createProject({ name: 'Delete Me' })

    const result = await projectsService.remove({
      projectId: project.id,
      organizationId: project.organizationId,
      confirmName: 'Delete Me',
    })

    expect(result).toEqual({ success: true })
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.id, project.id))
    expect(rows).toHaveLength(0)
  })

  it('refuses to delete when the confirmation name is wrong', async () => {
    const project = await createProject({ name: 'Keep Me' })

    await expect(
      projectsService.remove({
        projectId: project.id,
        organizationId: project.organizationId,
        confirmName: 'Wrong',
      })
    ).rejects.toThrow('Project name does not match')
  })

  it('throws when the project does not exist', async () => {
    await expect(
      projectsService.remove({
        projectId: 'prj_missing',
        organizationId: 'org_x',
        confirmName: 'x',
      })
    ).rejects.toThrow('Project not found')
  })
})

describe('projectsService.updateOrgClientInvolvement', () => {
  it('upserts the org-level client involvement', async () => {
    const org = await createOrganization()
    const involvement = {
      proposals: 'off' as const,
      requirements: 'on' as const,
      milestones: 'on' as const,
      timesheets: 'on' as const,
      expenses: 'on' as const,
      invoices: 'on' as const,
    }

    await projectsService.updateOrgClientInvolvement({
      organizationId: org.id,
      clientInvolvement: involvement,
    })

    const result = await projectsService.getSettings(org.id)
    expect(result.clientInvolvement.proposals).toBe('off')
  })
})
