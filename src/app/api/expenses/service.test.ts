import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/server/db'
import {
  expenseCategories,
  expenseRecipients,
  expenses,
  settings,
} from '@/server/db/schema'
import { resetDb } from '../../../../tests/helpers/db'
import {
  activeMemberFor,
  addProjectClient,
  addProjectMember,
  assignProjectMember,
  createExpenseCategory,
  createMember,
  createOrganization,
  createProject,
  setupProject,
} from '../../../../tests/helpers/factories'
import { expensesServices } from './service'

beforeEach(async () => {
  await resetDb()
})

/**
 * The shared project baseline plus an expense category — expenses are driven
 * through the service's own mutations so the tests exercise the real state
 * machine.
 */
async function setup() {
  const base = await setupProject()
  const category = await createExpenseCategory({ organizationId: base.org.id })
  return { ...base, category }
}

async function disableClientExpenses(orgId: string) {
  await db.insert(settings).values({
    organizationId: orgId,
    clientInvolvement: {
      proposals: 'on',
      requirements: 'on',
      milestones: 'on',
      timesheets: 'on',
      expenses: 'off',
      invoices: 'on',
    },
  })
}

const draftFor = (
  category: { id: string },
  over: Record<string, unknown> = {}
) => ({
  title: 'Taxi',
  amountCents: 2500,
  currency: 'USD',
  date: '2026-01-15',
  categoryId: category.id,
  milestoneId: null,
  billable: true,
  recurring: false,
  description: null,
  receiptMediaId: null,
  ...over,
})

const statusOf = async (id: string) => {
  const [row] = await db.select().from(expenses).where(eq(expenses.id, id))
  return row!.status
}

describe('expensesServices.create', () => {
  it('auto-approves an admin/owner expense to admin_accepted by default', async () => {
    const { owner, project, category } = await setup()

    const expense = await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })

    expect(expense!.status).toBe('admin_accepted')
    expect(expense!.memberId).toBe(owner.id)
    expect(expense!.amountCents).toBe(2500)
  })

  it('auto-approves straight to client_accepted when client involvement is off', async () => {
    const { org, owner, project, category } = await setup()
    await disableClientExpenses(org.id)

    const expense = await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })

    expect(expense!.status).toBe('client_accepted')
  })

  it('creates a non-admin expense as draft', async () => {
    const { org, project, category } = await setup()
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )

    const expense = await expensesServices.create({
      project,
      orgMember: teammate,
      ...draftFor(category),
    })

    expect(expense!.status).toBe('draft')
  })
})

describe('expensesServices.listByProject', () => {
  it('returns every expense for an admin/owner', async () => {
    const { org, owner, project, category } = await setup()
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )
    await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })
    await expensesServices.create({
      project,
      orgMember: teammate,
      ...draftFor(category),
    })

    const result = await expensesServices.listByProject({
      projectId: project.id,
      memberId: owner.id,
      role: 'owner',
    })

    expect(result).toHaveLength(2)
  })

  it('shows a member only their own expenses', async () => {
    const { org, owner, project, category } = await setup()
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )
    await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })
    const own = await expensesServices.create({
      project,
      orgMember: teammate,
      ...draftFor(category),
    })

    const result = await expensesServices.listByProject({
      projectId: project.id,
      memberId: teammate.id,
      role: 'member',
    })

    expect(result.map((e) => e.id)).toEqual([own!.id])
  })

  it('shows a client only client-visible expenses they are a recipient of', async () => {
    const { org, owner, project, category } = await setup()
    const client = await addProjectClient(org.id, project.id)

    const sent = await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })
    await expensesServices.sendToClient({
      expenseIds: [sent!.id],
      clientMemberIds: [client.id],
      orgMember: owner,
    })

    // An admin_accepted expense the client was never sent stays hidden.
    await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })

    const result = await expensesServices.listByProject({
      projectId: project.id,
      memberId: client.id,
      role: 'client',
    })

    expect(result.map((e) => e.id)).toEqual([sent!.id])
    expect(result[0]!.status).toBe('submitted_to_client')
  })
})

