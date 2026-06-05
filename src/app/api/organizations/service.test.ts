import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../../../../tests/helpers/db'
import { createOrganization } from '../../../../tests/helpers/factories'
import { organizationsService } from './service'

beforeEach(async () => {
  await resetDb()
})

describe('organizationsService.getBySlug', () => {
  it('returns the organization matching the slug', async () => {
    const org = await createOrganization({ slug: 'acme', name: 'Acme' })

    const result = await organizationsService.getBySlug('acme')

    expect(result?.id).toBe(org.id)
    expect(result?.name).toBe('Acme')
  })

  it('returns undefined when no organization matches', async () => {
    expect(await organizationsService.getBySlug('nope')).toBeUndefined()
  })
})
