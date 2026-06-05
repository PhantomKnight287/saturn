import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/server/db'
import {
  projectClientAssignments,
  projectMemberAssignments,
  teams,
} from '@/server/db/schema'
import { resetDb } from '../../../../tests/helpers/db'
import {
  addProjectClient,
  addProjectMember,
  addTeamMember,
  assignProjectClient,
  createMember,
  createOrganization,
  createProject,
  createTeam,
  createUser,
  setupProject,
} from '../../../../tests/helpers/factories'
import { teamService } from './service'

beforeEach(async () => {
  await resetDb()
})

describe('teamService.getProjectMembers', () => {
  it('includes org admins/owners and directly assigned members', async () => {
    const { org, owner, project } = await setupProject()
    const teammate = await addProjectMember(org.id, project.id)

    const result = await teamService.getProjectMembers(project.id)
    const ids = result.map((m) => m.memberId)

    expect(ids).toContain(owner.id)
    expect(ids).toContain(teammate.id)
  })

  it('returns [] for a project that does not exist', async () => {
    expect(await teamService.getProjectMembers('prj_missing')).toEqual([])
  })
})

describe('teamService.getProjectClients', () => {
  it('returns clients assigned to the project', async () => {
    const { org, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)

    const result = await teamService.getProjectClients(project.id)

    expect(result.map((c) => c.memberId)).toEqual([client.id])
  })
})

describe('teamService.getOrgMemberCounts', () => {
  it('separates team members from clients', async () => {
    const org = await createOrganization()
    await createMember({ organizationId: org.id, role: 'owner' })
    await createMember({ organizationId: org.id, role: 'member' })
    await createMember({ organizationId: org.id, role: 'client' })

    const result = await teamService.getOrgMemberCounts(org.id)

    expect(result).toEqual({ team: 2, client: 1 })
  })
})

describe('teamService.getClientMemberById / getMemberById', () => {
  it('resolves a client member by id but not a non-client', async () => {
    const org = await createOrganization()
    const client = await createMember({
      organizationId: org.id,
      role: 'client',
    })
    const member = await createMember({
      organizationId: org.id,
      role: 'member',
    })

    expect(
      await teamService.getClientMemberById(org.id, client.id)
    ).not.toBeNull()
    expect(await teamService.getClientMemberById(org.id, member.id)).toBeNull()
  })
})

describe('teamService.getAdminAndOwners', () => {
  it('returns only owners and admins', async () => {
    const org = await createOrganization()
    await createMember({ organizationId: org.id, role: 'owner' })
    await createMember({ organizationId: org.id, role: 'admin' })
    await createMember({ organizationId: org.id, role: 'member' })
    await createMember({ organizationId: org.id, role: 'client' })

    const result = await teamService.getAdminAndOwners(org.id)

    expect(result).toHaveLength(2)
  })
})

describe('teamService.getOrgClients', () => {
  it('returns clients with their project assignments', async () => {
    const { org, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)

    const result = await teamService.getOrgClients(org.id)

    expect(result).toHaveLength(1)
    expect(result[0]!.memberId).toBe(client.id)
    expect(result[0]!.projects.map((p) => p.projectId)).toEqual([project.id])
  })
})

describe('teamService.renameTeam', () => {
  it('renames a team in the org', async () => {
    const team = await createTeam({ name: 'Old' })

    const result = await teamService.renameTeam({
      teamId: team.id,
      name: 'New',
      organizationId: team.organizationId,
    })

    expect(result).toEqual({ success: true })
    const [row] = await db.select().from(teams).where(eq(teams.id, team.id))
    expect(row!.name).toBe('New')
  })

  it('throws when the team belongs to another org', async () => {
    const team = await createTeam()
    await expect(
      teamService.renameTeam({
        teamId: team.id,
        name: 'x',
        organizationId: 'org_other',
      })
    ).rejects.toThrow('Team not found')
  })
})

describe('teamService.deleteTeam', () => {
  it('deletes a team when more than one remains', async () => {
    const org = await createOrganization()
    const team = await createTeam({ organizationId: org.id })
    await createTeam({ organizationId: org.id })

    const result = await teamService.deleteTeam({
      teamId: team.id,
      organizationId: org.id,
    })

    expect(result).toEqual({ success: true })
  })

  it('refuses to delete the last team in the workspace', async () => {
    const org = await createOrganization()
    const team = await createTeam({ organizationId: org.id })

    await expect(
      teamService.deleteTeam({ teamId: team.id, organizationId: org.id })
    ).rejects.toThrow('Cannot delete the last team in the workspace')
  })
})

describe('teamService.assignTeam', () => {
  it('assigns a team to a project', async () => {
    const org = await createOrganization()
    const project = await createProject({ organizationId: org.id })
    const team = await createTeam({ organizationId: org.id })

    const assignment = await teamService.assignTeam({
      projectId: project.id,
      teamId: team.id,
      assignedByName: 'Owner',
    })

    expect(assignment.teamId).toBe(team.id)
  })

  it('throws when the team is already assigned', async () => {
    const org = await createOrganization()
    const project = await createProject({ organizationId: org.id })
    const team = await createTeam({ organizationId: org.id })
    await teamService.assignTeam({
      projectId: project.id,
      teamId: team.id,
      assignedByName: null,
    })

    await expect(
      teamService.assignTeam({
        projectId: project.id,
        teamId: team.id,
        assignedByName: null,
      })
    ).rejects.toThrow('Team is already assigned to this project')
  })
})

