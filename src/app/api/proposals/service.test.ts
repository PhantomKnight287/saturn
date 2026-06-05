import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/server/db'
import { proposals } from '@/server/db/schema'
import { resetDb } from '../../../../tests/helpers/db'
import {
  activeMemberFor,
  addProjectClient,
  createMedia,
  setupProject,
} from '../../../../tests/helpers/factories'
import { proposalsService } from './service'

beforeEach(async () => {
  await resetDb()
})

const deliverable = (over: Record<string, unknown> = {}) => ({
  description: 'Design',
  quantity: '1',
  unitPrice: '500',
  amount: '500',
  ...over,
})

async function draftProposal(over: Record<string, unknown> = {}) {
  const ctx = await setupProject()
  const proposal = await proposalsService.create({
    project: ctx.project,
    authorId: ctx.owner.id,
    title: 'Website Proposal',
    currency: 'USD',
    deliverables: [deliverable()],
    ...over,
  })
  return { ...ctx, proposal: proposal! }
}

describe('proposalsService.create', () => {
  it('creates a draft proposal and totals the deliverables', async () => {
    const { owner, project } = await setupProject()

    const proposal = await proposalsService.create({
      project,
      authorId: owner.id,
      title: 'Big Build',
      currency: 'USD',
      deliverables: [
        deliverable({ amount: '500' }),
        deliverable({ amount: '250' }),
      ],
    })

    expect(proposal!.status).toBe('draft')
    expect(Number(proposal!.totalAmount)).toBe(750)
    const deliverables = await proposalsService.getDeliverables(proposal!.id)
    expect(deliverables).toHaveLength(2)
  })
})

describe('proposalsService.listByProject / getBySlug', () => {
  it('lists proposals for an admin and resolves by slug', async () => {
    const { owner, project, proposal } = await draftProposal()

    const list = await proposalsService.listByProject({
      projectId: project.id,
      memberId: owner.id,
      role: 'owner',
    })
    expect(list.map((p) => p.id)).toEqual([proposal.id])

    const bySlug = await proposalsService.getBySlug({
      projectId: project.id,
      slug: proposal.slug,
      role: 'owner',
      memberId: owner.id,
    })
    expect(bySlug?.id).toBe(proposal.id)
  })

  it('hides drafts from clients', async () => {
    const { org, project, proposal } = await draftProposal()
    const client = await addProjectClient(org.id, project.id)

    const list = await proposalsService.listByProject({
      projectId: project.id,
      memberId: client.id,
      role: 'client',
    })

    expect(list.some((p) => p.id === proposal.id)).toBe(false)
  })
})

describe('proposalsService.update', () => {
  it('updates a draft proposal and recomputes the total', async () => {
    const { project, proposal } = await draftProposal()

    const updated = await proposalsService.update({
      project,
      proposalId: proposal.id,
      title: 'Revised',
      currency: 'USD',
      deliverables: [deliverable({ amount: '999' })],
    })

    expect(updated!.title).toBe('Revised')
    expect(Number(updated!.totalAmount)).toBe(999)
  })

  it('throws when the proposal does not exist', async () => {
    const { project } = await setupProject()
    await expect(
      proposalsService.update({
        project,
        proposalId: 'prop_missing',
        title: 'x',
      })
    ).rejects.toThrow('Proposal not found')
  })
})

describe('proposalsService.send', () => {
  it('submits the proposal to a client recipient', async () => {
    const { org, owner, project, proposal } = await draftProposal()
    const client = await addProjectClient(org.id, project.id)

    await proposalsService.send({
      project,
      orgMember: owner,
      orgSlug: org.slug,
      proposalId: proposal.id,
      recipients: [client.id],
    })

    const [row] = await db
      .select()
      .from(proposals)
      .where(eq(proposals.id, proposal.id))
    expect(row!.status).toBe('submitted_to_client')
    const recipients = await proposalsService.getRecipients(proposal.id)
    expect(recipients.map((r) => r.clientMemberId)).toEqual([client.id])
  })

  it('throws when the organization slug is unknown', async () => {
    const { owner, project, proposal } = await draftProposal()
    await expect(
      proposalsService.send({
        project,
        orgMember: owner,
        orgSlug: 'does-not-exist',
        proposalId: proposal.id,
        recipients: [],
      })
    ).rejects.toThrow('Organization not found')
  })
})

describe('proposalsService.sign', () => {
  it('flips to client_accepted once the only recipient signs', async () => {
    const { org, owner, project, proposal } = await draftProposal()
    const client = await addProjectClient(org.id, project.id)
    await proposalsService.send({
      project,
      orgMember: owner,
      orgSlug: org.slug,
      proposalId: proposal.id,
      recipients: [client.id],
    })
    const media = await createMedia({ userId: client.userId })

    const result = await proposalsService.sign({
      project,
      orgMember: await activeMemberFor(client),
      orgSlug: org.slug,
      proposalId: proposal.id,
      mediaId: media.id,
    })

    expect(result).toEqual({ success: true })
    const [row] = await db
      .select()
      .from(proposals)
      .where(eq(proposals.id, proposal.id))
    expect(row!.status).toBe('client_accepted')
  })

  it('rejects a signer who is not a recipient', async () => {
    const { org, owner, project, proposal } = await draftProposal()
    const client = await addProjectClient(org.id, project.id)
    const outsider = await addProjectClient(org.id, project.id)
    await proposalsService.send({
      project,
      orgMember: owner,
      orgSlug: org.slug,
      proposalId: proposal.id,
      recipients: [client.id],
    })
    const media = await createMedia({ userId: outsider.userId })

    await expect(
      proposalsService.sign({
        project,
        orgMember: await activeMemberFor(outsider),
        orgSlug: org.slug,
        proposalId: proposal.id,
        mediaId: media.id,
      })
    ).rejects.toThrow('You are not a recipient of this proposal')
  })
})

describe('proposalsService.decline', () => {
  it('lets a recipient decline a sent proposal', async () => {
    const { org, owner, project, proposal } = await draftProposal()
    const client = await addProjectClient(org.id, project.id)
    await proposalsService.send({
      project,
      orgMember: owner,
      orgSlug: org.slug,
      proposalId: proposal.id,
      recipients: [client.id],
    })

    const result = await proposalsService.decline({
      project,
      orgMember: await activeMemberFor(client),
      proposalId: proposal.id,
    })

    expect(result).toEqual({ success: true })
    const [row] = await db
      .select()
      .from(proposals)
      .where(eq(proposals.id, proposal.id))
    expect(row!.status).toBe('client_rejected')
  })

  it('refuses to decline a proposal that is not pending review', async () => {
    const { project, proposal } = await draftProposal()
    const { owner } = await setupProject()
    await expect(
      proposalsService.decline({
        project,
        orgMember: owner,
        proposalId: proposal.id,
      })
    ).rejects.toThrow('Proposal is not pending client review')
  })
})

describe('proposalsService.remove', () => {
  it('deletes the proposal', async () => {
    const { project, proposal } = await draftProposal()

    const result = await proposalsService.remove(proposal.id, project.id)

    expect(result).toEqual({ success: true })
    const rows = await db
      .select()
      .from(proposals)
      .where(eq(proposals.id, proposal.id))
    expect(rows).toHaveLength(0)
  })

  it('throws when the proposal does not exist', async () => {
    const { project } = await setupProject()
    await expect(
      proposalsService.remove('prop_missing', project.id)
    ).rejects.toThrow('Proposal not found')
  })
})
