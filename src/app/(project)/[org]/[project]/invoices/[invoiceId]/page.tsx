import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { expensesServices } from '@/app/api/expenses/service'
import { invoicesService } from '@/app/api/invoices/service'
import { mediaService } from '@/app/api/media/service'
import { requirementsService } from '@/app/api/requirements/service'
import { teamService } from '@/app/api/teams/service'
import { threadService } from '@/app/api/threads/service'
import { timesheetService } from '@/app/api/timesheets/service'
import type { Role } from '@/types'
import { InvoiceClientView } from '../_components/invoice-client-view'
import InvoiceEditor from '../_components/invoice-editor'

export default async function InvoiceDetail({
  params,
}: PageProps<'/[org]/[project]/invoices/[invoiceId]'>) {
  const { org, project: projectSlug, invoiceId } = await params
  const {
    organization,
    project: currentProject,
    orgMember,
    role,
  } = await resolveProjectContext(org, projectSlug)

  if (!role.authorize({ invoice: ['read'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to view invoices')}`
    )
  }

  const invoice = await invoicesService.getById({
    invoiceId,
    projectId: currentProject.id,
    organizationId: organization.id,
  })

  if (!invoice) {
    redirect(`/error?message=${encodeURIComponent('Invoice not found')}`)
  }

  const isClient = orgMember.role === 'client'

  const [items, linkedReqs, recipients, threads] = await Promise.all([
    invoicesService.getItems(invoiceId),
    invoicesService.getLinkedRequirements(invoiceId),
    invoicesService.getRecipients(invoiceId),
    threadService.getThreads(currentProject.id, invoiceId),
  ])

  const isRecipient = recipients.some((r) => r.memberId === orgMember.id)
  const canMarkPaid = invoice.status === 'sent' && isRecipient
  const canCreateThread = role.authorize({ thread: ['create'] }).success
  const canResolveThread = role.authorize({ thread: ['resolve'] }).success

  if (isClient) {
    return (
      <InvoiceClientView
        canCreateThread={canCreateThread}
        canMarkPaid={canMarkPaid}
        canResolveThread={canResolveThread}
        invoice={{
          ...invoice,
          senderCustomFields: invoice.senderCustomFields as
            | { label: string; value: string }[]
            | null,
          clientCustomFields: invoice.clientCustomFields as
            | { label: string; value: string }[]
            | null,
        }}
        items={items}
        linkedRequirements={linkedReqs}
        orgName={organization.name}
        orgSlug={org}
        projectId={currentProject.id}
        projectName={currentProject.name}
        projectSlug={projectSlug}
        threads={threads}
      />
    )
  }

  // Admin/owner/member gets the full editor
  const canEdit = role.authorize({ invoice: ['update'] }).success
  const canSend = role.authorize({ invoice: ['send'] }).success
  const canDelete = role.authorize({ invoice: ['delete'] }).success

  const h = await headers()

  const [clients, requirementList, orgMedia, billableEntries, unpaidExpenses] =
    await Promise.all([
      teamService.getProjectClients(currentProject.id),
      requirementsService.listByProject(currentProject.id, h),
      mediaService.listImagesByOrganization(organization.id),
      timesheetService.getBillableSummary(currentProject.id),
      expensesServices.listUnpaidExpensesByProject(
        organization.id,
        currentProject.id,
        orgMember.userId
      ),
    ])

  const memberRateMap: Record<
    string,
    { hourlyRate: number; currency: string }
  > = {}
  for (const entry of billableEntries) {
    if (!memberRateMap[entry.memberId]) {
      const rate = await timesheetService.getMemberRate(
        entry.memberId,
        currentProject.id,
        new Date().toISOString()
      )
      if (rate) {
        memberRateMap[entry.memberId] = {
          hourlyRate: rate.hourlyRate,
          currency: rate.currency,
        }
      }
    }
  }

  return (
    <InvoiceEditor
      billableEntries={billableEntries}
      canCreateThread={canCreateThread}
      canDelete={canDelete}
      canEdit={canEdit}
      canMarkPaid={canMarkPaid}
      canResolveThread={canResolveThread}
      canSend={canSend}
      clients={clients}
      existingItems={items}
      existingRecipientIds={recipients.map((r) => r.memberId)}
      invoice={{
        ...invoice,
        senderCustomFields: invoice.senderCustomFields as
          | { label: string; value: string }[]
          | null,
        clientCustomFields: invoice.clientCustomFields as
          | { label: string; value: string }[]
          | null,
      }}
      linkedRequirements={linkedReqs}
      mediaItems={orgMedia}
      memberRateMap={memberRateMap}
      mode='edit'
      orgName={organization.name}
      orgSlug={org}
      projectId={currentProject.id}
      projectName={currentProject.name}
      projectSlug={projectSlug}
      requirements={requirementList}
      role={orgMember.role as Role}
      threads={threads}
      unbilledTimeEntries={billableEntries}
      unpaidExpenses={unpaidExpenses}
    />
  )
}
