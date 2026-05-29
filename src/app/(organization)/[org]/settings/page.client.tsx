'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CustomFieldDefinition } from '@/lib/custom-fields'
import { BillingCard } from './_components/billing-card'
import { ClientApprovalCard } from './_components/client-approval-card'
import { OrgCustomFieldsCard } from './_components/custom-fields-card'
import { DangerZoneCard } from './_components/danger-zone-card'
import { GeneralCard } from './_components/general-card'
import { InvoiceFromCard } from './_components/invoice-from-card'
import { InvoiceImportDefaultsCard } from './_components/invoice-import-defaults-card'
import { InvoiceNumberingCard } from './_components/invoice-numbering-card'
import { TimesheetDefaultsCard } from './_components/timesheet-defaults-card'
import type {
  BillingFrequency,
  ClientInvolvementValue,
  InvoiceTimeUnit,
  TimesheetDuration,
} from './common'

export function SettingsPageClient({
  organization,
  orgSlug,
  canDelete,
  defaultPayRate,
  defaultPayCurrency,
  defaultPayFrequency,
  defaultBillingRate,
  defaultBillingCurrency,
  defaultBillingFrequency,
  defaultTimesheetDuration,
  invoiceNumberTemplate,
  invoiceTimeUnit,
  invoiceFromName,
  invoiceFromAddress,
  clientInvolvement,
  customFields,
}: {
  organization: { id: string; name: string; slug: string }
  orgSlug: string
  canDelete: boolean
  defaultPayRate: number
  defaultPayCurrency: string
  defaultPayFrequency: BillingFrequency | null
  defaultBillingRate: number | null
  defaultBillingCurrency: string
  defaultBillingFrequency: BillingFrequency | null
  defaultTimesheetDuration: TimesheetDuration
  invoiceNumberTemplate: string
  invoiceTimeUnit: InvoiceTimeUnit
  invoiceFromName: string | null
  invoiceFromAddress: string | null
  clientInvolvement: ClientInvolvementValue
  customFields: CustomFieldDefinition[]
}) {
  return (
    <div className='w-full'>
      <div className='mb-6'>
        <h1 className='font-semibold text-2xl'>Settings</h1>
      </div>

      <Tabs defaultValue='general'>
        <TabsList variant='line'>
          <TabsTrigger value='general'>General</TabsTrigger>
          <TabsTrigger value='timesheet'>Timesheet</TabsTrigger>
          <TabsTrigger value='invoicing'>Invoices</TabsTrigger>
          <TabsTrigger value='client'>Approval</TabsTrigger>
          <TabsTrigger value='billing'>Billing</TabsTrigger>
          {canDelete && <TabsTrigger value='danger'>Danger Zone</TabsTrigger>}
        </TabsList>

        <TabsContent className='space-y-6' value='general'>
          <GeneralCard organization={organization} orgSlug={orgSlug} />
        </TabsContent>

        <TabsContent className='space-y-6' value='timesheet'>
          <TimesheetDefaultsCard
            defaultBillingCurrency={defaultBillingCurrency}
            defaultBillingFrequency={defaultBillingFrequency}
            defaultBillingRate={defaultBillingRate}
            defaultPayCurrency={defaultPayCurrency}
            defaultPayFrequency={defaultPayFrequency}
            defaultPayRate={defaultPayRate}
            defaultTimesheetDuration={defaultTimesheetDuration}
            organizationId={organization.id}
          />
          <OrgCustomFieldsCard
            customFields={customFields}
            organizationId={organization.id}
          />
        </TabsContent>

        <TabsContent value='client'>
          <ClientApprovalCard
            clientInvolvement={clientInvolvement}
            organizationId={organization.id}
          />
        </TabsContent>

        <TabsContent className='space-y-6' value='invoicing'>
          <InvoiceNumberingCard
            invoiceNumberTemplate={invoiceNumberTemplate}
            organizationId={organization.id}
          />
          <InvoiceImportDefaultsCard
            invoiceTimeUnit={invoiceTimeUnit}
            organizationId={organization.id}
          />
          <InvoiceFromCard
            invoiceFromAddress={invoiceFromAddress}
            invoiceFromName={invoiceFromName}
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
