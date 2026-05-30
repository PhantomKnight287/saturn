import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../../../../tests/helpers/db'
import {
  createInvoice,
  createProject,
} from '../../../../tests/helpers/factories'
import { invoicesService } from './service'

beforeEach(async () => {
  await resetDb()
})

describe('invoicesService.listByProjectIds', () => {
  it('returns [] when no project ids are provided', async () => {
    const result = await invoicesService.listByProjectIds([])
    expect(result).toEqual([])
  })

  it('returns every invoice for the given projects (admin view by default)', async () => {
    const project = await createProject()
    await createInvoice({ projectId: project.id, status: 'draft' })
    await createInvoice({ projectId: project.id, status: 'paid' })

    const result = await invoicesService.listByProjectIds([project.id])

    expect(result).toHaveLength(2)
    expect(result.map((i) => i.status).sort()).toEqual(['draft', 'paid'])
  })

  it('excludes draft invoices when clientView is true', async () => {
    const project = await createProject()
    await createInvoice({ projectId: project.id, status: 'draft' })
    await createInvoice({ projectId: project.id, status: 'sent' })
    await createInvoice({ projectId: project.id, status: 'paid' })

    const result = await invoicesService.listByProjectIds([project.id], {
      clientView: true,
    })

    expect(result).toHaveLength(2)
    expect(result.map((i) => i.status).sort()).toEqual(['paid', 'sent'])
    expect(result.some((i) => i.status === 'draft')).toBe(false)
  })

  it('does not bleed invoices from other projects', async () => {
    const projectA = await createProject()
    const projectB = await createProject()
    await createInvoice({ projectId: projectA.id })
    await createInvoice({ projectId: projectB.id })

    const result = await invoicesService.listByProjectIds([projectA.id])

    expect(result).toHaveLength(1)
    expect(result[0]!.projectId).toBe(projectA.id)
  })

  it('returns invoices newest-first (createdAt desc)', async () => {
    const project = await createProject()
    const older = await createInvoice({
      projectId: project.id,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })
    const newer = await createInvoice({
      projectId: project.id,
      createdAt: new Date('2026-02-01T00:00:00Z'),
    })

    const result = await invoicesService.listByProjectIds([project.id])

    expect(result.map((i) => i.id)).toEqual([newer.id, older.id])
  })
})
