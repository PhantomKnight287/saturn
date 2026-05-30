import { and, asc, eq } from 'drizzle-orm'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { requirementsService } from '@/app/api/requirements/service'
import { timesheetService } from '@/app/api/timesheets/service'
import { buttonVariants } from '@/components/ui/button-variants'
import type { CustomFieldDefinition } from '@/lib/custom-fields'
import { createMetadata } from '@/lib/metadata'
import { db } from '@/server/db'
import { customFields } from '@/server/db/schema'
import type { RouteImpl } from '@/types'
import { TimeEntryFormBody } from '../../_components/time-entry-form-body'

export const metadata: Metadata = createMetadata({
  title: 'Edit Time Entry',
})

export default async function EditTimeEntryPage({
  params,
}: PageProps<'/[org]/[project]/timesheets/[entryId]/edit'>) {
  const { org, project: projectSlug, entryId } = await params
  const { organization, project, role, orgMember } =
    await resolveProjectContext(org, projectSlug)

  if (!role.authorize({ time_entry: ['update'] }).success) {
    redirect(
      `/error/403?message=${encodeURIComponent('You do not have permission to edit this entry')}`
    )
  }

  if (orgMember.organizationId !== organization.id) {
    notFound()
  }

  const entryRow = await timesheetService.getEntryForEdit(entryId, project.id)

  if (!entryRow) {
    notFound()
  }

  const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'
  if (!isAdmin && entryRow.memberId !== orgMember.id) {
    notFound()
  }

  const [requirementsList, defs] = await Promise.all([
    requirementsService.listByProject({
      memberId: orgMember.id,
      role: orgMember.role,
      projectId: project.id,
    }),
    db
      .select()
      .from(customFields)
      .where(
        and(
          eq(customFields.projectId, project.id),
          eq(customFields.organizationId, organization.id)
        )
      )
      .orderBy(asc(customFields.createdAt)) as Promise<CustomFieldDefinition[]>,
  ])

  const backHref = `/${org}/${projectSlug}/timesheets`

  return (
    <div className='mx-auto w-full max-w-2xl'>
      <Link
        className={buttonVariants({ size: 'sm', variant: 'ghost' })}
        href={backHref as RouteImpl}
      >
        <ArrowLeft className='size-4' />
        Back to timesheets
      </Link>
      <div className='mb-6'>
        <h1 className='font-semibold text-2xl'>Edit time entry</h1>
      </div>
      <TimeEntryFormBody
        customFields={defs}
        editEntry={{
          ...entryRow,
          memberEmail: entryRow.memberEmail ?? '',
        }}
        projectId={project.id}
        redirectAfterSubmit={backHref}
        requirements={requirementsList}
      />
    </div>
  )
}
