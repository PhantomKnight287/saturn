import {
  ClipboardList,
  Clock,
  FileSpreadsheet,
  FileText,
  Milestone,
  Receipt,
} from 'lucide-react'

export const capabilities = [
  {
    icon: ClipboardList,
    title: 'Requirements',
    desc: 'Write detailed project requirements, share them with clients, and collect signatures.',
  },
  {
    icon: FileText,
    title: 'Proposals',
    desc: 'Draft and send proposals. Clients review and approve without leaving the platform.',
  },
  {
    icon: Milestone,
    title: 'Milestones',
    desc: "Break work into milestones. Track what's done, what's in progress, and what's next.",
  },
  {
    icon: Clock,
    title: 'Timesheets',
    desc: 'Log hours against requirements. Weekly, biweekly, or monthly views. Send reports to clients.',
  },
  {
    icon: Receipt,
    title: 'Expenses',
    desc: 'Track project expenses by category — hosting, design tools, APIs, and more.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Invoices',
    desc: 'Generate invoices with line items pulled from timesheets and expenses. Export as PDF.',
  },
]

export const roles = [
  {
    role: 'Owner',
    desc: 'Full control. Manages the organization, billing, members, and all projects.',
    permissions: [
      'Everything',
      'Org settings',
      'Delete projects',
      'Manage roles',
    ],
  },
  {
    role: 'Admin',
    desc: 'Day-to-day management. Can create projects, send invoices, and manage team.',
    permissions: [
      'Create projects',
      'Send invoices',
      'Manage members',
      'Approve expenses',
    ],
  },
  {
    role: 'Member',
    desc: 'Does the work. Logs time, writes requirements, submits expenses.',
    permissions: [
      'Log time',
      'Write requirements',
      'Submit expenses',
      'View milestones',
    ],
  },
  {
    role: 'Client',
    desc: 'External stakeholder. Reviews work, signs off on requirements, approves invoices.',
    permissions: [
      'View progress',
      'Sign requirements',
      'Approve timesheets',
      'Comment on threads',
    ],
  },
]

export const freelancerTypes = [
  {
    title: 'Developers',
    iconName: 'Code' as const,
    points: [
      'Track hours across repos and features',
      'Log hosting, API, and infra expenses',
      'Send detailed invoices with line items',
    ],
  },
  {
    title: 'Designers',
    iconName: 'Palette' as const,
    points: [
      'Share proposals and get client sign-off',
      'Attach deliverables to milestones',
      'Track tool and asset license costs',
    ],
  },
  {
    title: 'Content creators',
    iconName: 'Video' as const,
    points: [
      'Manage multi-phase production projects',
      'Track equipment and software expenses',
      'Bill per deliverable or per hour',
    ],
  },
  {
    title: 'Agencies',
    iconName: 'Users' as const,
    points: [
      'Multiple projects, multiple clients',
      'Role-based access for your whole team',
      'Per-member billing rates and budgets',
    ],
  },
]

export const clientFeatures = [
  {
    iconName: 'Eye' as const,
    title: 'Progress visibility',
    desc: 'Clients see milestone status and completed deliverables in real time.',
  },
  {
    iconName: 'PenTool' as const,
    title: 'Signature workflows',
    desc: 'Requirements and proposals can be signed digitally without external tools.',
  },
  {
    iconName: 'MessageSquare' as const,
    title: 'Threaded feedback',
    desc: 'Clients leave comments on specific parts of a requirement. No email threads.',
  },
  {
    iconName: 'Lock' as const,
    title: 'Scoped access',
    desc: "Clients only see projects they're assigned to. Internal data stays internal.",
  },
]

export const freePlanFeatures = [
  '1 organization',
  '2 projects',
  'Unlimited team members',
  'Requirements & proposals',
  'Milestones & timesheets',
  'Expenses & invoices',
]

export const proPlanFeatures = [
  'Unlimited organizations',
  'Unlimited projects',
  'Everything in Free',
  'API access for automation',
  'Automate timesheet logging',
  'Programmatic invoice generation',
  'Integrate with existing tools',
  'Priority support',
]

export const workflowSteps = [
  {
    step: '01',
    title: 'Set up your org',
    desc: 'Create your organization, invite your team, and assign roles.',
  },
  {
    step: '02',
    title: 'Run your projects',
    desc: 'Add requirements, track time, log expenses, and hit milestones.',
  },
  {
    step: '03',
    title: 'Bill your clients',
    desc: 'Generate invoices from tracked work. Send, export, get paid.',
  },
]
