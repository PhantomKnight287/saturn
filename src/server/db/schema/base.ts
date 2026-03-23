import { pgEnum } from 'drizzle-orm/pg-core'

export const statusEnum = pgEnum('status', [
  'draft',
  'submitted_to_admin',
  'admin_accepted',
  'admin_rejected',
  'submitted_to_client',
  'client_accepted',
  'client_rejected',
  'changes_requested',
])

export const threadStatusEnum = pgEnum('thread_status', [
  'open',
  'resolved',
  'closed',
])

export const changeRequestStatusEnum = pgEnum('change_request_status', [
  'pending',
  'accepted',
  'rejected',
])