describe('teamService.assignClientToProject', () => {
  it('assigns a client to a project', async () => {
    const { org, project } = await setupProject()
    const client = await createMember({
      organizationId: org.id,
      role: 'client',
    })

    const result = await teamService.assignClientToProject({
      memberId: client.id,
      projectId: project.id,
      organizationId: org.id,
    })

    expect(result).toEqual({ success: true })
  })

  it('rejects a member that is not a client', async () => {
    const { org, project } = await setupProject()
    const member = await createMember({
      organizationId: org.id,
      role: 'member',
    })

    await expect(
      teamService.assignClientToProject({
        memberId: member.id,
        projectId: project.id,
        organizationId: org.id,
      })
    ).rejects.toThrow('Member is not a client')
  })

  it('rejects assigning the same client twice', async () => {
    const { org, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)

    await expect(
      teamService.assignClientToProject({
        memberId: client.id,
        projectId: project.id,
        organizationId: org.id,
      })
    ).rejects.toThrow('Client is already assigned to this project')
  })
})

describe('teamService.addExistingMember', () => {
  it('assigns an existing org member to the project', async () => {
    const { org, project } = await setupProject()
    const user = await createUser({ email: 'dev@example.com' })
    await createMember({
      organizationId: org.id,
      userId: user.id,
      role: 'member',
    })

    const result = await teamService.addExistingMember({
      project,
      email: 'dev@example.com',
      organizationId: org.id,
      type: 'member',
    })

    expect(result).toEqual({ success: true })
    const rows = await db
      .select()
      .from(projectMemberAssignments)
      .where(eq(projectMemberAssignments.projectId, project.id))
    expect(rows).toHaveLength(1)
  })

  it('throws when the email has no user', async () => {
    const { org, project } = await setupProject()
    await expect(
      teamService.addExistingMember({
        project,
        email: 'ghost@example.com',
        organizationId: org.id,
        type: 'member',
      })
    ).rejects.toThrow('User not found')
  })

  it('throws when the user is not a member of the org', async () => {
    const { org, project } = await setupProject()
    await createUser({ email: 'outside@example.com' })
    await expect(
      teamService.addExistingMember({
        project,
        email: 'outside@example.com',
        organizationId: org.id,
        type: 'member',
      })
    ).rejects.toThrow('User is not a member of this organization')
  })
})

describe('teamService.removeMemberAssignment', () => {
  it('removes the assignment and signals org removal when none remain', async () => {
    const { org, owner, project } = await setupProject()
    const teammate = await addProjectMember(org.id, project.id)
    const [assignment] = await db
      .select()
      .from(projectMemberAssignments)
      .where(eq(projectMemberAssignments.memberId, teammate.id))

    const result = await teamService.removeMemberAssignment({
      assignmentId: assignment!.id,
      orgMember: owner,
    })

    expect(result.memberId).toBe(teammate.id)
    expect(result.shouldRemoveFromOrg).toBe(true)
  })

  it('throws when the assignment does not exist', async () => {
    const { owner } = await setupProject()
    await expect(
      teamService.removeMemberAssignment({
        assignmentId: 'asg_missing',
        orgMember: owner,
      })
    ).rejects.toThrow('Assignment not found')
  })
})

describe('teamService.clearClientAssignments', () => {
  it('clears all of a client’s assignments', async () => {
    const { org, project } = await setupProject()
    const other = await createProject({ organizationId: org.id })
    const client = await createMember({
      organizationId: org.id,
      role: 'client',
    })
    await assignProjectClient(project.id, client.id)
    await assignProjectClient(other.id, client.id)

    const result = await teamService.clearClientAssignments({
      memberId: client.id,
      organizationId: org.id,
    })

    expect(result).toEqual({ success: true })
    const rows = await db
      .select()
      .from(projectClientAssignments)
      .where(eq(projectClientAssignments.memberId, client.id))
    expect(rows).toHaveLength(0)
  })
})

describe('teamService.removeTeamMember', () => {
  it('removes a member from a team', async () => {
    const org = await createOrganization()
    const team = await createTeam({ organizationId: org.id })
    const user = await createUser()
    await createMember({ organizationId: org.id, userId: user.id })
    const teamMember = await addTeamMember(team.id, user.id)

    const result = await teamService.removeTeamMember({
      teamMemberId: teamMember.id,
      organizationId: org.id,
    })

    expect(result).toEqual({ success: true })
  })

  it('throws when the team member belongs to another org', async () => {
    const org = await createOrganization()
    const team = await createTeam({ organizationId: org.id })
    const user = await createUser()
    const teamMember = await addTeamMember(team.id, user.id)

    await expect(
      teamService.removeTeamMember({
        teamMemberId: teamMember.id,
        organizationId: 'org_other',
      })
    ).rejects.toThrow('Team member not found')
  })
})

describe('teamService.assertMemberInOrg', () => {
  it('passes for a member of the org and throws otherwise', async () => {
    const org = await createOrganization()
    const member = await createMember({ organizationId: org.id })

    await expect(
      teamService.assertMemberInOrg(member.id, org.id)
    ).resolves.toBeUndefined()
    await expect(
      teamService.assertMemberInOrg(member.id, 'org_other')
    ).rejects.toThrow('Member not found')
  })
})
