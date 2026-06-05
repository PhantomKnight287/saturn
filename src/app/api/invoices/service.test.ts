import { createId } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/server/db'
import { invoices, requirements, threads } from '@/server/db/schema'
import { resetDb } from '../../../../tests/helpers/db'
import {
  activeMemberFor,
  addProjectClient,
  addProjectMember,
  createInvoice,
  createMember,
  createProject,
  setupProject,
} from '../../../../tests/helpers/factories'
import { invoicesService } from './service'

beforeEach(async () => {
  await resetDb()
})

const item = (over: Record<string, unknown> = {}) => ({
  description: 'Work',
  quantity: '1',
  unitPrice: '100',
  amount: '100',
  ...over,
})

const makeDetails = (over: Record<string, unknown> = {}) =>
  ({
    invoiceNumber: `INV-${createId().slice(0, 8)}`,
    issueDate: new Date('2026-01-01'),
    currency: 'USD',
    clientMemberIds: [] as string[],
    items: [item()],
    ...over,
  }) as Parameters<typeof invoicesService.create>[0]['details']

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

describe('invoicesService.create', () => {
  it('creates a client draft invoice and computes the total', async () => {
    const { owner, project } = await setupProject()

    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails({
        items: [item({ amount: '100' }), item({ amount: '50' })],
      }),
    })

    expect(invoice!.recipient).toBe('client')
    expect(invoice!.status).toBe('draft')
    expect(Number(invoice!.totalAmount)).toBe(150)
  })

  it('creates a member invoice as sent', async () => {
    const { org, owner, project } = await setupProject()
    const teammate = await addProjectMember(org.id, project.id)

    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'member',
      details: makeDetails({ clientMemberIds: [teammate.id] }),
    })

    expect(invoice!.recipient).toBe('member')
    expect(invoice!.status).toBe('sent')
  })

  it('rejects a member invoice without exactly one recipient', async () => {
    const { owner, project } = await setupProject()

    await expect(
      invoicesService.create({
        project,
        orgMember: owner,
        recipientType: 'member',
        details: makeDetails({ clientMemberIds: [] }),
      })
    ).rejects.toThrow('Member invoices must have exactly one recipient member')
  })

  it('rejects recipients that do not belong to the organization', async () => {
    const { owner, project } = await setupProject()

    await expect(
      invoicesService.create({
        project,
        orgMember: owner,
        recipientType: 'client',
        details: makeDetails({ clientMemberIds: ['mem_does_not_exist'] }),
      })
    ).rejects.toThrow(
      'One or more recipients are invalid for this organization'
    )
  })

  it('rejects expenses that do not belong to the project', async () => {
    const { owner, project } = await setupProject()

    await expect(
      invoicesService.create({
        project,
        orgMember: owner,
        recipientType: 'client',
        details: makeDetails({ expenseIds: ['exp_nope'] }),
      })
    ).rejects.toThrow('One or more expenses are invalid for this project')
  })

  it('rejects a duplicate invoice number within the same project', async () => {
    const { owner, project } = await setupProject()
    const invoiceNumber = 'INV-DUP-1'
    await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails({ invoiceNumber }),
    })

    await expect(
      invoicesService.create({
        project,
        orgMember: owner,
        recipientType: 'client',
        details: makeDetails({ invoiceNumber }),
      })
    ).rejects.toThrow('An invoice with same invoice number already exists.')
  })

  it('snapshots the conversion rates used to price the items', async () => {
    const { owner, project } = await setupProject()
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails({
        currency: 'USD',
        items: [item({ sourceCurrency: 'EUR', rateUsed: 1.1 })],
      }),
    })

    const rates = await invoicesService.getConversionRates(invoice!.id)
    expect(rates).toHaveLength(1)
    expect(rates[0]!.fromCurrency).toBe('EUR')
    expect(rates[0]!.toCurrency).toBe('USD')
    expect(Number(rates[0]!.rate)).toBe(1.1)
  })
})

