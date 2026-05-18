import { and, asc, eq } from 'drizzle-orm'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { requirementsService } from '@/app/api/requirements/service'
import { buttonVariants } from '@/components/ui/button-variants'
import type { CustomFieldDefinition } from '@/lib/custom-fields'
import { createMetadata } from '@/lib/metadata'
import { db } from '@/server/db'
import { customFields, timeEntries, users } from '@/server/db/schema'
import { members } from '@/server/db/schema/auth'
import { requirements as requirementsTable } from '@/server/db/schema/requirements'
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

  const [entryRow] = await db
    .select({
      id: timeEntries.id,
      projectId: timeEntries.projectId,
      requirementId: timeEntries.requirementId,
      memberId: timeEntries.memberId,
      description: timeEntries.description,
      date: timeEntries.date,
      durationMinutes: timeEntries.durationMinutes,
      billable: timeEntries.billable,
      status: timeEntries.status,
      rejectReason: timeEntries.rejectReason,
      invoiceId: timeEntries.invoiceId,
      customValues: timeEntries.customValues,
      createdAt: timeEntries.createdAt,
      updatedAt: timeEntries.updatedAt,
      requirementSlug: requirementsTable.slug,
      requirementTitle: requirementsTable.title,
      memberEmail: users.email,
      memberName: users.name,
    })
    .from(timeEntries)
    .leftJoin(
      requirementsTable,
      eq(requirementsTable.id, timeEntries.requirementId)
    )
    .leftJoin(members, eq(members.id, timeEntries.memberId))
    .leftJoin(users, eq(users.id, members.userId))
    .where(eq(timeEntries.id, entryId))

  if (!entryRow || entryRow.projectId !== project.id) {
    notFound()
  }

  const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'
  if (!isAdmin && entryRow.memberId !== orgMember.id) {
    notFound()
  }

  const h = await headers()
  const [requirementsList, defRows] = await Promise.all([
    requirementsService.listByProject(project.id, h),
    db
      .select()
      .from(customFields)
      .where(
        and(
          eq(customFields.projectId, project.id),
          eq(customFields.organizationId, organization.id)
        )
      )
      .orderBy(asc(customFields.createdAt)),
  ])

  const defs: CustomFieldDefinition[] = defRows

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
