'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BillingCard } from './_components/billing-card'
import { ClientApprovalCard } from './_components/client-approval-card'
import { DangerZoneCard } from './_components/danger-zone-card'
import { GeneralCard } from './_components/general-card'
import { InvoiceNumberingCard } from './_components/invoice-numbering-card'
import { TimesheetDefaultsCard } from './_components/timesheet-defaults-card'
import type { ClientInvolvementValue, TimesheetDuration } from './common'

export function SettingsPageClient({
  organization,
  orgSlug,
  canDelete,
  defaultMemberRate,
  defaultTimesheetDuration,
  defaultCurrency,
  invoiceNumberTemplate,
  clientInvolvement,
}: {
  organization: { id: string; name: string; slug: string }
  orgSlug: string
  canDelete: boolean
  defaultMemberRate: number
  defaultCurrency: string
  defaultTimesheetDuration: TimesheetDuration
  invoiceNumberTemplate: string
  clientInvolvement: ClientInvolvementValue
}) {
  return (
    <div className='w-full'>
      <div className='mb-6'>
        <h1 className='font-semibold text-2xl'>Settings</h1>
      </div>

      <Tabs defaultValue='general'>
        <TabsList variant='line'>
          <TabsTrigger value='general'>General</TabsTrigger>
          <TabsTrigger value='timesheet'>Defaults</TabsTrigger>
          <TabsTrigger value='invoicing'>Invoices</TabsTrigger>
          <TabsTrigger value='client'>Approval</TabsTrigger>
          <TabsTrigger value='billing'>Billing</TabsTrigger>
          {canDelete && <TabsTrigger value='danger'>Danger Zone</TabsTrigger>}
        </TabsList>

        <TabsContent className='space-y-6' value='general'>
          <GeneralCard organization={organization} orgSlug={orgSlug} />
        </TabsContent>

        <TabsContent value='timesheet'>
          <TimesheetDefaultsCard
            defaultCurrency={defaultCurrency}
            defaultMemberRate={defaultMemberRate}
            defaultTimesheetDuration={defaultTimesheetDuration}
            organizationId={organization.id}
          />
        </TabsContent>

        <TabsContent value='client'>
          <ClientApprovalCard
            clientInvolvement={clientInvolvement}
            organizationId={organization.id}
          />
        </TabsContent>

        <TabsContent value='invoicing'>
          <InvoiceNumberingCard
            invoiceNumberTemplate={invoiceNumberTemplate}
            organizationId={organization.id}
          />
        </TabsContent>

        <TabsContent value='billing'>
          <BillingCard />
        </TabsContent>

        {canDelete && (
          <TabsContent value='danger'>
            <DangerZoneCard organization={organization} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