describe('invoicesService.getNextSequence', () => {
  it('returns 1 for a project with no invoices', async () => {
    const project = await createProject()
    expect(await invoicesService.getNextSequence(project.id)).toBe(1)
  })

  it('returns the count plus one', async () => {
    const project = await createProject()
    await createInvoice({ projectId: project.id })
    await createInvoice({ projectId: project.id })
    expect(await invoicesService.getNextSequence(project.id)).toBe(3)
  })
})

describe('invoicesService.getItems', () => {
  it('returns items ordered by sort order', async () => {
    const { owner, project } = await setupProject()
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails({
        items: [
          item({ description: 'First' }),
          item({ description: 'Second' }),
          item({ description: 'Third' }),
        ],
      }),
    })

    const items = await invoicesService.getItems(invoice!.id)
    expect(items.map((i) => i.description)).toEqual([
      'First',
      'Second',
      'Third',
    ])
    expect(items.map((i) => i.sortOrder)).toEqual([0, 1, 2])
  })
})

describe('invoicesService.getRecipients', () => {
  it('returns recipient members with their user details', async () => {
    const { org, owner, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails({ clientMemberIds: [client.id] }),
    })

    const recipients = await invoicesService.getRecipients(invoice!.id)
    expect(recipients).toHaveLength(1)
    expect(recipients[0]!.memberId).toBe(client.id)
    expect(recipients[0]!.userEmail).toContain('@')
  })
})

describe('invoicesService.getLinkedRequirements', () => {
  it('returns the requirements linked to the invoice', async () => {
    const { owner, project } = await setupProject()
    const [req] = await db
      .insert(requirements)
      .values({
        projectId: project.id,
        slug: `req-${createId().slice(0, 6)}`,
        title: 'Build the thing',
      })
      .returning()

    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails({ requirementIds: [req!.id] }),
    })

    const linked = await invoicesService.getLinkedRequirements(invoice!.id)
    expect(linked).toHaveLength(1)
    expect(linked[0]!.requirementId).toBe(req!.id)
    expect(linked[0]!.title).toBe('Build the thing')
  })
})

describe('invoicesService.getById', () => {
  it('returns null when the project is not in the organization', async () => {
    const { owner, project } = await setupProject()
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })

    const result = await invoicesService.getById({
      invoiceId: invoice!.id,
      projectId: project.id,
      organizationId: 'org_other',
      role: 'admin',
      memberId: owner.id,
    })
    expect(result).toBeNull()
  })

  it('returns the invoice for an admin', async () => {
    const { org, owner, project } = await setupProject()
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })

    const result = await invoicesService.getById({
      invoiceId: invoice!.id,
      projectId: project.id,
      organizationId: org.id,
      role: 'admin',
      memberId: owner.id,
    })
    expect(result?.id).toBe(invoice!.id)
  })

  it('returns the invoice to a client only when they are a recipient', async () => {
    const { org, owner, project } = await setupProject()
    const recipient = await addProjectClient(org.id, project.id)
    const outsider = await addProjectClient(org.id, project.id)
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails({ clientMemberIds: [recipient.id] }),
    })

    const asRecipient = await invoicesService.getById({
      invoiceId: invoice!.id,
      projectId: project.id,
      organizationId: org.id,
      role: 'client',
      memberId: recipient.id,
    })
    expect(asRecipient?.id).toBe(invoice!.id)

    const asOutsider = await invoicesService.getById({
      invoiceId: invoice!.id,
      projectId: project.id,
      organizationId: org.id,
      role: 'client',
      memberId: outsider.id,
    })
    expect(asOutsider).toBeNull()
  })
})

