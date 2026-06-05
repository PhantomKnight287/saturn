import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ActiveMember } from '@/server/access/project-access'
import { db } from '@/server/db'
import { memberRates, settings, timeEntries } from '@/server/db/schema'
import { resetDb } from '../../../../tests/helpers/db'
import {
  activeMemberFor,
  addProjectClient,
  addProjectMember,
  createInvoice,
  setupProject,
} from '../../../../tests/helpers/factories'
import { timesheetService } from './service'

beforeEach(async () => {
  await resetDb()
})

const DATE = '2026-01-15'

async function setOrgPayDefault(organizationId: string, payRate = 6000) {
  await db
    .insert(settings)
    .values({ organizationId, payRate, payCurrency: 'USD' })
}

async function setOwnerRate(owner: ActiveMember, projectId: string) {
  await timesheetService.setMemberRate({
    memberId: owner.id,
    projectId,
    orgMember: owner,
    effectiveFrom: '2026-01-01',
    payRate: 6000,
    payCurrency: 'USD',
    payFrequency: 'hourly',
    billingRate: 9000,
    billingCurrency: 'USD',
    billingFrequency: 'hourly',
  })
}

const entryInput = (over: Record<string, unknown> = {}) => ({
  description: 'Worked on the build',
  date: DATE,
  durationMinutes: 120,
  billable: true,
  requirementId: null,
  customValues: {},
  ...over,
})

describe('timesheetService.createEntry', () => {
  it('creates a draft entry for a plain member', async () => {
    const { org, project } = await setupProject()
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )

    const entry = await timesheetService.createEntry({
      project,
      orgMember: teammate,
      ...entryInput(),
    })

    expect(entry!.status).toBe('draft')
    expect(entry!.memberId).toBe(teammate.id)
  })

  it('auto-approves an admin entry when a rate is configured', async () => {
    const { owner, project } = await setupProject()
    await setOwnerRate(owner, project.id)

    const entry = await timesheetService.createEntry({
      project,
      orgMember: owner,
      ...entryInput(),
    })

    expect(entry!.status).toBe('admin_accepted')
  })

  it('refuses an admin entry when no rate or default is configured', async () => {
    const { owner, project } = await setupProject()

    await expect(
      timesheetService.createEntry({
        project,
        orgMember: owner,
        ...entryInput(),
      })
    ).rejects.toThrow('No member rate or default pay rate is configured')
  })
})

describe('timesheetService.updateEntry', () => {
  it('lets a member edit their own draft', async () => {
    const { org, project } = await setupProject()
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )
    const entry = await timesheetService.createEntry({
      project,
      orgMember: teammate,
      ...entryInput(),
    })

    const updated = await timesheetService.updateEntry({
      timeEntryId: entry!.id,
      orgMember: teammate,
      description: 'Updated',
      durationMinutes: 90,
    })

    expect(updated!.description).toBe('Updated')
    expect(updated!.durationMinutes).toBe(90)
  })

  it('forbids editing someone else’s entry as a member', async () => {
    const { org, project } = await setupProject()
    const a = await activeMemberFor(await addProjectMember(org.id, project.id))
    const b = await activeMemberFor(await addProjectMember(org.id, project.id))
    const entry = await timesheetService.createEntry({
      project,
      orgMember: a,
      ...entryInput(),
    })

    await expect(
      timesheetService.updateEntry({
        timeEntryId: entry!.id,
        orgMember: b,
        description: 'nope',
      })
    ).rejects.toThrow('You can only edit your own time entries')
  })

  it('freezes an entry that has been accepted by the client', async () => {
    const { owner, project } = await setupProject()
    await setOwnerRate(owner, project.id)
    const entry = await timesheetService.createEntry({
      project,
      orgMember: owner,
      ...entryInput(),
    })
    await db
      .update(timeEntries)
      .set({ status: 'client_accepted' })
      .where(eq(timeEntries.id, entry!.id))

    await expect(
      timesheetService.updateEntry({
        timeEntryId: entry!.id,
        orgMember: owner,
        description: 'nope',
      })
    ).rejects.toThrow('can no longer be edited')
  })
})