describe('expensesServices.listByProjectIds', () => {
  it('returns [] when no ids are given', async () => {
    expect(await expensesServices.listByProjectIds([])).toEqual([])
  })

  it('does not bleed expenses across projects', async () => {
    const { owner, project, category } = await setup()
    const other = await createProject()
    const otherCategory = await createExpenseCategory({
      organizationId: other.organizationId,
    })
    const otherOwner = await activeMemberFor(
      await createMember({
        organizationId: other.organizationId,
        role: 'owner',
      })
    )
    await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })
    await expensesServices.create({
      project: other,
      orgMember: otherOwner,
      ...draftFor(otherCategory),
    })

    const result = await expensesServices.listByProjectIds([project.id])

    expect(result).toHaveLength(1)
    expect(result[0]!.projectId).toBe(project.id)
  })
})

describe('expensesServices.listCategoriesByOrg', () => {
  it('returns categories for the org ordered by sortOrder', async () => {
    const org = await createOrganization()
    await createExpenseCategory({
      organizationId: org.id,
      name: 'Second',
      sortOrder: 1,
    })
    await createExpenseCategory({
      organizationId: org.id,
      name: 'First',
      sortOrder: 0,
    })
    // A category in another org must not leak in.
    await createExpenseCategory({ name: 'Other org' })

    const result = await expensesServices.listCategoriesByOrg(org.id)

    expect(result.map((c) => c.name)).toEqual(['First', 'Second'])
  })
})

describe('expensesServices.listUnpaidExpensesByProject', () => {
  it('returns [] when the user has no access to the project', async () => {
    const { org, owner, project, category } = await setup()
    await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })
    const outsider = await createMember({
      organizationId: org.id,
      role: 'member',
    })

    const result = await expensesServices.listUnpaidExpensesByProject(
      org.id,
      project.id,
      outsider.userId
    )

    expect(result).toEqual([])
  })

  it('returns client_accepted, un-invoiced expenses for an authorized user', async () => {
    const { org, owner, ownerMember, project, category } = await setup()
    await disableClientExpenses(org.id)
    // With client involvement off, owner expenses land in client_accepted.
    const accepted = await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })

    const result = await expensesServices.listUnpaidExpensesByProject(
      org.id,
      project.id,
      ownerMember.userId
    )

    expect(result.map((e) => e.id)).toEqual([accepted!.id])
  })
})

describe('expensesServices.update', () => {
  it('throws when the expense does not exist', async () => {
    const { owner } = await setup()
    await expect(
      expensesServices.update({
        expenseId: 'exp_missing',
        orgMember: owner,
        updates: { title: 'x' },
      })
    ).rejects.toThrow('Expense not found')
  })

  it('lets an admin edit any expense', async () => {
    const { owner, project, category } = await setup()
    const expense = await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })

    const updated = await expensesServices.update({
      expenseId: expense!.id,
      orgMember: owner,
      updates: { title: 'Updated', amountCents: 9999 },
    })

    expect(updated!.title).toBe('Updated')
    expect(updated!.amountCents).toBe(9999)
  })

  it('forbids a member from editing someone else’s expense', async () => {
    const { org, owner, project, category } = await setup()
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )
    const expense = await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })

    await expect(
      expensesServices.update({
        expenseId: expense!.id,
        orgMember: teammate,
        updates: { title: 'nope' },
      })
    ).rejects.toThrow('You can only edit your own expenses')
  })

  it('forbids a member from editing a non-draft expense', async () => {
    const { org, project, category } = await setup()
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )
    const expense = await expensesServices.create({
      project,
      orgMember: teammate,
      ...draftFor(category),
    })
    await expensesServices.submit({
      expenseIds: [expense!.id],
      orgMember: teammate,
    })

    await expect(
      expensesServices.update({
        expenseId: expense!.id,
        orgMember: teammate,
        updates: { title: 'nope' },
      })
    ).rejects.toThrow('Only draft or rejected expenses can be edited')
  })

  it('resets a rejected expense back to draft when its owner edits it', async () => {
    const { org, owner, project, category } = await setup()
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )
    const expense = await expensesServices.create({
      project,
      orgMember: teammate,
      ...draftFor(category),
    })
    await expensesServices.submit({
      expenseIds: [expense!.id],
      orgMember: teammate,
    })
    await expensesServices.reject({
      expenseIds: [expense!.id],
      reason: 'fix it',
      orgMember: owner,
    })

    const updated = await expensesServices.update({
      expenseId: expense!.id,
      orgMember: teammate,
      updates: { title: 'fixed' },
    })

    expect(updated!.status).toBe('draft')
    expect(updated!.rejectReason).toBeNull()
  })
})

