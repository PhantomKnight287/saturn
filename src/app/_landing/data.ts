import {
  Briefcase,
  FileSignature,
  FileText,
  FolderKanban,
  type LucideIcon,
  Receipt,
  Timer,
  Users,
} from 'lucide-react'

export const freePlanFeatures = [
  '2 projects',
  'Unlimited team members',
  'All core modules',
  'Built-in time tracking',
]

export const proPlanFeatures = [
  'Unlimited projects & workspaces',
  'Everything in Free',
  'Priority support',
]

export const modules: {
  name: string
  blurb: string
  icon: LucideIcon
}[] = [
  {
    name: 'Projects',
    blurb: 'Group the work. Track status and due dates.',
    icon: FolderKanban,
  },
  {
    name: 'Clients',
    blurb: 'One record per client. Everything tied to it.',
    icon: Briefcase,
  },
  {
    name: 'Team',
    blurb: 'Invite collaborators. Assign work. No per-seat fees.',
    icon: Users,
  },
  {
    name: 'Proposals',
    blurb: 'Draft, send, and collect signatures in-platform.',
    icon: FileSignature,
  },
  {
    name: 'Time tracking',
    blurb: 'A timer that lives where the work does.',
    icon: Timer,
  },
  {
    name: 'Timesheets',
    blurb: 'Weekly hours that flow into invoices.',
    icon: FileText,
  },
  {
    name: 'Expenses',
    blurb: 'Log costs, tag billable, attach to invoices.',
    icon: Receipt,
  },
  {
    name: 'Invoices',
    blurb: 'Pull hours and expenses. Export PDF. Get paid.',
    icon: FileText,
  },
]

export const howItWorks = [
  {
    step: '01',
    title: 'Spin up a project',
    body: 'Add the client, scope, and team. Takes under a minute.',
  },
  {
    step: '02',
    title: 'Do the work',
    body: 'Track time, log expenses, and send proposals as you go. Everything sticks to the project.',
  },
  {
    step: '03',
    title: 'Invoice and get paid',
    body: 'Hours and expenses roll into an invoice in one click. Export a PDF, mark it paid, move on.',
  },
]

export const comparison = [
  {
    need: 'Projects & clients',
    stack: 'Notion / Airtable',
    saturn: 'Built-in',
  },
  {
    need: 'Proposals with signatures',
    stack: 'DocuSign / PandaDoc',
    saturn: 'Built-in',
  },
  {
    need: 'Time tracking',
    stack: 'Toggl / Harvest',
    saturn: 'Built-in',
  },
  {
    need: 'Timesheets',
    stack: 'Spreadsheet',
    saturn: 'Built-in',
  },
  {
    need: 'Expenses',
    stack: 'Spreadsheet / Expensify',
    saturn: 'Built-in',
  },
  {
    need: 'Invoicing',
    stack: 'QuickBooks / Wave',
    saturn: 'Built-in',
  },
  {
    need: 'Monthly cost',
    stack: '$40–80+',
    saturn: '$0–3',
  },
]

export const faq = [
  {
    q: 'Who is Saturn for?',
    a: 'Independent freelancers and small agencies running 1–20 active client projects. If you freelance or run a boutique studio, this is built for you.',
  },
  {
    q: 'Do I have to pay per team member or per workspace?',
    a: 'Neither. Pro is billed per owner — upgrade once and you get unlimited workspaces and unlimited team members across all of them.',
  },
  {
    q: "What's actually free?",
    a: 'Every module works on the Free plan — projects, clients, proposals, timesheets, expenses, invoices, and time tracking. Free caps you at 2 active projects. Pro removes that cap.',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. Invoices and timesheets export to PDF. Project data is yours to take with you.',
  },
  {
    q: 'Does Saturn replace my accounting software?',
    a: "Saturn handles invoicing and expense logging for your freelance work. It isn't a full double-entry accounting system — you can still hand exported data to your accountant at year-end.",
  },
]
