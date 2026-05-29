import { and, asc, eq } from 'drizzle-orm'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { resolveProjectContext } from '@/app/(organization)/[org]/cache'
import { requirementsService } from '@/app/api/requirements/service'
import { buttonVariants } from '@/components/ui/button-variants'
import type { CustomFieldDefinition } from '@/lib/custom-fields'
import { createMetadata } from '@/lib/metadata'
import { db } from '@/server/db'
import { customFields } from '@/server/db/schema'
import type { RouteImpl } from '@/types'
import { TimeEntryFormBody } from '../_components/time-entry-form-body'

export const metadata: Metadata = createMetadata({
  title: 'Log Time',
  description: 'Log a new time entry against this project.',
})

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function NewTimeEntryPage({
  params,
  searchParams,
}: PageProps<'/[org]/[project]/timesheets/new'>) {
  const { org, project: projectSlug } = await params
  const { date: dateParam, duration } = await searchParams
  const { organization, project, role } = await resolveProjectContext(
    org,
    projectSlug
  )

  if (!role.authorize({ time_entry: ['create'] }).success) {
    redirect(
      `/error/403?message=${encodeURIComponent('You do not have permission to log time')}`
    )
  }

  const h = await headers()
  const [requirementsList, defs] = await Promise.all([
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
      .orderBy(asc(customFields.createdAt)) as Promise<CustomFieldDefinition[]>,
  ])

  const defaultDate =
    typeof dateParam === 'string' && DATE_RE.test(dateParam)
      ? (() => {
          const [y, m, d] = dateParam.split('-').map(Number) as [
            number,
            number,
            number,
          ]
          const date = new Date(y, m - 1, d)
          return date.getFullYear() === y &&
            date.getMonth() + 1 === m &&
            date.getDate() === d
            ? date
            : undefined
        })()
      : undefined
  const defaultDuration =
    typeof duration === 'string' && /^\d+$/.test(duration)
      ? Number(duration)
      : undefined

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
        <h1 className='font-semibold text-2xl'>Log time</h1>
        <p className='mt-1 text-muted-foreground text-sm'>
          Record a new time entry for {project.name}.
        </p>
      </div>
      <TimeEntryFormBody
        customFields={defs}
        defaultDate={defaultDate}
        defaultDurationMinutes={defaultDuration}
        projectId={project.id}
        redirectAfterSubmit={backHref}
        requirements={requirementsList}
      />
    </div>
  )
}
