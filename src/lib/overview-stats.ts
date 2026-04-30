export function classifyInvoices<
  T extends { status: string; dueDate: Date | string | null },
>(invoices: T[]) {
  const draft: T[] = []
  const sent: T[] = []
  const paid: T[] = []
  const disputed: T[] = []
  const overdue: T[] = []
  const now = Date.now()

  for (const invoice of invoices) {
    switch (invoice.status) {
      case 'draft':
        draft.push(invoice)
        break
      case 'sent':
        sent.push(invoice)
        if (invoice.dueDate && new Date(invoice.dueDate).getTime() < now) {
          overdue.push(invoice)
        }
        break
      case 'paid':
        paid.push(invoice)
        break
      case 'disputed':
        disputed.push(invoice)
        break
      default:
        break
    }
  }

  return { draft, sent, paid, disputed, overdue }
}

export function classifyMilestones<
  T extends { status: string; dueDate: Date | string | null },
>(milestones: T[]) {
  const inProgress: T[] = []
  const blocked: T[] = []
  const overdue: T[] = []
  let completed = 0
  let next: T | undefined
  let nextTime = Number.POSITIVE_INFINITY
  const now = Date.now()

  for (const milestone of milestones) {
    if (milestone.status === 'completed') {
      completed++
      continue
    }

    if (milestone.status === 'in_progress') {
      inProgress.push(milestone)
    }
    if (milestone.status === 'blocked') {
      blocked.push(milestone)
    }

    if (milestone.dueDate) {
      const dueTime = new Date(milestone.dueDate).getTime()
      if (dueTime < now) {
        overdue.push(milestone)
      }
      if (dueTime < nextTime) {
        nextTime = dueTime
        next = milestone
      }
    }
  }

  return {
    inProgress,
    blocked,
    overdue,
    completed,
    next,
    completionPercent: milestones.length
      ? Math.round((completed / milestones.length) * 100)
      : 0,
  }
}

export function summarizeTime<T extends { durationMinutes: number }>(
  entries: T[]
) {
  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0)
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    entryCount: entries.length,
  }
}

export function summarizeTimeEntries<
  T extends { durationMinutes: number; status: string },
>(entries: T[]) {
  let totalMinutes = 0
  const pendingApproval: T[] = []
  const rejected: T[] = []

  for (const entry of entries) {
    totalMinutes += entry.durationMinutes
    if (entry.status === 'submitted_to_admin') {
      pendingApproval.push(entry)
    } else if (entry.status === 'admin_rejected') {
      rejected.push(entry)
    }
  }

  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    pendingApproval,
    rejected,
  }
}

export function classifyExpenses<
  T extends { status: string; billable: boolean },
>(expenses: T[]) {
  const pendingAdmin: T[] = []
  const pendingClient: T[] = []
  const billableApproved: T[] = []

  for (const expense of expenses) {
    if (expense.status === 'submitted_to_admin') {
      pendingAdmin.push(expense)
    } else if (expense.status === 'submitted_to_client') {
      pendingClient.push(expense)
    } else if (expense.status === 'client_accepted' && expense.billable) {
      billableApproved.push(expense)
    }
  }

  return { pendingAdmin, pendingClient, billableApproved }
}

interface OverdueInvoiceEntry {
  currency: string
  dueDate: Date
  id: string
  invoiceNumber: string
  projectName?: string
  projectSlug: string
  totalAmount: string
}

export function toOverdueInvoiceEntries<
  T extends {
    id: string
    invoiceNumber: string
    totalAmount: string
    currency: string
    dueDate: Date | string | null
    projectId?: string
  },
>(
  overdueInvoices: T[],
  resolveProject:
    | string
    | Map<string, { name: string; slug: string }>
    | ((invoice: T) => { name?: string; slug: string } | undefined)
) {
  const entries: OverdueInvoiceEntry[] = []

  for (const invoice of overdueInvoices) {
    if (!invoice.dueDate) {
      continue
    }

    let project: { name?: string; slug: string } | undefined
    if (typeof resolveProject === 'string') {
      project = { slug: resolveProject }
    } else if (resolveProject instanceof Map) {
      project = invoice.projectId
        ? resolveProject.get(invoice.projectId)
        : undefined
    } else {
      project = resolveProject(invoice)
    }

    if (!project) {
      continue
    }

    entries.push({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      dueDate: new Date(invoice.dueDate),
      projectSlug: project.slug,
      projectName: project.name,
    })
  }

  return entries
}

export function getGreeting(now = new Date()) {
  const hour = now.getHours()
  if (hour < 12) {
    return 'Good morning'
  }
  if (hour < 18) {
    return 'Good afternoon'
  }
  return 'Good evening'
}