describe('expensesServices.remove', () => {
  it('throws when the expense does not exist', async () => {
    const { owner } = await setup()
    await expect(
      expensesServices.remove({ expenseId: 'exp_missing', orgMember: owner })
    ).rejects.toThrow('Expense not found')
  })

  it('lets a member delete their own draft', async () => {
    const { org, project, category } = await setup()
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )
    const expense = await expensesServices.create({
      project,
      orgMember: teammate,
      ...draftFor(category),
    })

    const result = await expensesServices.remove({
      expenseId: expense!.id,
      orgMember: teammate,
    })

    expect(result).toEqual({ success: true })
    const rows = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expense!.id))
    expect(rows).toHaveLength(0)
  })

  it('forbids a member from deleting a non-draft expense', async () => {
    const { org, project, category } = await setup()
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )
    const expense = await expensesServices.create({
      project,
      orgMember: teammate,
      ...draftFor(category),
    })
    await expensesServices.submit({
      expenseIds: [expense!.id],
      orgMember: teammate,
    })

    await expect(
      expensesServices.remove({ expenseId: expense!.id, orgMember: teammate })
    ).rejects.toThrow('Only draft expenses can be deleted')
  })
})

describe('expensesServices.submit', () => {
  it('throws when no expenses are found', async () => {
    const { owner } = await setup()
    await expect(
      expensesServices.submit({ expenseIds: ['exp_missing'], orgMember: owner })
    ).rejects.toThrow('No expenses found')
  })

  it('rejects expenses spanning multiple projects', async () => {
    const { org, project, category } = await setup()
    const projectB = await createProject({ organizationId: org.id })
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )
    await assignProjectMember(projectB.id, teammate.id)
    const a = await expensesServices.create({
      project,
      orgMember: teammate,
      ...draftFor(category),
    })
    const b = await expensesServices.create({
      project: projectB,
      orgMember: teammate,
      ...draftFor(category),
    })

    await expect(
      expensesServices.submit({
        expenseIds: [a!.id, b!.id],
        orgMember: teammate,
      })
    ).rejects.toThrow('All expenses must belong to the same project')
  })

  it('moves a draft to submitted_to_admin', async () => {
    const { org, project, category } = await setup()
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )
    const expense = await expensesServices.create({
      project,
      orgMember: teammate,
      ...draftFor(category),
    })

    const result = await expensesServices.submit({
      expenseIds: [expense!.id],
      orgMember: teammate,
    })

    expect(result).toEqual({ success: true })
    expect(await statusOf(expense!.id)).toBe('submitted_to_admin')
  })

  it('forbids submitting someone else’s expense', async () => {
    const { org, owner, project, category } = await setup()
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )
    const expense = await expensesServices.create({
      project,
      orgMember: teammate,
      ...draftFor(category),
    })

    await expect(
      expensesServices.submit({ expenseIds: [expense!.id], orgMember: owner })
    ).rejects.toThrow('You can only submit your own expenses')
  })
})

describe('expensesServices.approve', () => {
  async function submitted() {
    const ctx = await setup()
    const teammate = await activeMemberFor(
      await addProjectMember(ctx.org.id, ctx.project.id)
    )
    const expense = await expensesServices.create({
      project: ctx.project,
      orgMember: teammate,
      ...draftFor(ctx.category),
    })
    await expensesServices.submit({
      expenseIds: [expense!.id],
      orgMember: teammate,
    })
    return { ...ctx, teammate, expense: expense! }
  }

  it('approves a submitted expense to admin_accepted by default', async () => {
    const { owner, expense } = await submitted()

    const result = await expensesServices.approve({
      expenseIds: [expense.id],
      orgMember: owner,
    })

    expect(result).toEqual({ success: true })
    expect(await statusOf(expense.id)).toBe('admin_accepted')
  })

  it('approves straight to client_accepted when client involvement is off', async () => {
    const { org, owner, expense } = await submitted()
    await disableClientExpenses(org.id)

    await expensesServices.approve({
      expenseIds: [expense.id],
      orgMember: owner,
    })

    expect(await statusOf(expense.id)).toBe('client_accepted')
  })

  it('refuses to approve an expense that was never submitted', async () => {
    const { owner, project, category } = await setup()
    const expense = await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })

    await expect(
      expensesServices.approve({ expenseIds: [expense!.id], orgMember: owner })
    ).rejects.toThrow('Only submitted expenses can be approved')
  })
})

