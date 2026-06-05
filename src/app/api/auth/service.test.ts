import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../../../../tests/helpers/db'
import {
  assignProjectClient,
  assignProjectMember,
  createMember,
  createOrganization,
  createProject,
} from '../../../../tests/helpers/factories'
import { authService } from './service'

beforeEach(async () => {
  await resetDb()
})

describe('authService.checkProjectAccess', () => {
  it('fails when the project does not exist', async () => {
    const org = await createOrganization()
    const member = await createMember({
      organizationId: org.id,
      role: 'owner',
    })

    const result = await authService.checkProjectAccess(
      org.id,
      'prj_missing',
      member.userId
    )

    expect(result).toEqual({
      success: false,
      error: 'No project found in org with given id',
    })
  })

  it('fails when the project belongs to a different organization', async () => {
    const org = await createOrganization()
    const otherOrg = await createOrganization()
    const project = await createProject({ organizationId: otherOrg.id })
    const member = await createMember({ organizationId: org.id, role: 'owner' })

    const result = await authService.checkProjectAccess(
      org.id,
      project.id,
      member.userId
    )

    expect(result).toEqual({
      success: false,
      error: 'No project found in org with given id',
    })
  })

  it('fails when the user is not a member of the organization', async () => {
    const org = await createOrganization()
    const project = await createProject({ organizationId: org.id })
    // A member in another org — exists, but not in this one.
    const outsider = await createMember({ role: 'owner' })

    const result = await authService.checkProjectAccess(
      org.id,
      project.id,
      outsider.userId
    )

    expect(result).toEqual({
      success: false,
      error: 'User is not a member of this organization',
    })
  })

  it('grants access to an owner regardless of assignment', async () => {
    const org = await createOrganization()
    const project = await createProject({ organizationId: org.id })
    const owner = await createMember({ organizationId: org.id, role: 'owner' })

    const result = await authService.checkProjectAccess(
      org.id,
      project.id,
      owner.userId
    )

    expect(result).toEqual({ success: true, error: null })
  })

  it('grants access to an admin regardless of assignment', async () => {
    const org = await createOrganization()
    const project = await createProject({ organizationId: org.id })
    const admin = await createMember({ organizationId: org.id, role: 'admin' })

    const result = await authService.checkProjectAccess(
      org.id,
      project.id,
      admin.userId
    )

    expect(result).toEqual({ success: true, error: null })
  })

  it('grants access to a member assigned to the project', async () => {
    const org = await createOrganization()
    const project = await createProject({ organizationId: org.id })
    const member = await createMember({
      organizationId: org.id,
      role: 'member',
    })
    await assignProjectMember(project.id, member.id)

    const result = await authService.checkProjectAccess(
      org.id,
      project.id,
      member.userId
    )

    expect(result).toEqual({ success: true, error: null })
  })

  it('grants access to a client assigned to the project', async () => {
    const org = await createOrganization()
    const project = await createProject({ organizationId: org.id })
    const client = await createMember({
      organizationId: org.id,
      role: 'client',
    })
    await assignProjectClient(project.id, client.id)

    const result = await authService.checkProjectAccess(
      org.id,
      project.id,
      client.userId
    )

    expect(result).toEqual({ success: true, error: null })
  })

  it('denies a member with no assignment to the project', async () => {
    const org = await createOrganization()
    const project = await createProject({ organizationId: org.id })
    const member = await createMember({
      organizationId: org.id,
      role: 'member',
    })

    const result = await authService.checkProjectAccess(
      org.id,
      project.id,
      member.userId
    )

    expect(result).toEqual({
      success: false,
      error: 'User does not have access to project',
    })
  })

  it('denies a member assigned to a different project only', async () => {
    const org = await createOrganization()
    const project = await createProject({ organizationId: org.id })
    const otherProject = await createProject({ organizationId: org.id })
    const member = await createMember({
      organizationId: org.id,
      role: 'member',
    })
    await assignProjectMember(otherProject.id, member.id)

    const result = await authService.checkProjectAccess(
      org.id,
      project.id,
      member.userId
    )

    expect(result).toEqual({
      success: false,
      error: 'User does not have access to project',
    })
  })
})
