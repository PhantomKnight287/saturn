import { createId } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/server/db'
import {
  milestoneRequirements,
  milestones,
  requirements,
} from '@/server/db/schema'
import { resetDb } from '../../../../tests/helpers/db'
import {
  createProject,
  setupProject,
} from '../../../../tests/helpers/factories'
import { milestonesService } from './service'

beforeEach(async () => {
  await resetDb()
})

const addRequirement = async (
  projectId: string,
  status?:
    | 'draft'
    | 'submitted_to_client'
    | 'client_accepted'
    | 'changes_requested'
) => {
  const [req] = await db
    .insert(requirements)
    .values({
      projectId,
      slug: `req-${createId().slice(0, 6)}`,
      title: 'Build the thing',
      status,
    })
    .returning()
  return req!
}

describe('milestonesService.create', () => {
  it('assigns sort order in creation sequence', async () => {
    const project = await createProject()
    const first = await milestonesService.create({
      name: 'A',
      currency: 'USD',
      projectId: project.id,
    })
    const second = await milestonesService.create({
      name: 'B',
      currency: 'USD',
      projectId: project.id,
    })

    expect(first!.sortOrder).toBe(0)
    expect(second!.sortOrder).toBe(1)
    expect(first!.status).toBe('pending')
  })

  it('persists budget and due date', async () => {
    const project = await createProject()
    const milestone = await milestonesService.create({
      name: 'Launch',
      currency: 'EUR',
      projectId: project.id,
      budgetMinutes: 600,
      budgetAmountCents: 50_000,
      dueDate: new Date('2026-03-01'),
    })

    expect(milestone!.budgetMinutes).toBe(600)
    expect(milestone!.budgetAmountCents).toBe(50_000)
    expect(milestone!.currency).toBe('EUR')
    expect(milestone!.dueDate).toBe('2026-03-01')
  })
})

describe('milestonesService.listByProject', () => {
  it('returns milestones ordered by sort order', async () => {
    const project = await createProject()
    await milestonesService.create({
      name: 'First',
      currency: 'USD',
      projectId: project.id,
    })
    await milestonesService.create({
      name: 'Second',
      currency: 'USD',
      projectId: project.id,
    })

    const result = await milestonesService.listByProject(project.id)

    expect(result.map((m) => m.name)).toEqual(['First', 'Second'])
    expect(result.map((m) => m.sortOrder)).toEqual([0, 1])
  })

  it('does not leak milestones from other projects', async () => {
    const projectA = await createProject()
    const projectB = await createProject()
    await milestonesService.create({
      name: 'A',
      currency: 'USD',
      projectId: projectA.id,
    })
    await milestonesService.create({
      name: 'B',
      currency: 'USD',
      projectId: projectB.id,
    })

    const result = await milestonesService.listByProject(projectA.id)

    expect(result).toHaveLength(1)
    expect(result[0]!.projectId).toBe(projectA.id)
  })
})

describe('milestonesService.listByProjectIds', () => {
  it('returns [] when no project ids are provided', async () => {
    expect(await milestonesService.listByProjectIds([])).toEqual([])
  })

  it('returns every milestone for the given projects', async () => {
    const project = await createProject()
    await milestonesService.create({
      name: 'Milestone 1',
      currency: 'USD',
      projectId: project.id,
    })
    await milestonesService.create({
      name: 'Milestone 2',
      currency: 'EUR',
      projectId: project.id,
    })

    const result = await milestonesService.listByProjectIds([project.id])

    expect(result).toHaveLength(2)
  })

  it('does not bleed milestones from other projects', async () => {
    const projectA = await createProject()
    const projectB = await createProject()
    await milestonesService.create({
      name: 'Milestone 1',
      currency: 'USD',
      projectId: projectA.id,
    })
    await milestonesService.create({
      name: 'Milestone 2',
      currency: 'EUR',
      projectId: projectB.id,
    })

    const result = await milestonesService.listByProjectIds([projectA.id])

    expect(result).toHaveLength(1)
    expect(result[0]!.projectId).toBe(projectA.id)
  })
})

describe('milestonesService.getById', () => {
  it('returns the milestone within its project', async () => {
    const project = await createProject()
    const milestone = await milestonesService.create({
      name: 'M',
      currency: 'USD',
      projectId: project.id,
    })

    const result = await milestonesService.getById(milestone!.id, project.id)

    expect(result?.id).toBe(milestone!.id)
  })

  it('returns null when the milestone belongs to another project', async () => {
    const project = await createProject()
    const other = await createProject()
    const milestone = await milestonesService.create({
      name: 'M',
      currency: 'USD',
      projectId: project.id,
    })

    expect(await milestonesService.getById(milestone!.id, other.id)).toBeNull()
  })
})