describe('expensesServices.reject', () => {
  it('rejects a submitted expense with a reason', async () => {
    const { org, owner, project, category } = await setup()
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )
    const expense = await expensesServices.create({
      project,
      orgMember: teammate,
      ...draftFor(category),
    })
    await expensesServices.submit({
      expenseIds: [expense!.id],
      orgMember: teammate,
    })

    const result = await expensesServices.reject({
      expenseIds: [expense!.id],
      reason: 'missing receipt',
      orgMember: owner,
    })

    expect(result).toEqual({ success: true })
    const [row] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expense!.id))
    expect(row!.status).toBe('admin_rejected')
    expect(row!.rejectReason).toBe('missing receipt')
  })

  it('refuses to reject an expense that was never submitted', async () => {
    const { owner, project, category } = await setup()
    const expense = await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })

    await expect(
      expensesServices.reject({
        expenseIds: [expense!.id],
        reason: 'x',
        orgMember: owner,
      })
    ).rejects.toThrow('Only submitted expenses can be rejected')
  })
})

describe('expensesServices.sendToClient', () => {
  it('refuses when client involvement is off', async () => {
    const { org, owner, project, category } = await setup()
    await disableClientExpenses(org.id)
    const client = await addProjectClient(org.id, project.id)
    const expense = await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })

    await expect(
      expensesServices.sendToClient({
        expenseIds: [expense!.id],
        clientMemberIds: [client.id],
        orgMember: owner,
      })
    ).rejects.toThrow(
      'Client involvement is disabled for expenses in this project'
    )
  })

  it('refuses to send an expense that is not admin-approved', async () => {
    const { org, owner, project, category } = await setup()
    const teammate = await activeMemberFor(
      await addProjectMember(org.id, project.id)
    )
    const client = await addProjectClient(org.id, project.id)
    const expense = await expensesServices.create({
      project,
      orgMember: teammate,
      ...draftFor(category),
    })

    await expect(
      expensesServices.sendToClient({
        expenseIds: [expense!.id],
        clientMemberIds: [client.id],
        orgMember: owner,
      })
    ).rejects.toThrow(
      'Only admin-approved or client-rejected expenses can be sent to client'
    )
  })

  it('refuses a client without project access', async () => {
    const { org, owner, project, category } = await setup()
    // Client exists in the org but is not assigned to the project.
    const unassigned = await createMember({
      organizationId: org.id,
      role: 'client',
    })
    const expense = await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })

    await expect(
      expensesServices.sendToClient({
        expenseIds: [expense!.id],
        clientMemberIds: [unassigned.id],
        orgMember: owner,
      })
    ).rejects.toThrow('Selected client does not have access to this project')
  })

  it('sends an approved expense to the client and records recipients', async () => {
    const { org, owner, project, category } = await setup()
    const client = await addProjectClient(org.id, project.id)
    const expense = await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })

    const result = await expensesServices.sendToClient({
      expenseIds: [expense!.id],
      clientMemberIds: [client.id],
      orgMember: owner,
    })

    expect(result).toEqual({ success: true })
    expect(await statusOf(expense!.id)).toBe('submitted_to_client')
    const recipients = await db
      .select()
      .from(expenseRecipients)
      .where(eq(expenseRecipients.expenseId, expense!.id))
    expect(recipients.map((r) => r.clientMemberId)).toEqual([client.id])
    expect(recipients[0]!.status).toBe('pending')
  })
})

