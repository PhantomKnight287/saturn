import { and, eq, inArray, not } from 'drizzle-orm'
import { db } from '@/server/db'
import {
  type expenses,
  type invoices,
  proposalRecipients,
  proposals,
  requirementRecipients,
  requirements,
} from '@/server/db/schema'

export const clientRequirementVisibility = (
  projectId: string,
  memberId: string
) =>
  and(
    eq(requirements.projectId, projectId),
    not(eq(requirements.status, 'draft')),
    inArray(
      requirements.id,
      db
        .select({ id: requirementRecipients.requirementId })
        .from(requirementRecipients)
        .where(eq(requirementRecipients.clientMemberId, memberId))
    )
  )

export const clientProposalVisibility = (projectId: string, memberId: string) =>
  and(
    eq(proposals.projectId, projectId),
    not(eq(proposals.status, 'draft')),
    inArray(
      proposals.id,
      db
        .select({ id: proposalRecipients.proposalId })
        .from(proposalRecipients)
        .where(eq(proposalRecipients.clientMemberId, memberId))
    )
  )

export const CLIENT_VISIBLE_INVOICE_STATUSES: (typeof invoices.$inferSelect)['status'][] =
  ['disputed', 'paid', 'sent', 'cancelled']

export const CLIENT_VISIBLE_EXPENSE_STATUSES: (typeof expenses.$inferSelect)['status'][] =
  ['client_accepted', 'client_rejected', 'submitted_to_client']