describe('invoicesService.listByProject', () => {
  it('returns all invoices for an admin', async () => {
    const { owner, project } = await setupProject()
    await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })
    await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })

    const result = await invoicesService.listByProject({
      projectId: project.id,
      memberId: owner.id,
      role: 'admin',
    })
    expect(result).toHaveLength(2)
  })

  it('returns only recipient + client-visible invoices for a client', async () => {
    const { org, owner, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)

    const visible = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails({ clientMemberIds: [client.id] }),
    })
    await invoicesService.send({
      invoiceId: visible!.id,
      clientMemberIds: [client.id],
      orgMember: owner,
    })

    // A draft the client is a recipient of stays hidden (draft is not visible).
    await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails({ clientMemberIds: [client.id] }),
    })

    const result = await invoicesService.listByProject({
      projectId: project.id,
      memberId: client.id,
      role: 'client',
    })

    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe(visible!.id)
    expect(result[0]!.status).toBe('sent')
    expect(result[0]!.recipients.map((r) => r.memberId)).toContain(client.id)
  })

  it('shows a member client-facing invoices plus ones addressed to them', async () => {
    const { org, owner, project } = await setupProject()
    const teammate = await addProjectMember(org.id, project.id)

    // Client-facing invoice — visible to members.
    await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })
    // Member invoice addressed to the teammate.
    const own = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'member',
      details: makeDetails({ clientMemberIds: [teammate.id] }),
    })

    const result = await invoicesService.listByProject({
      projectId: project.id,
      memberId: teammate.id,
      role: 'member',
    })

    expect(result).toHaveLength(2)
    expect(result.some((i) => i.id === own!.id)).toBe(true)
  })
})

describe('invoicesService.update', () => {
  it('updates a draft invoice in place', async () => {
    const { owner, project } = await setupProject()
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails({ items: [item({ amount: '100' })] }),
    })

    await invoicesService.update({
      invoiceId: invoice!.id,
      orgMember: owner,
      details: makeDetails({
        invoiceNumber: invoice!.invoiceNumber,
        items: [item({ description: 'Revised', amount: '250' })],
      }),
    })

    const updated = await invoicesService.getById({
      invoiceId: invoice!.id,
      projectId: project.id,
      organizationId: owner.organizationId,
      role: 'admin',
      memberId: owner.id,
    })
    expect(Number(updated!.totalAmount)).toBe(250)
    const items = await invoicesService.getItems(invoice!.id)
    expect(items).toHaveLength(1)
    expect(items[0]!.description).toBe('Revised')
  })

  it('throws when the invoice does not exist', async () => {
    const { owner } = await setupProject()
    await expect(
      invoicesService.update({
        invoiceId: 'inv_missing',
        orgMember: owner,
        details: makeDetails(),
      })
    ).rejects.toThrow('Invoice not found')
  })

  it('refuses to edit a non-draft client invoice', async () => {
    const { owner, project } = await setupProject()
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })
    await invoicesService.changeStatus({
      invoiceId: invoice!.id,
      status: 'sent',
      orgMember: owner,
    })

    await expect(
      invoicesService.update({
        invoiceId: invoice!.id,
        orgMember: owner,
        details: makeDetails({ invoiceNumber: invoice!.invoiceNumber }),
      })
    ).rejects.toThrow('This invoice can no longer be edited')
  })
})

describe('invoicesService.send', () => {
  it('marks a draft as sent and records recipients', async () => {
    const { org, owner, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })

    await invoicesService.send({
      invoiceId: invoice!.id,
      clientMemberIds: [client.id],
      orgMember: owner,
    })

    const [row] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoice!.id))
    expect(row!.status).toBe('sent')
    const recipients = await invoicesService.getRecipients(invoice!.id)
    expect(recipients.map((r) => r.memberId)).toEqual([client.id])
  })

  it('refuses to send an invoice that is not a draft', async () => {
    const { org, owner, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })
    await invoicesService.changeStatus({
      invoiceId: invoice!.id,
      status: 'paid',
      orgMember: owner,
    })

    await expect(
      invoicesService.send({
        invoiceId: invoice!.id,
        clientMemberIds: [client.id],
        orgMember: owner,
      })
    ).rejects.toThrow('Only draft invoices can be sent')
  })

  it('requires at least one item', async () => {
    const { org, owner, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails({ items: [] }),
    })

    await expect(
      invoicesService.send({
        invoiceId: invoice!.id,
        clientMemberIds: [client.id],
        orgMember: owner,
      })
    ).rejects.toThrow('Invoice must have at least one item')
  })

  it('requires at least one recipient', async () => {
    const { owner, project } = await setupProject()
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })

    await expect(
      invoicesService.send({
        invoiceId: invoice!.id,
        clientMemberIds: [],
        orgMember: owner,
      })
    ).rejects.toThrow('Invoice must have at least one recipient')
  })

  it('rejects recipients not assigned to the project as clients', async () => {
    const { org, owner, project } = await setupProject()
    // A client that exists in the org but is not assigned to the project.
    const unassigned = await createMember({
      organizationId: org.id,
      role: 'client',
    })
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })

    await expect(
      invoicesService.send({
        invoiceId: invoice!.id,
        clientMemberIds: [unassigned.id],
        orgMember: owner,
      })
    ).rejects.toThrow('One or more recipients are invalid for this project')
  })
})

