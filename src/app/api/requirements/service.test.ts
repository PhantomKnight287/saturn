import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/server/db'
import { requirementChangeRequests, requirements } from '@/server/db/schema'
import { resetDb } from '../../../../tests/helpers/db'
import {
  activeMemberFor,
  addProjectClient,
  createMedia,
  setupProject,
} from '../../../../tests/helpers/factories'
import { requirementsService } from './service'

beforeEach(async () => {
  await resetDb()
})

async function draftRequirement() {
  const ctx = await setupProject()
  const requirement = await requirementsService.create({
    project: ctx.project,
    authorId: ctx.owner.id,
    title: 'Login Flow',
    body: '<p>spec</p>',
  })
  return { ...ctx, requirement: requirement! }
}

describe('requirementsService.create', () => {
  it('creates a draft requirement with a slug derived from the title', async () => {
    const { requirement } = await draftRequirement()

    expect(requirement.status).toBe('draft')
    expect(requirement.slug).toBe('login-flow')
  })
})

describe('requirementsService.listByProject / getById', () => {
  it('lists requirements for an admin', async () => {
    const { owner, project, requirement } = await draftRequirement()

    const list = await requirementsService.listByProject({
      projectId: project.id,
      memberId: owner.id,
      role: 'owner',
    })

    expect(list.map((r) => r.id)).toContain(requirement.id)
  })

  it('hides a draft requirement from a client via getById', async () => {
    const { project, requirement } = await draftRequirement()

    const result = await requirementsService.getById({
      requirementId: requirement.id,
      projectId: project.id,
      role: 'client',
    })

    expect(result).toBeNull()
  })
})

describe('requirementsService.update', () => {
  it('updates a draft requirement', async () => {
    const { project, owner, requirement } = await draftRequirement()

    const updated = await requirementsService.update({
      project,
      orgMember: owner,
      requirementId: requirement.id,
      title: 'Login & SSO',
      body: '<p>new</p>',
    })

    expect(updated!.title).toBe('Login & SSO')
  })

  it('refuses to edit a client-accepted requirement', async () => {
    const { project, owner, requirement } = await draftRequirement()
    await db
      .update(requirements)
      .set({ status: 'client_accepted' })
      .where(eq(requirements.id, requirement.id))

    await expect(
      requirementsService.update({
        project,
        orgMember: owner,
        requirementId: requirement.id,
        title: 'nope',
      })
    ).rejects.toThrow(
      'You cannot update a requirement that has been accepted by the client'
    )
  })
})

describe('requirementsService.sendForSign', () => {
  it('submits the requirement to client recipients', async () => {
    const { org, owner, project, requirement } = await draftRequirement()
    const client = await addProjectClient(org.id, project.id)

    await requirementsService.sendForSign({
      project,
      orgMember: owner,
      orgSlug: org.slug,
      requirementId: requirement.id,
      recipients: [client.id],
    })

    const [row] = await db
      .select()
      .from(requirements)
      .where(eq(requirements.id, requirement.id))
    expect(row!.status).toBe('submitted_to_client')
    const recipients = await requirementsService.getRecipients(requirement.id)
    expect(recipients.map((r) => r.clientMemberId)).toEqual([client.id])
  })
})

describe('requirementsService.sign', () => {
  it('accepts the requirement once the only recipient signs', async () => {
    const { org, owner, project, requirement } = await draftRequirement()
    const client = await addProjectClient(org.id, project.id)
    await requirementsService.sendForSign({
      project,
      orgMember: owner,
      orgSlug: org.slug,
      requirementId: requirement.id,
      recipients: [client.id],
    })
    const media = await createMedia({ userId: client.userId })

    const result = await requirementsService.sign({
      project,
      orgMember: await activeMemberFor(client),
      orgSlug: org.slug,
      requirementId: requirement.id,
      mediaId: media.id,
    })

    expect(result).toEqual({ success: true })
    const [row] = await db
      .select()
      .from(requirements)
      .where(eq(requirements.id, requirement.id))
    expect(row!.status).toBe('client_accepted')
  })

  it('refuses to sign a requirement that is not pending signature', async () => {
    const { org, project, requirement } = await draftRequirement()
    const client = await addProjectClient(org.id, project.id)
    const media = await createMedia({ userId: client.userId })
    await expect(
      requirementsService.sign({
        project,
        orgMember: await activeMemberFor(client),
        orgSlug: org.slug,
        requirementId: requirement.id,
        mediaId: media.id,
      })
    ).rejects.toThrow('Requirement not found')
  })
})

