import { and, desc, eq, isNotNull, or } from 'drizzle-orm'
import { db } from '@/server/db'
import {
  media as mediaTable,
  proposalSignatures,
  requirementSignatures,
} from '@/server/db/schema'

export interface SignatureMedia {
  contentType: string
  createdAt: Date
  id: string
  name: string
  url: string
}

const getSignatureMediaForMember = async (
  organizationId: string,
  memberId: string
): Promise<SignatureMedia[]> => {
  return await db
    .select({
      id: mediaTable.id,
      name: mediaTable.name,
      url: mediaTable.url,
      contentType: mediaTable.contentType,
      createdAt: mediaTable.createdAt,
    })
    .from(mediaTable)
    .leftJoin(
      requirementSignatures,
      and(
        eq(requirementSignatures.mediaId, mediaTable.id),
        eq(requirementSignatures.clientMemberId, memberId)
      )
    )
    .leftJoin(
      proposalSignatures,
      and(
        eq(proposalSignatures.mediaId, mediaTable.id),
        eq(proposalSignatures.clientMemberId, memberId)
      )
    )
    .where(
      and(
        eq(mediaTable.organizationId, organizationId),
        or(
          isNotNull(requirementSignatures.id),
          isNotNull(proposalSignatures.id)
        )
      )
    )
    .groupBy(mediaTable.id)
    .orderBy(desc(mediaTable.createdAt))
}

export const signaturesService = {
  getSignatureMediaForMember,
}
