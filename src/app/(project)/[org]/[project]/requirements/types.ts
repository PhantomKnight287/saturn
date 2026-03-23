import type { requirementsService } from '@/app/api/requirements/service'
import type { signaturesService } from '@/app/api/signatures/service'
import type { teamService } from '@/app/api/teams/service'
import type { requirements } from '@/server/db/schema'
import type { Role } from '@/types'

export type Thread = Awaited<
  ReturnType<typeof requirementsService.getThreads>
>[number]

export type ThreadMessage = Thread['messages'][number]

export type ChangeRequest = Awaited<
  ReturnType<typeof requirementsService.getChangeRequests>
>[number]

export type Signature = Awaited<
  ReturnType<typeof requirementsService.getSignatures>
>[number]

export type SignatureMedia = Awaited<
  ReturnType<typeof signaturesService.getSignatureMediaForMember>
>[number]

export type ProjectClient = Awaited<
  ReturnType<typeof teamService.getProjectClients>
>[number]

export type Requirement = typeof requirements.$inferSelect

export interface RequirementEditorProps {
  canEdit?: boolean
  canSendForSign?: boolean
  canSign?: boolean
  changeRequests?: ChangeRequest[]
  hasSignedAlready?: boolean
  mode: 'create' | 'edit'
  orgSlug: string
  projectClients?: ProjectClient[]
  projectId: string
  projectName: string
  projectSlug: string
  requirement?: Requirement
  role: Role
  /** Previously used signature images for the current user */
  signatureMedia?: SignatureMedia[]
  signatures?: Signature[]
  threads?: Thread[]
}
