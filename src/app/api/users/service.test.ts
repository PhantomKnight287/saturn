import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../../../../tests/helpers/db'
import { createMedia, createUser } from '../../../../tests/helpers/factories'
import { usersService } from './service'

beforeEach(async () => {
  await resetDb()
})

describe('usersService.getMedias', () => {
  it('returns only the media owned by the user', async () => {
    const user = await createUser()
    const other = await createUser()
    await createMedia({ userId: user.id, name: 'a.png' })
    await createMedia({ userId: user.id, name: 'b.png' })
    await createMedia({ userId: other.id, name: 'c.png' })

    const result = await usersService.getMedias(user.id)

    expect(result).toHaveLength(2)
    expect(result.map((m) => m.name).sort()).toEqual(['a.png', 'b.png'])
  })

  it('returns [] when the user has no media', async () => {
    const user = await createUser()
    expect(await usersService.getMedias(user.id)).toEqual([])
  })
})
