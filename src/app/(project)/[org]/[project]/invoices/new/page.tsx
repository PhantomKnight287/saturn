import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { expensesServices } from '@/app/api/expenses/service'
import { invoicesService } from '@/app/api/invoices/service'
import { mediaService } from '@/app/api/media/service'
import { projectsService } from '@/app/api/projects/service'
import { requirementsService } from '@/app/api/requirements/service'
import { teamService } from '@/app/api/teams/service'
import { timesheetService } from '@/app/api/timesheets/service'
import { createMetadata } from '@/lib/metadata'
import { InvoiceNumberGeneratorEngine } from '@/services/invoice-number.service'
import type { Role } from '@/types'
import InvoiceEditor from '../_components/invoice-editor'
import type { CustomField, ExtendInvoiceData } from '../types'

export const metadata: Metadata = createMetadata({
  title: 'New Invoice',
  description: 'Draft a new invoice for the project.',
  openGraph: {
    images: ['/api/og?page=Invoices'],
  },
  twitter: {
    images: ['/api/og?page=Invoices'],
  },
})

export default async function NewInvoice({
  params,
  searchParams,
}: PageProps<'/[org]/[project]/invoices/new'> & {
  searchParams: Promise<{ extend?: string; fromTimesheet?: string }>
}) {
  const { org, project: projectSlug } = await params
  const { extend, fromTimesheet } = await searchParams
  const {
    organization,
    project: currentProject,
    role,
    orgMember,
  } = await resolveProjectContext(org, projectSlug)

  if (!role.authorize({ invoice: ['create'] }).success) {
    redirect(
      `/error?message=${encodeURIComponent('You do not have permission to create invoices')}`
    )
  }

  const h = await headers()

  const [
    clients,
    requirementList,
    orgMedia,
    allBillableEntries,
    unpaidExpenses,
    projectOrOrgSettings,
    nextInvoiceSequence,
  ] = await Promise.all([
    teamService.getProjectClients(currentProject.id),
    requirementsService.listByProject(currentProject.id, h),
    mediaService.listImagesByOrganization(organization.id),
    timesheetService.getBillableSummary(currentProject.id),
    expensesServices.listUnpaidExpensesByProject(
      organization.id,
      currentProject.id,
      orgMember.userId
    ),
    projectsService.getSettings(organization.id, currentProject.id),
    invoicesService.getNextSequence(currentProject.id),
  ])

  const suggestedInvoiceNumber =
    InvoiceNumberGeneratorEngine.generateInvoiceNumber(
      projectOrOrgSettings.invoiceNumberTemplate,
      { sequence: nextInvoiceSequence }
    )

  // When coming from a specific timesheet report, use its entries instead
  let billableEntries: Awaited<
    ReturnType<typeof timesheetService.getBillableEntriesForReport>
  > = []
  let timesheetWarning: string | null = null
  if (fromTimesheet) {
    const report = await timesheetService.getReportById(
      fromTimesheet,
      currentProject.id
    )
    if (report) {
      if (report.report.status !== 'approved') {
        timesheetWarning = "Can't generate invoice from unapproved timesheet"
      } else {
        billableEntries =
          await timesheetService.getBillableEntriesForReport(fromTimesheet)
      }
    }
  }

  const memberRateMap: Record<
    string,
    { hourlyRate: number; currency: string }
  > = {}
  for (const entry of [...billableEntries, ...allBillableEntries]) {
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

  let extendData: ExtendInvoiceData | undefined
  if (extend && typeof extend === 'string') {
    const [sourceInvoice, sourceItems, sourceRecipients] = await Promise.all([
      invoicesService.getById({
        invoiceId: extend,
        projectId: currentProject.id,
        organizationId: organization.id,
      }),
      invoicesService.getItems(extend),
      invoicesService.getRecipients(extend),
    ])

    if (sourceInvoice) {
      const validRecipientIds = sourceRecipients
        .map((r) => r.memberId)
        .filter((id) => clients.some((c) => c.memberId === id))

      extendData = {
        senderName: sourceInvoice.senderName,
        senderAddress: sourceInvoice.senderAddress,
        senderLogo: sourceInvoice.senderLogo,
        senderSignature: sourceInvoice.senderSignature,
        senderCustomFields:
          (sourceInvoice.senderCustomFields as CustomField[]) ?? [],
        clientName: sourceInvoice.clientName,
        clientAddress: sourceInvoice.clientAddress,
        clientCustomFields:
          (sourceInvoice.clientCustomFields as CustomField[]) ?? [],
        paymentTerms: sourceInvoice.paymentTerms,
        notes: sourceInvoice.notes,
        terms: sourceInvoice.terms,
        currency: sourceInvoice.currency,
        items: sourceItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
        recipientMemberIds: validRecipientIds,
        sourceInvoiceNumber: sourceInvoice.invoiceNumber,
        sourceInvoiceId: sourceInvoice.id,
      }
    }
  }
  return (
    <InvoiceEditor
      autoImportTime={!!fromTimesheet}
      billableEntries={billableEntries}
      clients={clients}
      defaultCurrency={projectOrOrgSettings?.currency}
      extendData={extendData}
      mediaItems={orgMedia}
      memberRateMap={memberRateMap}
      mode='create'
      orgName={organization.name}
      orgSlug={org}
      projectId={currentProject.id}
      projectName={currentProject.name}
      projectSlug={projectSlug}
      requirements={requirementList}
      role={orgMember.role as Role}
      suggestedInvoiceNumber={suggestedInvoiceNumber}
      timesheetWarning={timesheetWarning}
      unbilledTimeEntries={allBillableEntries}
      unpaidExpenses={unpaidExpenses}
    />
  )
}
