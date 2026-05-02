import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
} from 'drizzle-orm'
import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers'
import { getCachedActiveOrgMember } from '@/app/(organization)/[org]/cache'

import { db } from '@/server/db'
import {
  invoiceItems,
  invoiceRecipients,
  invoiceRequirements,
  invoices,
  media,
  members,
  projectClientAssignments,
  projects,
  requirements,
  users,
} from '@/server/db/schema'

export type InvoiceWithMedia = typeof invoices.$inferSelect & {
  senderLogoObject?: typeof media.$inferSelect | null
  senderSignatureObject?: typeof media.$inferSelect | null
}

const listByProject = async (projectId: string, headers: ReadonlyHeaders) => {
  const activeMember = await getCachedActiveOrgMember(headers)
  let invoicesList: (typeof invoices.$inferSelect)[]
  if (activeMember?.role === 'client') {
    invoicesList = await db
      .select(getTableColumns(invoices))
      .from(invoices)
      .where(
        and(
          eq(invoices.projectId, projectId),
          inArray(invoices.status, ['disputed', 'paid', 'sent', 'cancelled'])
        )
      )
      .innerJoin(
        invoiceRecipients,
        and(
          eq(invoiceRecipients.invoiceId, invoices.id),
          eq(invoiceRecipients.clientMemberId, activeMember.id)
        )
      )
      .orderBy(desc(invoices.createdAt))
  } else {
    invoicesList = await db
      .select()
      .from(invoices)
      .where(eq(invoices.projectId, projectId))
      .orderBy(desc(invoices.createdAt))
  }

  const withRecipients = await Promise.all(
    invoicesList.map(async (invoice) => {
      const recipients = await db
        .select({
          assignmentId: projectClientAssignments.id,
          memberId: invoiceRecipients.clientMemberId,
          userName: users.name,
          userEmail: users.email,
          assignedAt: members.createdAt,
          userId: members.userId,
          userImage: users.image,
        })
        .from(invoiceRecipients)
        .innerJoin(members, eq(invoiceRecipients.clientMemberId, members.id))
        .innerJoin(users, eq(members.userId, users.id))
        .innerJoin(
          projectClientAssignments,
          and(
            eq(projectClientAssignments.memberId, members.id),
            eq(projectClientAssignments.projectId, projectId)
          )
        )
        .where(eq(invoiceRecipients.invoiceId, invoice.id))

      return {
        ...invoice,
        recipients,
      }
    })
  )

  return withRecipients
}

const getById = async ({
  invoiceId,
  organizationId,
  projectId,
  headers,
}: {
  invoiceId: string
  projectId: string
  organizationId: string
  headers: ReadonlyHeaders
}) => {
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organizationId)
      )
    )
  if (!project) {
    return null
  }

  const activeMember = await getCachedActiveOrgMember(headers)
  let invoice: InvoiceWithMedia | null
  if (activeMember?.role === 'client') {
    const [row] = await db
      .select(getTableColumns(invoices))
      .from(invoices)
      .where(
        and(eq(invoices.id, invoiceId), eq(invoices.projectId, project.id))
      )
      .innerJoin(
        invoiceRecipients,
        and(
          eq(invoiceRecipients.invoiceId, invoices.id),
          eq(invoiceRecipients.clientMemberId, activeMember.id)
        )
      )
      .limit(1)
    invoice = (row ?? null) as unknown as InvoiceWithMedia | null
  } else {
    invoice = (await db.query.invoices.findFirst({
      where: and(
        eq(invoices.id, invoiceId),
        eq(invoices.projectId, project.id)
      ),
    })) as unknown as InvoiceWithMedia | null
  }
  if (invoice) {
    if (invoice.senderLogo) {
      invoice.senderLogoObject = await db.query.media.findFirst({
        where: eq(media.id, invoice.senderLogo),
      })
    }
    if (invoice.senderSignature) {
      invoice.senderSignatureObject = await db.query.media.findFirst({
        where: eq(media.id, invoice.senderSignature),
      })
    }
  }

  return invoice ?? null
}

const getRecipients = async (invoiceId: string) => {
  return await db
    .select({
      id: invoiceRecipients.id,
      memberId: invoiceRecipients.clientMemberId,
      userName: users.name,
      userEmail: users.email,
    })
    .from(invoiceRecipients)
    .innerJoin(members, eq(invoiceRecipients.clientMemberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(invoiceRecipients.invoiceId, invoiceId))
}

const getItems = async (invoiceId: string) => {
  return await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .orderBy(asc(invoiceItems.sortOrder))
}

const getLinkedRequirements = async (invoiceId: string) => {
  return await db
    .select({
      id: invoiceRequirements.id,
      requirementId: requirements.id,
      title: requirements.title,
      slug: requirements.slug,
      status: requirements.status,
    })
    .from(invoiceRequirements)
    .innerJoin(
      requirements,
      eq(invoiceRequirements.requirementId, requirements.id)
    )
    .where(eq(invoiceRequirements.invoiceId, invoiceId))
}

const listByProjectIds = async (
  projectIds: string[],
  opts: { clientView?: boolean } = {}
) => {
  if (projectIds.length === 0) {
    return []
  }

  const whereClause = opts.clientView
    ? and(
        inArray(invoices.projectId, projectIds),
        inArray(invoices.status, ['disputed', 'paid', 'sent', 'cancelled'])
      )
    : inArray(invoices.projectId, projectIds)

  return await db
    .select()
    .from(invoices)
    .where(whereClause)
    .orderBy(desc(invoices.createdAt))
}

const getNextSequence = async (projectId: string) => {
  const [row] = await db
    .select({ value: count() })
    .from(invoices)
    .where(eq(invoices.projectId, projectId))
  return (row?.value ?? 0) + 1
}

export const invoicesService = {
  listByProject,
  listByProjectIds,
  getById,
  getRecipients,
  getItems,
  getLinkedRequirements,
  getNextSequence,
}
