import 'client-only'
import { track } from '@databuddy/sdk'

const ANALYTIC_EVENTS = [
  'workspace_created',
  'project_create',
  'member_invited',
  'member_joined',
  'client_added',
  'milestone_created',
  'milestone_completed',
  'requirement_created',
  'requirement_sent',
  'requirement_signed',
  'timesheet_entry_logged',
  'invoice_created',
  'invoice_sent',
  'invoice_paid',
  'invoice_disputed',
  'expense_created',
  'proposal_created',
  'proposal_sent',
  'proposal_accepted',
  'subscription_started',
  'subscription_cancelled',
] as const

export const analyticsService = {
  track(eventName: (typeof ANALYTIC_EVENTS)[number]) {
    track(eventName, {})
  },
}
