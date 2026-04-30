'use client'

import type { projectsService } from '@/app/api/projects/service'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClientApprovalCard } from './_components/client-approval-card'
import { DangerZoneCard } from './_components/danger-zone-card'
import { GeneralCard } from './_components/general-card'
import { InvoiceNumberingCard } from './_components/invoice-numbering-card'
import { TimesheetDefaultsCard } from './_components/timesheet-defaults-card'

export function ProjectSettingsPageClient({
  project,
  organizationId,
  orgSlug,
  canDelete,
  settings,
}: {
  project: { id: string; name: string; slug: string; dueDate: Date | null }
  organizationId: string
  orgSlug: string
  canDelete: boolean
  settings: Awaited<ReturnType<typeof projectsService.getSettings>>
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
          {canDelete && <TabsTrigger value='danger'>Danger Zone</TabsTrigger>}
        </TabsList>

        <TabsContent className='space-y-6' value='general'>
          <GeneralCard
            organizationId={organizationId}
            orgSlug={orgSlug}
            project={project}
          />
        </TabsContent>

        <TabsContent value='timesheet'>
          <TimesheetDefaultsCard
            organizationId={organizationId}
            projectId={project.id}
            settings={settings}
          />
        </TabsContent>

        <TabsContent value='client'>
          <ClientApprovalCard
            organizationId={organizationId}
            projectId={project.id}
            settings={settings}
          />
        </TabsContent>

        <TabsContent value='invoicing'>
          <InvoiceNumberingCard
            organizationId={organizationId}
            projectId={project.id}
            settings={settings}
          />
        </TabsContent>

        {canDelete && (
          <TabsContent value='danger'>
            <DangerZoneCard
              organizationId={organizationId}
              orgSlug={orgSlug}
              project={project}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
