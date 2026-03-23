import 'client-only'
import { track } from '@databuddy/sdk'

const ANALYTIC_EVENTS = ['workspace_created', 'project_create'] as const

export const analyticsService = {
  track(eventName: (typeof ANALYTIC_EVENTS)[number]) {
    track(eventName, {})
  },
}