describe('milestonesService.getProgress', () => {
  it('tallies linked requirements by status', async () => {
    const project = await createProject()
    const milestone = await milestonesService.create({
      name: 'M',
      currency: 'USD',
      projectId: project.id,
    })
    const signed = await addRequirement(project.id, 'client_accepted')
    const draft = await addRequirement(project.id, 'draft')
    const sentForSign = await addRequirement(project.id, 'submitted_to_client')

    await db.insert(milestoneRequirements).values([
      { milestoneId: milestone!.id, requirementId: signed.id, sortOrder: 0 },
      { milestoneId: milestone!.id, requirementId: draft.id, sortOrder: 1 },
      {
        milestoneId: milestone!.id,
        requirementId: sentForSign.id,
        sortOrder: 2,
      },
    ])

    const progress = await milestonesService.getProgress(milestone!.id)

    expect(progress).toEqual({
      total: 3,
      signed: 1,
      draft: 1,
      changesRequested: 0,
      sentForSign: 1,
    })
  })
})

describe('milestonesService.listByProjectWithProgress', () => {
  it('returns milestones with their signed/total counts', async () => {
    const project = await createProject()
    const milestone = await milestonesService.create({
      name: 'M',
      currency: 'USD',
      projectId: project.id,
    })
    const signed = await addRequirement(project.id, 'client_accepted')
    const draft = await addRequirement(project.id, 'draft')
    await db.insert(milestoneRequirements).values([
      { milestoneId: milestone!.id, requirementId: signed.id, sortOrder: 0 },
      { milestoneId: milestone!.id, requirementId: draft.id, sortOrder: 1 },
    ])

    const result = await milestonesService.listByProjectWithProgress(project.id)

    expect(result).toHaveLength(1)
    expect(result[0]!.progress).toEqual({ total: 2, signed: 1 })
  })
})

describe('milestonesService.update', () => {
  it('updates fields in place', async () => {
    const { owner, project } = await setupProject()
    const milestone = await milestonesService.create({
      name: 'Old',
      currency: 'USD',
      projectId: project.id,
    })

    const updated = await milestonesService.update({
      milestoneId: milestone!.id,
      orgMember: owner,
      name: 'New',
      budgetMinutes: 120,
    })

    expect(updated!.name).toBe('New')
    expect(updated!.budgetMinutes).toBe(120)
  })

  it('stamps completedAt when moved to completed', async () => {
    const { owner, project } = await setupProject()
    const milestone = await milestonesService.create({
      name: 'M',
      currency: 'USD',
      projectId: project.id,
    })

    const updated = await milestonesService.update({
      milestoneId: milestone!.id,
      orgMember: owner,
      status: 'completed',
    })

    expect(updated!.status).toBe('completed')
    expect(updated!.completedAt).not.toBeNull()
  })

  it('requires a reason when setting status to blocked', async () => {
    const { owner, project } = await setupProject()
    const milestone = await milestonesService.create({
      name: 'M',
      currency: 'USD',
      projectId: project.id,
    })

    await expect(
      milestonesService.update({
        milestoneId: milestone!.id,
        orgMember: owner,
        status: 'blocked',
      })
    ).rejects.toThrow('Block reason is required when setting status to blocked')
  })

  it('clears the block reason when leaving the blocked status', async () => {
    const { owner, project } = await setupProject()
    const milestone = await milestonesService.create({
      name: 'M',
      currency: 'USD',
      projectId: project.id,
    })
    await milestonesService.update({
      milestoneId: milestone!.id,
      orgMember: owner,
      status: 'blocked',
      blockReason: 'waiting on assets',
    })

    const updated = await milestonesService.update({
      milestoneId: milestone!.id,
      orgMember: owner,
      status: 'in_progress',
    })

    expect(updated!.status).toBe('in_progress')
    expect(updated!.blockReason).toBeNull()
  })

  it('throws when the milestone does not exist', async () => {
    const { owner } = await setupProject()
    await expect(
      milestonesService.update({
        milestoneId: 'ms_missing',
        orgMember: owner,
        name: 'x',
      })
    ).rejects.toThrow('Milestone not found')
  })

  it('throws when the member has no access to the project', async () => {
    const { owner } = await setupProject()
    const other = await createProject()
    const milestone = await milestonesService.create({
      name: 'M',
      currency: 'USD',
      projectId: other.id,
    })

    await expect(
      milestonesService.update({
        milestoneId: milestone!.id,
        orgMember: owner,
        name: 'x',
      })
    ).rejects.toThrow('Milestone not found')
  })
})

describe('milestonesService.complete', () => {
  it('marks a milestone completed', async () => {
    const { owner, project } = await setupProject()
    const milestone = await milestonesService.create({
      name: 'M',
      currency: 'USD',
      projectId: project.id,
    })

    const completed = await milestonesService.complete({
      milestoneId: milestone!.id,
      orgMember: owner,
    })

    expect(completed!.status).toBe('completed')
    expect(completed!.completedAt).not.toBeNull()
  })

  it('refuses to complete an already completed milestone', async () => {
    const { owner, project } = await setupProject()
    const milestone = await milestonesService.create({
      name: 'M',
      currency: 'USD',
      projectId: project.id,
    })
    await milestonesService.complete({
      milestoneId: milestone!.id,
      orgMember: owner,
    })

    await expect(
      milestonesService.complete({
        milestoneId: milestone!.id,
        orgMember: owner,
      })
    ).rejects.toThrow('Milestone is already completed')
  })

  it('throws when the milestone does not exist', async () => {
    const { owner } = await setupProject()
    await expect(
      milestonesService.complete({
        milestoneId: 'ms_missing',
        orgMember: owner,
      })
    ).rejects.toThrow('Milestone not found')
  })
})

