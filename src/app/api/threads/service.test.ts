import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/server/db'
import { threadMessages, threads } from '@/server/db/schema'
import { resetDb } from '../../../../tests/helpers/db'
import { setupProject } from '../../../../tests/helpers/factories'
import { threadService } from './service'

beforeEach(async () => {
  await resetDb()
})

async function seedThread(
  projectId: string,
  entityId: string,
  memberId: string
) {
  const [thread] = await db
    .insert(threads)
    .values({
      projectId,
      entityId,
      selectedText: 'the disputed clause',
      createdByMemberId: memberId,
    })
    .returning()
  await db.insert(threadMessages).values({
    threadId: thread!.id,
    body: 'first message',
    authorMemberId: memberId,
  })
  return thread!
}

describe('threadService.getThreads', () => {
  it('returns [] when the entity has no threads', async () => {
    const { project } = await setupProject()
    expect(await threadService.getThreads(project.id, 'entity_x')).toEqual([])
  })

  it('returns threads with their messages and creator info', async () => {
    const { owner, project } = await setupProject()
    const thread = await seedThread(project.id, 'entity_1', owner.id)

    const result = await threadService.getThreads(project.id, 'entity_1')

    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe(thread.id)
    expect(result[0]!.selectedText).toBe('the disputed clause')
    expect(result[0]!.createdByMemberId).toBe(owner.id)
    expect(result[0]!.createdByName).toBe(owner.user.name)
    expect(result[0]!.messages).toHaveLength(1)
    expect(result[0]!.messages[0]!.body).toBe('first message')
    expect(result[0]!.messages[0]!.authorName).toBe(owner.user.name)
  })

  it('only returns threads for the requested entity', async () => {
    const { owner, project } = await setupProject()
    await seedThread(project.id, 'entity_1', owner.id)
    await seedThread(project.id, 'entity_2', owner.id)

    const result = await threadService.getThreads(project.id, 'entity_1')

    expect(result).toHaveLength(1)
    expect(result[0]!.selectedText).toBe('the disputed clause')
  })
})