describe('requirementsService.requestChanges', () => {
  it('records a change request and flips the requirement to changes_requested', async () => {
    const { org, owner, project, requirement } = await draftRequirement()
    const client = await addProjectClient(org.id, project.id)
    await requirementsService.sendForSign({
      project,
      orgMember: owner,
      orgSlug: org.slug,
      requirementId: requirement.id,
      recipients: [client.id],
    })

    await requirementsService.requestChanges({
      project,
      orgMember: await activeMemberFor(client),
      orgSlug: org.slug,
      requirementId: requirement.id,
      description: 'please adjust the scope',
    })

    const [row] = await db
      .select()
      .from(requirements)
      .where(eq(requirements.id, requirement.id))
    expect(row!.status).toBe('changes_requested')
    const changeRequests = await requirementsService.getChangeRequests(
      requirement.id
    )
    expect(changeRequests).toHaveLength(1)
  })

  it('rejects a non-recipient raising a change request', async () => {
    const { org, owner, project, requirement } = await draftRequirement()
    const client = await addProjectClient(org.id, project.id)
    const outsider = await addProjectClient(org.id, project.id)
    await requirementsService.sendForSign({
      project,
      orgMember: owner,
      orgSlug: org.slug,
      requirementId: requirement.id,
      recipients: [client.id],
    })

    await expect(
      requirementsService.requestChanges({
        project,
        orgMember: await activeMemberFor(outsider),
        orgSlug: org.slug,
        requirementId: requirement.id,
        description: 'x',
      })
    ).rejects.toThrow('You are not a recipient of this requirement')
  })
})

describe('requirementsService.resolveChangeRequest', () => {
  it('marks a change request as accepted', async () => {
    const { org, owner, project, requirement } = await draftRequirement()
    const client = await addProjectClient(org.id, project.id)
    await requirementsService.sendForSign({
      project,
      orgMember: owner,
      orgSlug: org.slug,
      requirementId: requirement.id,
      recipients: [client.id],
    })
    await requirementsService.requestChanges({
      project,
      orgMember: await activeMemberFor(client),
      orgSlug: org.slug,
      requirementId: requirement.id,
      description: 'tweak',
    })
    const [changeRequest] = await db
      .select()
      .from(requirementChangeRequests)
      .where(eq(requirementChangeRequests.requirementId, requirement.id))

    const resolved = await requirementsService.resolveChangeRequest({
      project,
      orgMember: owner,
      requirementId: requirement.id,
      changeRequestId: changeRequest!.id,
      resolution: 'accepted',
    })

    expect(resolved!.status).toBe('accepted')
    expect(resolved!.resolvedAt).not.toBeNull()
  })
})

describe('requirementsService.createThread / addThreadReply', () => {
  it('creates a thread and appends a reply', async () => {
    const { owner, project, requirement } = await draftRequirement()

    const thread = await requirementsService.createThread({
      project,
      orgMember: owner,
      orgSlug: project.organizationId,
      requirementId: requirement.id,
      selectedText: 'this line',
      threadBody: 'what does this mean?',
    })
    expect(thread!.entityId).toBe(requirement.id)

    const reply = await requirementsService.addThreadReply({
      project,
      orgMember: owner,
      orgSlug: project.organizationId,
      requirementId: requirement.id,
      threadId: thread!.id,
      replyBody: 'clarified',
    })
    expect(reply!.body).toBe('clarified')
    expect(reply!.threadId).toBe(thread!.id)
  })
})
