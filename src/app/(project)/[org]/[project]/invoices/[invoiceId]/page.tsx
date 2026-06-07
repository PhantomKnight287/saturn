import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createLoader, parseAsString } from 'nuqs/server'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { expensesServices } from '@/app/api/expenses/service'
import { invoicesService } from '@/app/api/invoices/service'
import { projectsService } from '@/app/api/projects/service'
import { requirementsService } from '@/app/api/requirements/service'
import { teamService } from '@/app/api/teams/service'
import { threadService } from '@/app/api/threads/service'
import { timesheetService } from '@/app/api/timesheets/service'
import { usersService } from '@/app/api/users/service'
import { createMetadata } from '@/lib/metadata'
import { currencyConversionService } from '@/services/currency-conversion.service'
import type { Role } from '@/types'
import { InvoiceClientView } from '../_components/invoice-client-view'
import InvoiceEditor from '../_components/invoice-editor'
import { buildMemberRateMap } from '../_lib/build-rate-map'

export const metadata: Metadata = createMetadata({
  title: 'Invoice',
  description: 'View and manage invoice details.',
  openGraph: {
    images: ['/api/og?page=Invoices'],
  },
  twitter: {
    images: ['/api/og?page=Invoices'],
  },
})

const loader = createLoader({
  currency: parseAsString,
})

export default async function InvoiceDetail({
  params,
  searchParams,
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
      `/error/403?message=${encodeURIComponent('You do not have permission to view invoices')}`
    )
  }
  const { currency } = await loader(searchParams)

  const invoice = await invoicesService.getById({
    invoiceId,
    projectId: currentProject.id,
    organizationId: organization.id,
    memberId: orgMember.id,
    role: orgMember.role,
  })

  if (!invoice) {
    redirect(`/error/404?message=${encodeURIComponent('Invoice not found')}`)
  }

  const isClient = orgMember.role === 'client'

  const [items, linkedReqs, recipients, threads, settings, capturedRates] =
    await Promise.all([
      invoicesService.getItems(invoiceId),
      invoicesService.getLinkedRequirements(invoiceId),
      invoicesService.getRecipients(invoiceId),
      threadService.getThreads(currentProject.id, invoiceId),
      projectsService.getSettings(organization.id, currentProject.id),
      invoicesService.getConversionRates(invoiceId),
    ])

  const isRecipient = recipients.some((r) => r.memberId === orgMember.id)
  const isMemberInvoice = invoice.recipient === 'member'
  const isClientInvolved =
    !isMemberInvoice && settings.clientInvolvement.invoices === 'on'
  const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'
  const canMarkPaid = isClientInvolved
    ? invoice.status === 'sent' && isRecipient
    : isAdmin && (invoice.status === 'sent' || invoice.status === 'draft')
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

  const canEdit = role.authorize({ invoice: ['update'] }).success
  const canSend = role.authorize({ invoice: ['send'] }).success
  const canDelete = role.authorize({ invoice: ['delete'] }).success

  const [
    clients,
    requirementList,
    userMedia,
    billableEntries,
    unpaidExpenses,
    linkedExpenses,
  ] = await Promise.all([
    teamService.getProjectClients(currentProject.id),
    requirementsService.listByProject({
      memberId: orgMember.id,
      projectId: currentProject.id,
      role: orgMember.role,
    }),
    usersService.getMedias(orgMember.userId),
    timesheetService.getBillableSummary(currentProject.id),
    expensesServices.listUnpaidExpensesByProject(
      organization.id,
      currentProject.id,
      orgMember.userId
    ),
    expensesServices.listExpensesByInvoiceId(invoiceId),
  ])

  const hasSavedItems = items.length > 0
  const baseCurrency = hasSavedItems
    ? invoice.currency
    : (currency ?? invoice.currency)

  const dedupedExpenses = [
    ...new Map(
      [...unpaidExpenses, ...linkedExpenses].map((e) => [e.id, e])
    ).values(),
  ]
  const availableExpenses = await Promise.all(
    dedupedExpenses.map(async (exp) => {
      const { amount, rate } = await currencyConversionService.convertCents(
        exp.amountCents,
        exp.currency,
        baseCurrency
      )
      return { ...exp, convertedAmountCents: amount, rateUsed: rate }
    })
  )

  const memberRateMap = await buildMemberRateMap({
    billableEntries,
    projectId: currentProject.id,
    isMemberInvoice,
    baseCurrency,
  })

  return (
    <InvoiceEditor
      billableEntries={billableEntries}
      canCreateThread={canCreateThread}
      canDelete={canDelete}
      canEdit={canEdit}
      canMarkPaid={canMarkPaid}
      canResolveThread={canResolveThread}
      canSend={canSend}
      capturedRates={capturedRates}
      clients={clients}
      defaultClientAddress={settings.invoiceToAddress}
      defaultClientName={settings.invoiceToName}
      defaultCurrency={baseCurrency}
      defaultSenderAddress={settings.invoiceFromAddress}
      defaultSenderName={settings.invoiceFromName}
      defaultTimeUnit={settings.invoiceTimeUnit}
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
      isClientInvolved={isClientInvolved}
      linkedRequirements={linkedReqs}
      mediaItems={userMedia}
      memberRateMap={memberRateMap}
      mode='edit'
      orgName={organization.name}
      orgSlug={org}
      projectId={currentProject.id}
      projectName={currentProject.name}
      projectSlug={projectSlug}
      recipientType={isMemberInvoice ? 'member' : 'client'}
      requirements={requirementList}
      role={orgMember.role as Role}
      threads={threads}
      unbilledTimeEntries={billableEntries}
      unpaidExpenses={availableExpenses}
    />
  )
}