describe('invoicesService.markPaid', () => {
  it('lets an admin mark a member invoice as paid', async () => {
    const { org, owner, project } = await setupProject()
    const teammate = await addProjectMember(org.id, project.id)
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'member',
      details: makeDetails({ clientMemberIds: [teammate.id] }),
    })

    const result = await invoicesService.markPaid({
      invoiceId: invoice!.id,
      orgMember: owner,
    })
    expect(result).toEqual({ success: true })
    const [row] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoice!.id))
    expect(row!.status).toBe('paid')
  })

  it('forbids a non-admin from marking a member invoice paid', async () => {
    const { org, owner, project } = await setupProject()
    const teammate = await addProjectMember(org.id, project.id)
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'member',
      details: makeDetails({ clientMemberIds: [teammate.id] }),
    })

    await expect(
      invoicesService.markPaid({
        invoiceId: invoice!.id,
        orgMember: await activeMemberFor(teammate),
      })
    ).rejects.toThrow('Only admins can mark invoices as paid')
  })

  it('lets the client recipient mark a sent invoice paid', async () => {
    const { org, owner, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })
    await invoicesService.send({
      invoiceId: invoice!.id,
      clientMemberIds: [client.id],
      orgMember: owner,
    })

    const result = await invoicesService.markPaid({
      invoiceId: invoice!.id,
      orgMember: await activeMemberFor(client),
    })
    expect(result).toEqual({ success: true })
  })

  it('refuses to mark a draft client invoice as paid', async () => {
    const { org, owner, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })

    await expect(
      invoicesService.markPaid({
        invoiceId: invoice!.id,
        orgMember: await activeMemberFor(client),
      })
    ).rejects.toThrow('Only sent invoices can be marked as paid')
  })
})

describe('invoicesService.remove', () => {
  it('deletes a draft invoice', async () => {
    const { owner, project } = await setupProject()
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })

    const result = await invoicesService.remove({
      invoiceId: invoice!.id,
      orgMember: owner,
    })
    expect(result).toEqual({ success: true })
    const rows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoice!.id))
    expect(rows).toHaveLength(0)
  })

  it('refuses to delete a sent client invoice', async () => {
    const { owner, project } = await setupProject()
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })
    await invoicesService.changeStatus({
      invoiceId: invoice!.id,
      status: 'sent',
      orgMember: owner,
    })

    await expect(
      invoicesService.remove({ invoiceId: invoice!.id, orgMember: owner })
    ).rejects.toThrow('This invoice can no longer be deleted')
  })

  it('allows deleting a sent member invoice', async () => {
    const { org, owner, project } = await setupProject()
    const teammate = await addProjectMember(org.id, project.id)
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'member',
      details: makeDetails({ clientMemberIds: [teammate.id] }),
    })

    const result = await invoicesService.remove({
      invoiceId: invoice!.id,
      orgMember: owner,
    })
    expect(result).toEqual({ success: true })
  })
})