describe('timesheetService.submit / approve / reject', () => {
  async function draft() {
    const ctx = await setupProject()
    const teammate = await activeMemberFor(
      await addProjectMember(ctx.org.id, ctx.project.id)
    )
    const entry = await timesheetService.createEntry({
      project: ctx.project,
      orgMember: teammate,
      ...entryInput(),
    })
    return { ...ctx, teammate, entry: entry! }
  }

  it('submits a draft to submitted_to_admin', async () => {
    const { teammate, entry } = await draft()

    const result = await timesheetService.submit({
      timeEntryIds: [entry.id],
      orgMember: teammate,
    })

    expect(result).toEqual({ success: true })
    const [row] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, entry.id))
    expect(row!.status).toBe('submitted_to_admin')
  })

  it('approves a submitted entry seeding the rate from the org default', async () => {
    const { org, owner, teammate, entry } = await draft()
    await setOrgPayDefault(org.id)
    await timesheetService.submit({
      timeEntryIds: [entry.id],
      orgMember: teammate,
    })

    const result = await timesheetService.approve({
      timeEntryIds: [entry.id],
      orgMember: owner,
    })

    expect(result).toEqual({ success: true })
    const [row] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, entry.id))
    expect(row!.status).toBe('admin_accepted')
  })

  it('rejects a submitted entry with a reason', async () => {
    const { owner, teammate, entry } = await draft()
    await timesheetService.submit({
      timeEntryIds: [entry.id],
      orgMember: teammate,
    })

    const result = await timesheetService.reject({
      timeEntryIds: [entry.id],
      reason: 'wrong project',
      orgMember: owner,
    })

    expect(result).toEqual({ success: true })
    const [row] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, entry.id))
    expect(row!.status).toBe('admin_rejected')
    expect(row!.rejectReason).toBe('wrong project')
  })

  it('refuses to approve an entry that was never submitted', async () => {
    const { owner, entry } = await draft()
    await expect(
      timesheetService.approve({ timeEntryIds: [entry.id], orgMember: owner })
    ).rejects.toThrow('Only submitted entries can be approved')
  })
})

describe('timesheetService.deleteEntry', () => {
  it('lets a member delete their own draft', async () => {
    const { org, project } = await setupProject()
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )
    const entry = await timesheetService.createEntry({
      project,
      orgMember: teammate,
      ...entryInput(),
    })

    const result = await timesheetService.deleteEntry({
      timeEntryId: entry!.id,
      orgMember: teammate,
    })

    expect(result).toEqual({ success: true })
    const rows = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, entry!.id))
    expect(rows).toHaveLength(0)
  })

  it('throws when the entry does not exist', async () => {
    const { owner } = await setupProject()
    await expect(
      timesheetService.deleteEntry({
        timeEntryId: 'te_missing',
        orgMember: owner,
      })
    ).rejects.toThrow('Time entry not found')
  })
})

describe('timesheetService.setMemberRate', () => {
  it('creates a member rate', async () => {
    const { owner, project } = await setupProject()

    const rate = await timesheetService.setMemberRate({
      memberId: owner.id,
      projectId: project.id,
      orgMember: owner,
      effectiveFrom: '2026-01-01',
      payRate: 5000,
      payCurrency: 'USD',
      payFrequency: 'hourly',
      billingRate: 7000,
      billingCurrency: 'USD',
      billingFrequency: 'hourly',
    })

    expect(rate!.payRate).toBe(5000)
    expect(rate!.billingRate).toBe(7000)
  })

  it('throws when the target member is not in the org', async () => {
    const { owner } = await setupProject()
    await expect(
      timesheetService.setMemberRate({
        memberId: 'mem_missing',
        orgMember: owner,
        effectiveFrom: '2026-01-01',
        payRate: 5000,
        payCurrency: 'USD',
        payFrequency: 'hourly',
        billingRate: 5000,
        billingCurrency: 'USD',
        billingFrequency: 'hourly',
      })
    ).rejects.toThrow('Member not found')
  })
})

describe('timesheetService.getMemberRate', () => {
  it('prefers a project rate over the org-level rate', async () => {
    const { owner, project } = await setupProject()
    await db.insert(memberRates).values([
      {
        memberId: owner.id,
        projectId: null,
        payRate: 1000,
        payCurrency: 'USD',
        payFrequency: 'hourly',
        billingRate: 1000,
        billingCurrency: 'USD',
        billingFrequency: 'hourly',
        effectiveFrom: '2026-01-01',
      },
      {
        memberId: owner.id,
        projectId: project.id,
        payRate: 2000,
        payCurrency: 'USD',
        payFrequency: 'hourly',
        billingRate: 2000,
        billingCurrency: 'USD',
        billingFrequency: 'hourly',
        effectiveFrom: '2026-01-01',
      },
    ])

    const rate = await timesheetService.getMemberRate(
      owner.id,
      project.id,
      '2026-06-01'
    )

    expect(rate!.projectId).toBe(project.id)
    expect(rate!.payRate).toBe(2000)
  })
})