describe('expensesServices.clientRespond', () => {
  async function sent() {
    const ctx = await setup()
    const client = await addProjectClient(ctx.org.id, ctx.project.id)
    const expense = await expensesServices.create({
      project: ctx.project,
      orgMember: ctx.owner,
      ...draftFor(ctx.category),
    })
    await expensesServices.sendToClient({
      expenseIds: [expense!.id],
      clientMemberIds: [client.id],
      orgMember: ctx.owner,
    })
    return { ...ctx, client, expense: expense! }
  }

  it('marks the expense client_accepted once all recipients approve', async () => {
    const { client, expense } = await sent()

    const result = await expensesServices.clientRespond({
      expenseIds: [expense.id],
      action: 'approve',
      orgMember: await activeMemberFor(client),
    })

    expect(result).toEqual({ success: true })
    expect(await statusOf(expense.id)).toBe('client_accepted')
  })

  it('marks the expense client_rejected with the reason', async () => {
    const { client, expense } = await sent()

    await expensesServices.clientRespond({
      expenseIds: [expense.id],
      action: 'reject',
      reason: 'too expensive',
      orgMember: await activeMemberFor(client),
    })

    const [row] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expense.id))
    expect(row!.status).toBe('client_rejected')
    expect(row!.rejectReason).toBe('too expensive')
  })

  it('refuses to respond to an expense that was not sent to the client', async () => {
    const { org, owner, project, category } = await setup()
    const client = await addProjectClient(org.id, project.id)
    const expense = await expensesServices.create({
      project,
      orgMember: owner,
      ...draftFor(category),
    })

    await expect(
      expensesServices.clientRespond({
        expenseIds: [expense!.id],
        action: 'approve',
        orgMember: await activeMemberFor(client),
      })
    ).rejects.toThrow('Only sent expenses can be responded to')
  })

  it('refuses a client who is not a recipient', async () => {
    const { org, project, expense } = await sent()
    const outsider = await addProjectClient(org.id, project.id)

    await expect(
      expensesServices.clientRespond({
        expenseIds: [expense.id],
        action: 'approve',
        orgMember: await activeMemberFor(outsider),
      })
    ).rejects.toThrow(
      'You are not a recipient of one or more of these expenses'
    )
  })

  it('refuses a client who has already responded', async () => {
    const { client, expense } = await sent()
    const member = await activeMemberFor(client)
    await expensesServices.clientRespond({
      expenseIds: [expense.id],
      action: 'approve',
      orgMember: member,
    })

    await expect(
      expensesServices.clientRespond({
        expenseIds: [expense.id],
        action: 'approve',
        orgMember: member,
      })
    ).rejects.toThrow('Only sent expenses can be responded to')
  })
})

describe('expensesServices.createCategory', () => {
  it('creates a category for the org', async () => {
    const org = await createOrganization()

    const category = await expensesServices.createCategory({
      organizationId: org.id,
      name: 'Travel',
      color: '#ff0000',
    })

    expect(category!.name).toBe('Travel')
    expect(category!.color).toBe('#ff0000')
    expect(category!.organizationId).toBe(org.id)
  })

  it('stores null when no color is given', async () => {
    const org = await createOrganization()

    const category = await expensesServices.createCategory({
      organizationId: org.id,
      name: 'Misc',
      color: null,
    })

    expect(category!.color).toBeNull()
  })
})

describe('expensesServices.updateCategory', () => {
  it('updates name and color', async () => {
    const category = await createExpenseCategory()

    const updated = await expensesServices.updateCategory({
      categoryId: category.id,
      organizationId: category.organizationId,
      name: 'Renamed',
      color: '#00ff00',
    })

    expect(updated!.name).toBe('Renamed')
    expect(updated!.color).toBe('#00ff00')
  })

  it('throws when the category does not exist', async () => {
    await expect(
      expensesServices.updateCategory({
        categoryId: 'ec_missing',
        organizationId: 'org_x',
        name: 'x',
      })
    ).rejects.toThrow('Category not found')
  })

  it('throws when the category belongs to another org', async () => {
    const category = await createExpenseCategory()

    await expect(
      expensesServices.updateCategory({
        categoryId: category.id,
        organizationId: 'org_other',
        name: 'x',
      })
    ).rejects.toThrow('Category not found')
  })
})

describe('expensesServices.archiveCategory', () => {
  it('toggles the archived flag', async () => {
    const category = await createExpenseCategory()

    await expensesServices.archiveCategory({
      categoryId: category.id,
      organizationId: category.organizationId,
    })
    const [archived] = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.id, category.id))
    expect(archived!.isArchived).toBe(true)

    await expensesServices.archiveCategory({
      categoryId: category.id,
      organizationId: category.organizationId,
    })
    const [restored] = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.id, category.id))
    expect(restored!.isArchived).toBe(false)
  })

  it('throws when the category belongs to another org', async () => {
    const category = await createExpenseCategory()

    await expect(
      expensesServices.archiveCategory({
        categoryId: category.id,
        organizationId: 'org_other',
      })
    ).rejects.toThrow('Category not found')
  })
})
