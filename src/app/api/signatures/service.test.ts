import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/server/db'
import { requirementSignatures } from '@/server/db/schema'
import { resetDb } from '../../../../tests/helpers/db'
import {
  addProjectClient,
  createMedia,
  createProject,
  createRequirement,
  setupProject,
} from '../../../../tests/helpers/factories'
import { signaturesService } from './service'

beforeEach(async () => {
  await resetDb()
})

describe('signaturesService.getSignatureMediaForMember', () => {
  it('returns media a member has used to sign a requirement', async () => {
    const { org, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)
    const requirement = await createRequirement({ projectId: project.id })
    const media = await createMedia({ userId: client.userId })
    await db.insert(requirementSignatures).values({
      requirementId: requirement.id,
      clientMemberId: client.id,
      mediaId: media.id,
    })

    const result = await signaturesService.getSignatureMediaForMember(client.id)

    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe(media.id)
  })

  it('does not return media that the member never signed with', async () => {
    const { org, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)
    const other = await addProjectClient(org.id, project.id)
    const requirement = await createRequirement({ projectId: project.id })
    const media = await createMedia({ userId: other.userId })
    await db.insert(requirementSignatures).values({
      requirementId: requirement.id,
      clientMemberId: other.id,
      mediaId: media.id,
    })

    expect(
      await signaturesService.getSignatureMediaForMember(client.id)
    ).toEqual([])
  })

  it('ignores media not tied to any signature', async () => {
    const project = await createProject()
    const client = await addProjectClient(project.organizationId, project.id)
    await createMedia({ userId: client.userId })

    expect(
      await signaturesService.getSignatureMediaForMember(client.id)
    ).toEqual([])
  })
})
