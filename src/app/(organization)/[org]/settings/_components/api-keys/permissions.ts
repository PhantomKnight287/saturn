import { statements } from '@/server/auth/permissions'

export type PermissionMap = Record<string, string[]>

const RESOURCE_LABELS: Record<string, string> = {
  organization: 'Organization',
  member: 'Members',
  invitation: 'Invitations',
  team: 'Teams',
  project: 'Projects',
  requirement: 'Requirements',
  invoice: 'Invoices',
  thread: 'Threads',
  time_entry: 'Time Entries',
  member_rate: 'Member Rates',
  project_budget: 'Project Budgets',
  timesheet_report: 'Timesheet Reports',
  milestone: 'Milestones',
  proposal: 'Proposals',
  expense: 'Expenses',
  expense_category: 'Expense Categories',
}

const EXCLUDED_RESOURCES = new Set<string>(['ac'])

const EXCLUDED_ACTIONS: Record<string, Set<string>> = {
  organization: new Set(['delete']),
  member: new Set(['delete']),
  team: new Set(['delete']),
  requirement: new Set([
    'send_for_sign',
    'request_changes',
    'resolve_changes',
    'reject_changes',
  ]),
  invoice: new Set(['sign', 'request_changes']),
  proposal: new Set(['sign']),
  timesheet_report: new Set(['dispute']),
}

function buildAllowedStatements(): Record<string, string[]> {
  const entries: [string, string[]][] = []
  for (const resource of Object.keys(statements) as Array<
    keyof typeof statements
  >) {
    if (EXCLUDED_RESOURCES.has(resource as string)) {
      continue
    }
    const excluded = EXCLUDED_ACTIONS[resource as string]
    const actions = (statements[resource] as readonly string[]).filter(
      (a) => !excluded?.has(a)
    )
    if (actions.length > 0) {
      entries.push([resource as string, actions])
    }
  }
  return Object.fromEntries(entries)
}

export const ALLOWED_STATEMENTS = buildAllowedStatements()
export const RESOURCE_KEYS = Object.keys(ALLOWED_STATEMENTS)

export const TOTAL_PERMISSION_COUNT = RESOURCE_KEYS.reduce(
  (acc, key) => acc + (ALLOWED_STATEMENTS[key]?.length ?? 0),
  0
)

export function formatResource(resource: string) {
  return RESOURCE_LABELS[resource] ?? resource.replace(/_/g, ' ')
}

export function humaniseAction(action: string) {
  return action.replace(/_/g, ' ')
}

export function emptyPermissions(): PermissionMap {
  return Object.fromEntries(RESOURCE_KEYS.map((k) => [k, [] as string[]]))
}

export function allPermissions(): PermissionMap {
  return Object.fromEntries(
    RESOURCE_KEYS.map((k) => [k, [...(ALLOWED_STATEMENTS[k] ?? [])]])
  )
}

export function countSelected(perms: PermissionMap) {
  return Object.values(perms).reduce((acc, arr) => acc + arr.length, 0)
}

export function readPermissions(metadata: unknown): PermissionMap {
  if (!metadata || typeof metadata !== 'object') {
    return {}
  }
  const perms = (metadata as { permissions?: unknown }).permissions
  return (perms && typeof perms === 'object' ? perms : {}) as PermissionMap
}