describe('timesheetService.setProjectBudget / getProjectBudgetStatus', () => {
  it('upserts a budget and reports usage from approved entries', async () => {
    const { owner, project } = await setupProject()
    await setOwnerRate(owner, project.id)
    await timesheetService.setProjectBudget({
      projectId: project.id,
      budgetMinutes: 600,
      alertThreshold: 80,
    })
    // An admin entry is auto-approved → counts toward the budget.
    await timesheetService.createEntry({
      project,
      orgMember: owner,
      ...entryInput({ durationMinutes: 300 }),
    })

    const status = await timesheetService.getProjectBudgetStatus(project.id)

    expect(status!.budget.budgetMinutes).toBe(600)
    expect(status!.totalApprovedMinutes).toBe(300)
    expect(status!.percentageUsed).toBe(50)
  })

  it('returns null when the project has no budget', async () => {
    const { project } = await setupProject()
    expect(await timesheetService.getProjectBudgetStatus(project.id)).toBeNull()
  })
})

describe('timesheetService.linkToInvoice', () => {
  it('links entries to an invoice in the same project', async () => {
    const { owner, project } = await setupProject()
    await setOwnerRate(owner, project.id)
    const entry = await timesheetService.createEntry({
      project,
      orgMember: owner,
      ...entryInput(),
    })
    const invoice = await createInvoice({ projectId: project.id })

    const result = await timesheetService.linkToInvoice({
      timeEntryIds: [entry!.id],
      invoiceId: invoice.id,
      orgMember: owner,
    })

    expect(result).toEqual({ success: true })
    const [row] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, entry!.id))
    expect(row!.invoiceId).toBe(invoice.id)
  })

  it('refuses an invoice from another project', async () => {
    const { owner, project } = await setupProject()
    await setOwnerRate(owner, project.id)
    const entry = await timesheetService.createEntry({
      project,
      orgMember: owner,
      ...entryInput(),
    })
    const foreignInvoice = await createInvoice()

    await expect(
      timesheetService.linkToInvoice({
        timeEntryIds: [entry!.id],
        invoiceId: foreignInvoice.id,
        orgMember: owner,
      })
    ).rejects.toThrow('Invoice not found in this project')
  })
})

describe('timesheetService.sendToClient / respondReport', () => {
  async function sentReport() {
    const ctx = await setupProject()
    await setOwnerRate(ctx.owner, ctx.project.id)
    const client = await addProjectClient(ctx.org.id, ctx.project.id)
    const entry = await timesheetService.createEntry({
      project: ctx.project,
      orgMember: ctx.owner,
      ...entryInput(),
    })
    const report = await timesheetService.sendToClient({
      project: ctx.project,
      orgMember: ctx.owner,
      clientMemberIds: [client.id],
      title: 'January',
      timeEntryIds: [entry!.id],
    })
    return { ...ctx, client, entry: entry!, report: report! }
  }

  it('creates a report and submits the entries to the client', async () => {
    const { entry, report } = await sentReport()

    expect(report.status).toBe('sent')
    const [row] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, entry.id))
    expect(row!.status).toBe('submitted_to_client')
  })

  it('refuses to send entries that are not approved', async () => {
    const { org, owner, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )
    const entry = await timesheetService.createEntry({
      project,
      orgMember: teammate,
      ...entryInput(),
    })

    await expect(
      timesheetService.sendToClient({
        project,
        orgMember: owner,
        clientMemberIds: [client.id],
        title: 'x',
        timeEntryIds: [entry!.id],
      })
    ).rejects.toThrow('Only approved entries can be sent to clients')
  })

  it('approves the report and accepts the entries when the client approves', async () => {
    const { client, entry, report } = await sentReport()

    const result = await timesheetService.respondReport({
      reportId: report.id,
      action: 'approve',
      orgMember: await activeMemberFor(client),
    })

    expect(result).toEqual({ success: true })
    const [row] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, entry.id))
    expect(row!.status).toBe('client_accepted')
  })

  it('disputes the report and rejects the entries', async () => {
    const { client, entry, report } = await sentReport()

    await timesheetService.respondReport({
      reportId: report.id,
      action: 'dispute',
      reason: 'hours look high',
      orgMember: await activeMemberFor(client),
    })

    const [row] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, entry.id))
    expect(row!.status).toBe('client_rejected')
  })
})