describe('milestonesService.remove', () => {
  it('deletes the milestone', async () => {
    const { owner, project } = await setupProject()
    const milestone = await milestonesService.create({
      name: 'M',
      currency: 'USD',
      projectId: project.id,
    })

    const result = await milestonesService.remove({
      milestoneId: milestone!.id,
      orgMember: owner,
    })

    expect(result).toEqual({ success: true })
    const rows = await db
      .select()
      .from(milestones)
      .where(eq(milestones.id, milestone!.id))
    expect(rows).toHaveLength(0)
  })

  it('throws when the milestone does not exist', async () => {
    const { owner } = await setupProject()
    await expect(
      milestonesService.remove({ milestoneId: 'ms_missing', orgMember: owner })
    ).rejects.toThrow('Milestone not found')
  })
})

describe('milestonesService.reorder', () => {
  it('rewrites sort order to match the given sequence', async () => {
    const project = await createProject()
    const a = await milestonesService.create({
      name: 'A',
      currency: 'USD',
      projectId: project.id,
    })
    const b = await milestonesService.create({
      name: 'B',
      currency: 'USD',
      projectId: project.id,
    })

    await milestonesService.reorder({
      projectId: project.id,
      orderedIds: [b!.id, a!.id],
    })

    const result = await milestonesService.listByProject(project.id)
    expect(result.map((m) => m.id)).toEqual([b!.id, a!.id])
  })

  it('rejects a payload that does not list every milestone exactly once', async () => {
    const project = await createProject()
    const a = await milestonesService.create({
      name: 'A',
      currency: 'USD',
      projectId: project.id,
    })
    await milestonesService.create({
      name: 'B',
      currency: 'USD',
      projectId: project.id,
    })

    await expect(
      milestonesService.reorder({
        projectId: project.id,
        orderedIds: [a!.id],
      })
    ).rejects.toThrow(
      'Reorder payload must list every milestone in this project exactly once'
    )
  })
})

describe('milestonesService.linkRequirement', () => {
  it('links a requirement and exposes it via getLinkedRequirements', async () => {
    const { owner, project } = await setupProject()
    const milestone = await milestonesService.create({
      name: 'M',
      currency: 'USD',
      projectId: project.id,
    })
    const requirement = await addRequirement(project.id)

    const link = await milestonesService.linkRequirement({
      milestoneId: milestone!.id,
      requirementId: requirement.id,
      orgMember: owner,
    })
    expect(link!.requirementId).toBe(requirement.id)

    const linked = await milestonesService.getLinkedRequirements(milestone!.id)
    expect(linked).toHaveLength(1)
    expect(linked[0]!.requirementId).toBe(requirement.id)
    expect(linked[0]!.requirementTitle).toBe('Build the thing')
  })

  it('refuses a requirement from a different project', async () => {
    const { owner, project } = await setupProject()
    const other = await createProject({ organizationId: owner.organizationId })
    const milestone = await milestonesService.create({
      name: 'M',
      currency: 'USD',
      projectId: project.id,
    })
    const requirement = await addRequirement(other.id)

    await expect(
      milestonesService.linkRequirement({
        milestoneId: milestone!.id,
        requirementId: requirement.id,
        orgMember: owner,
      })
    ).rejects.toThrow('Requirement does not belong to the same project')
  })

  it('throws when the milestone does not exist', async () => {
    const { owner, project } = await setupProject()
    const requirement = await addRequirement(project.id)

    await expect(
      milestonesService.linkRequirement({
        milestoneId: 'ms_missing',
        requirementId: requirement.id,
        orgMember: owner,
      })
    ).rejects.toThrow('Milestone not found')
  })
})

describe('milestonesService.unlinkRequirement', () => {
  it('removes the link', async () => {
    const { owner, project } = await setupProject()
    const milestone = await milestonesService.create({
      name: 'M',
      currency: 'USD',
      projectId: project.id,
    })
    const requirement = await addRequirement(project.id)
    await milestonesService.linkRequirement({
      milestoneId: milestone!.id,
      requirementId: requirement.id,
      orgMember: owner,
    })

    const result = await milestonesService.unlinkRequirement({
      milestoneId: milestone!.id,
      requirementId: requirement.id,
      orgMember: owner,
    })

    expect(result).toEqual({ success: true })
    const linked = await milestonesService.getLinkedRequirements(milestone!.id)
    expect(linked).toHaveLength(0)
  })
})