describe('invoicesService.createThread', () => {
  it('lets a recipient dispute a sent invoice, flipping it to disputed', async () => {
    const { org, owner, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })
    await invoicesService.send({
      invoiceId: invoice!.id,
      clientMemberIds: [client.id],
      orgMember: owner,
    })

    const thread = await invoicesService.createThread({
      invoiceId: invoice!.id,
      body: 'This amount looks wrong',
      orgMember: await activeMemberFor(client),
    })
    expect(thread!.entityId).toBe(invoice!.id)

    const [row] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoice!.id))
    expect(row!.status).toBe('disputed')
  })

  it('refuses to open a thread on a draft invoice', async () => {
    const { org, owner, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })

    await expect(
      invoicesService.createThread({
        invoiceId: invoice!.id,
        body: 'hi',
        orgMember: await activeMemberFor(client),
      })
    ).rejects.toThrow(
      'Threads can only be created on sent or disputed invoices'
    )
  })

  it('only lets a recipient raise a dispute', async () => {
    const { org, owner, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })
    await invoicesService.send({
      invoiceId: invoice!.id,
      clientMemberIds: [client.id],
      orgMember: owner,
    })

    await expect(
      invoicesService.createThread({
        invoiceId: invoice!.id,
        body: 'not a recipient',
        orgMember: owner,
      })
    ).rejects.toThrow('Only an invoice recipient can raise a dispute')
  })
})

describe('invoicesService.replyToThread', () => {
  async function disputedThread() {
    const { org, owner, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })
    await invoicesService.send({
      invoiceId: invoice!.id,
      clientMemberIds: [client.id],
      orgMember: owner,
    })
    const thread = await invoicesService.createThread({
      invoiceId: invoice!.id,
      body: 'opening message',
      orgMember: await activeMemberFor(client),
    })
    return { org, owner, project, client, invoice, thread }
  }

  it('appends a message to an open thread', async () => {
    const { owner, thread } = await disputedThread()

    const message = await invoicesService.replyToThread({
      threadId: thread!.id,
      body: 'a reply',
      orgMember: owner,
    })
    expect(message!.body).toBe('a reply')
    expect(message!.threadId).toBe(thread!.id)
  })

  it('throws when the thread does not exist', async () => {
    const { owner } = await setupProject()
    await expect(
      invoicesService.replyToThread({
        threadId: 'thread_missing',
        body: 'x',
        orgMember: owner,
      })
    ).rejects.toThrow('Thread not found')
  })

  it('refuses to reply to a resolved thread', async () => {
    const { owner, thread } = await disputedThread()
    await invoicesService.resolveThread({
      threadId: thread!.id,
      orgMember: owner,
    })

    await expect(
      invoicesService.replyToThread({
        threadId: thread!.id,
        body: 'too late',
        orgMember: owner,
      })
    ).rejects.toThrow('Cannot reply to a resolved thread')
  })
})

describe('invoicesService.resolveThread', () => {
  it('resolves the thread and reverts the invoice to sent', async () => {
    const { org, owner, project } = await setupProject()
    const client = await addProjectClient(org.id, project.id)
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })
    await invoicesService.send({
      invoiceId: invoice!.id,
      clientMemberIds: [client.id],
      orgMember: owner,
    })
    const thread = await invoicesService.createThread({
      invoiceId: invoice!.id,
      body: 'dispute',
      orgMember: await activeMemberFor(client),
    })

    const result = await invoicesService.resolveThread({
      threadId: thread!.id,
      orgMember: owner,
    })
    expect(result).toEqual({ success: true })

    const [resolved] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, thread!.id))
    expect(resolved!.status).toBe('resolved')

    const [row] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoice!.id))
    expect(row!.status).toBe('sent')
  })

  it('throws when the thread does not exist', async () => {
    const { owner } = await setupProject()
    await expect(
      invoicesService.resolveThread({
        threadId: 'thread_missing',
        orgMember: owner,
      })
    ).rejects.toThrow('Thread not found')
  })
})

describe('invoicesService.changeStatus', () => {
  it('updates the invoice status', async () => {
    const { owner, project } = await setupProject()
    const invoice = await invoicesService.create({
      project,
      orgMember: owner,
      recipientType: 'client',
      details: makeDetails(),
    })

    const result = await invoicesService.changeStatus({
      invoiceId: invoice!.id,
      status: 'cancelled',
      orgMember: owner,
    })
    expect(result).toEqual({ success: true })

    const [row] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoice!.id))
    expect(row!.status).toBe('cancelled')
  })

  it('throws when the invoice does not exist', async () => {
    const { owner } = await setupProject()
    await expect(
      invoicesService.changeStatus({
        invoiceId: 'inv_missing',
        status: 'paid',
        orgMember: owner,
      })
    ).rejects.toThrow('Invoice not found')
  })
})
