'use server'

import { render } from '@react-email/render'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { authService } from '@/app/api/auth/service'
import { projectsService } from '@/app/api/projects/service'
import { timesheetService } from '@/app/api/timesheets/service'
import BudgetThresholdReachedEmail from '@/emails/templates/budget-threshold-reached'
import TimesheetApprovedEmail from '@/emails/templates/timesheet-approved'
import TimesheetClientRespondedEmail from '@/emails/templates/timesheet-client-responded'
import TimesheetRejectedEmail from '@/emails/templates/timesheet-rejected'
import TimesheetSentToClientEmail from '@/emails/templates/timesheet-sent-to-client'
import TimesheetSubmittedEmail from '@/emails/templates/timesheet-submitted'
import { getAdminsAndOwners, sendEmailsToRecipients } from '@/lib/notifications'
import { authedActionClient } from '@/lib/safe-action'
import { db } from '@/server/db'
import {
  memberRates,
  members,
  projectBudgets,
  projects,
  timeEntries,
  timesheetReportEntries,
  timesheetReportRecipients,
  timesheetReports,
  users,
} from '@/server/db/schema'
import {
  approveTimeEntriesSchema,
  createTimeEntrySchema,
  deleteTimeEntrySchema,
  linkTimeEntriesToInvoiceSchema,
  rejectTimeEntriesSchema,
  resendTimesheetReportSchema,
  respondTimesheetReportSchema,
  sendTimesheetToClientSchema,
  setMemberRateSchema,
  setProjectBudgetSchema,
  submitTimesheetSchema,
  updateTimeEntrySchema,
} from './common'

/** Columns selected for bulk time entry operations. */
const timeEntryColumns = {
  id: timeEntries.id,
  projectId: timeEntries.projectId,
  memberId: timeEntries.memberId,
  durationMinutes: timeEntries.durationMinutes,
  date: timeEntries.date,
  status: timeEntries.status,
  createdAt: timeEntries.createdAt,
  billable: timeEntries.billable,
  description: timeEntries.description,
} as const

/**
 * Validates that every entry in `entries` belongs to the same project.
 * Throws if entries span multiple projects.
 * Returns the single shared projectId.
 */
function assertSingleProject(entries: Array<{ projectId: string }>): string {
  const projectIds = new Set(entries.map((e) => e.projectId))
  if (projectIds.size !== 1) {
    throw new Error('All entries must belong to the same project')
  }
  return [...projectIds][0]!
}

export const createTimeEntryAction = authedActionClient
  .inputSchema(createTimeEntrySchema)
  .action(
    async ({
      parsedInput: {
        projectId,
        requirementId,
        description,
        date,
        durationMinutes,
        billable,
      },
      ctx: { role, orgMember, user },
    }) => {
      if (!role.authorize({ time_entry: ['create'] }).success) {
        throw new Error('You do not have permission to create time entries')
      }
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('You do not have access to this project')
      }

      const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'
      const settings = await projectsService.getSettings(
        orgMember.organizationId,
        projectId
      )
      const clientOff = settings.clientInvolvement.timesheets === 'off'

      const [entry] = await db
        .insert(timeEntries)
        .values({
          projectId,
          requirementId: requirementId || null,
          memberId: orgMember.id,
          description,
          date: new Date(date),
          durationMinutes,
          billable,
          status: isAdmin
            ? clientOff
              ? 'client_accepted'
              : 'admin_accepted'
            : 'draft',
        })
        .returning()

      if (isAdmin) {
        await checkBudgetThreshold(projectId, orgMember.organizationId)
      }

      return entry
    }
  )

export const updateTimeEntryAction = authedActionClient
  .inputSchema(updateTimeEntrySchema)
  .action(
    async ({
      parsedInput: {
        timeEntryId,
        requirementId,
        description,
        date,
        durationMinutes,
        billable,
      },
      ctx: { role, orgMember, user },
    }) => {
      if (!role.authorize({ time_entry: ['update'] }).success) {
        throw new Error('You do not have permission to update time entries')
      }

      const existing = await db
        .select({
          id: timeEntries.id,
          projectId: timeEntries.projectId,
          memberId: timeEntries.memberId,
          status: timeEntries.status,
        })
        .from(timeEntries)
        .where(eq(timeEntries.id, timeEntryId))
        .then((r) => r.at(0))

      if (!existing) {
        throw new Error('Time entry not found')
      }
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        existing.projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('Time entry not found')
      }

      const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'

      if (!isAdmin && existing.memberId !== orgMember.id) {
        throw new Error('You can only edit your own time entries')
      }

      if (
        !isAdmin &&
        existing.status !== 'draft' &&
        existing.status !== 'client_rejected'
      ) {
        throw new Error('Only draft or rejected entries can be edited')
      }

      const updates: Partial<typeof timeEntries.$inferInsert> = {}
      if (requirementId !== undefined) {
        updates.requirementId = requirementId || null
      }
      if (description !== undefined) {
        updates.description = description
      }
      if (date !== undefined) {
        updates.date = new Date(date)
      }
      if (durationMinutes !== undefined) {
        updates.durationMinutes = durationMinutes
      }
      if (billable !== undefined) {
        updates.billable = billable
      }
      // Reset rejected entries to draft when edited so they can be resubmitted
      if (existing.status === 'client_rejected' && !isAdmin) {
        updates.status = 'draft'
        updates.rejectReason = null
      }

      const [updated] = await db
        .update(timeEntries)
        .set(updates)
        .where(eq(timeEntries.id, timeEntryId))
        .returning()

      return updated
    }
  )

export const deleteTimeEntryAction = authedActionClient
  .inputSchema(deleteTimeEntrySchema)
  .action(
    async ({
      parsedInput: { timeEntryId },
      ctx: { role, orgMember, user },
    }) => {
      if (!role.authorize({ time_entry: ['delete'] }).success) {
        throw new Error('You do not have permission to delete time entries')
      }

      const existing = await db
        .select({
          id: timeEntries.id,
          projectId: timeEntries.projectId,
          memberId: timeEntries.memberId,
          status: timeEntries.status,
        })
        .from(timeEntries)
        .where(eq(timeEntries.id, timeEntryId))
        .then((r) => r.at(0))

      if (!existing) {
        throw new Error('Time entry not found')
      }
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        existing.projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('Time entry not found')
      }

      const isAdmin = orgMember.role === 'owner' || orgMember.role === 'admin'

      if (!isAdmin && existing.memberId !== orgMember.id) {
        throw new Error('You can only delete your own time entries')
      }

      if (!isAdmin && existing.status !== 'draft') {
        throw new Error('Only draft entries can be deleted')
      }

      await db.delete(timeEntries).where(eq(timeEntries.id, timeEntryId))

      return { success: true }
    }
  )

export const submitTimesheetAction = authedActionClient
  .inputSchema(submitTimesheetSchema)
  .action(
    async ({
      parsedInput: { timeEntryIds },
      ctx: { role, orgMember, user },
    }) => {
      if (!role.authorize({ time_entry: ['submit'] }).success) {
        throw new Error('You do not have permission to submit timesheets')
      }

      const entries = await db
        .select(timeEntryColumns)
        .from(timeEntries)
        .where(inArray(timeEntries.id, timeEntryIds))

      if (entries.length === 0) {
        throw new Error('No time entries found')
      }

      const projectId = assertSingleProject(entries)

      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('No time entries found')
      }

      for (const entry of entries) {
        if (entry.memberId !== orgMember.id) {
          throw new Error('You can only submit your own time entries')
        }
        if (entry.status !== 'draft') {
          throw new Error('Only draft entries can be submitted')
        }
      }

      await db
        .update(timeEntries)
        .set({ status: 'submitted_to_admin' })
        .where(inArray(timeEntries.id, timeEntryIds))

      const totalMinutes = entries.reduce(
        (sum, e) => sum + e.durationMinutes,
        0
      )
      const totalHours = (totalMinutes / 60).toFixed(1)

      const details = await projectsService.getProjectDetails(projectId)
      const recipients = await getAdminsAndOwners(orgMember.organizationId)

      await sendEmailsToRecipients(recipients, async (recipient) => {
        const html = await render(
          TimesheetSubmittedEmail({
            recipientName: recipient.name ?? 'there',
            memberName: user.name ?? 'there',
            projectName: details.projectName,
            totalHours,
            weekLabel: formatWeekLabel(entries.map((e) => e.date)),
            entryCount: entries.length,
            orgSlug: details.orgSlug ?? '',
            projectSlug: details.projectSlug,
          })
        )
        return {
          to: recipient.email,
          subject: `Timesheet submitted — ${user.name ?? 'A member'} (${totalHours}h)`,
          html,
        }
      })

      return { success: true }
    }
  )

export const approveTimeEntriesAction = authedActionClient
  .inputSchema(approveTimeEntriesSchema)
  .action(
    async ({
      parsedInput: { timeEntryIds },
      ctx: { role, orgMember, user },
    }) => {
      if (!role.authorize({ time_entry: ['approve'] }).success) {
        throw new Error('You do not have permission to approve time entries')
      }

      const entries = await db
        .select(timeEntryColumns)
        .from(timeEntries)
        .where(inArray(timeEntries.id, timeEntryIds))

      if (entries.length === 0) {
        throw new Error('No time entries found')
      }

      const projectId = assertSingleProject(entries)

      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('No time entries found')
      }

      // Batch-fetch all member rates before the loop to avoid N+1 queries
      const memberIds = [...new Set(entries.map((e) => e.memberId))]
      const allRates = await Promise.all(
        memberIds.map((id) =>
          timesheetService.getMemberRate(
            id,
            projectId,
            entries.find((e) => e.memberId === id)!.createdAt.toString()
          )
        )
      )
      const rateByMember = new Map(memberIds.map((id, i) => [id, allRates[i]]))

      for (const entry of entries) {
        if (entry.status !== 'submitted_to_admin') {
          throw new Error('Only submitted entries can be approved')
        }
        if (!rateByMember.get(entry.memberId)) {
          throw new Error('Please set member rate before approving timesheet.')
        }
      }

      const approveSettings = await projectsService.getSettings(
        orgMember.organizationId,
        projectId
      )
      const approvedStatus =
        approveSettings.clientInvolvement.timesheets === 'off'
          ? 'client_accepted'
          : 'admin_accepted'

      await db
        .update(timeEntries)
        .set({ status: approvedStatus })
        .where(inArray(timeEntries.id, timeEntryIds))

      const details = await projectsService.getProjectDetails(projectId)

      // Notify each member about their approved entries
      for (const memberId of memberIds) {
        const memberEntries = entries.filter((e) => e.memberId === memberId)
        const memberMinutes = memberEntries.reduce(
          (sum, e) => sum + e.durationMinutes,
          0
        )
        const [member] = await db
          .select({ email: users.email, name: users.name })
          .from(members)
          .innerJoin(users, eq(members.userId, users.id))
          .where(eq(members.id, memberId))

        if (member) {
          await sendEmailsToRecipients([member], async (recipient) => {
            const html = await render(
              TimesheetApprovedEmail({
                recipientName: recipient.name ?? 'there',
                approverName: user.name ?? 'there',
                projectName: details.projectName,
                totalHours: (memberMinutes / 60).toFixed(1),
                weekLabel: formatWeekLabel(memberEntries.map((e) => e.date)),
                entryCount: memberEntries.length,
                orgSlug: details.orgSlug ?? '',
                projectSlug: details.projectSlug,
              })
            )
            return {
              to: recipient.email,
              subject: `Timesheet approved — ${(memberMinutes / 60).toFixed(1)}h`,
              html,
            }
          })
        }
      }

      await checkBudgetThreshold(projectId, orgMember.organizationId)

      return { success: true }
    }
  )

export const rejectTimeEntriesAction = authedActionClient
  .inputSchema(rejectTimeEntriesSchema)
  .action(
    async ({
      parsedInput: { timeEntryIds, reason },
      ctx: { role, user, orgMember },
    }) => {
      if (!role.authorize({ time_entry: ['reject'] }).success) {
        throw new Error('You do not have permission to reject time entries')
      }

      const entries = await db
        .select(timeEntryColumns)
        .from(timeEntries)
        .where(inArray(timeEntries.id, timeEntryIds))

      if (entries.length === 0) {
        throw new Error('No time entries found')
      }

      const projectId = assertSingleProject(entries)

      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('No time entries found')
      }

      for (const entry of entries) {
        if (entry.status !== 'submitted_to_admin') {
          throw new Error('Only submitted entries can be rejected')
        }
      }

      await db
        .update(timeEntries)
        .set({ status: 'admin_rejected', rejectReason: reason })
        .where(inArray(timeEntries.id, timeEntryIds))

      const details = await projectsService.getProjectDetails(projectId)

      const memberIds = [...new Set(entries.map((e) => e.memberId))]
      for (const memberId of memberIds) {
        const memberEntries = entries.filter((e) => e.memberId === memberId)
        const memberMinutes = memberEntries.reduce(
          (sum, e) => sum + e.durationMinutes,
          0
        )
        const [member] = await db
          .select({ email: users.email, name: users.name })
          .from(members)
          .innerJoin(users, eq(members.userId, users.id))
          .where(eq(members.id, memberId))

        if (member) {
          await sendEmailsToRecipients([member], async (recipient) => {
            const html = await render(
              TimesheetRejectedEmail({
                recipientName: recipient.name ?? 'there',
                rejectorName: user.name ?? 'there',
                projectName: details.projectName,
                totalHours: (memberMinutes / 60).toFixed(1),
                weekLabel: formatWeekLabel(memberEntries.map((e) => e.date)),
                reason,
                orgSlug: details.orgSlug ?? '',
                projectSlug: details.projectSlug,
              })
            )
            return {
              to: recipient.email,
              subject: 'Timesheet rejected — changes requested',
              html,
            }
          })
        }
      }

      return { success: true }
    }
  )

export const setMemberRateAction = authedActionClient
  .inputSchema(setMemberRateSchema)
  .action(
    async ({
      parsedInput: { memberId, projectId, hourlyRate, currency, effectiveFrom },
      ctx: { role, user, orgMember },
    }) => {
      if (!role.authorize({ member_rate: ['manage'] }).success) {
        throw new Error('You do not have permission to manage member rates')
      }
      if (projectId) {
        const hasProjectAccess = await authService.checkProjectAccess(
          orgMember.organizationId,
          projectId,
          user.id
        )
        if (!hasProjectAccess.success) {
          throw new Error('You do not have access to this project')
        }
      }

      const effectiveDate = new Date(effectiveFrom)
      const resolvedProjectId = projectId || null

      // Upsert: update existing rate if same member+project+effectiveFrom
      const existing = await db
        .select({ id: memberRates.id })
        .from(memberRates)
        .where(
          and(
            eq(memberRates.memberId, memberId),
            resolvedProjectId
              ? eq(memberRates.projectId, resolvedProjectId)
              : isNull(memberRates.projectId),
            eq(memberRates.effectiveFrom, effectiveDate)
          )
        )
        .then((r) => r.at(0))

      let rate: typeof memberRates.$inferSelect | undefined
      if (existing) {
        const [newRate] = await db
          .update(memberRates)
          .set({ hourlyRate, currency })
          .where(eq(memberRates.id, existing.id))
          .returning()
        rate = newRate ?? undefined
      } else {
        const [newRate] = await db
          .insert(memberRates)
          .values({
            memberId,
            projectId: resolvedProjectId,
            hourlyRate,
            currency,
            effectiveFrom: effectiveDate,
          })
          .returning()
        rate = newRate ?? undefined
      }

      return rate
    }
  )

export const setProjectBudgetAction = authedActionClient
  .inputSchema(setProjectBudgetSchema)
  .action(
    async ({
      parsedInput: { projectId, budgetMinutes, alertThreshold },
      ctx: { role, user, orgMember },
    }) => {
      if (!role.authorize({ project_budget: ['manage'] }).success) {
        throw new Error('You do not have permission to manage project budgets')
      }
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('You do not have access to this project')
      }

      const existing = await db
        .select({ id: projectBudgets.id })
        .from(projectBudgets)
        .where(eq(projectBudgets.projectId, projectId))
        .then((r) => r.at(0))

      let budget: typeof projectBudgets.$inferSelect | undefined
      if (existing) {
        ;[budget] = await db
          .update(projectBudgets)
          .set({ budgetMinutes, alertThreshold })
          .where(eq(projectBudgets.id, existing.id))
          .returning()
      } else {
        ;[budget] = await db
          .insert(projectBudgets)
          .values({ projectId, budgetMinutes, alertThreshold })
          .returning()
      }

      return budget
    }
  )

export const linkTimeEntriesToInvoiceAction = authedActionClient
  .inputSchema(linkTimeEntriesToInvoiceSchema)
  .action(
    async ({
      parsedInput: { timeEntryIds, invoiceId },
      ctx: { role, user, orgMember },
    }) => {
      if (!role.authorize({ invoice: ['create'] }).success) {
        throw new Error('You do not have permission to link time entries')
      }

      const entries = await db
        .select({ id: timeEntries.id, projectId: timeEntries.projectId })
        .from(timeEntries)
        .where(inArray(timeEntries.id, timeEntryIds))
      if (entries.length === 0) {
        throw new Error('No time entries found')
      }

      const projectId = assertSingleProject(entries)

      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('No time entries found')
      }

      await db
        .update(timeEntries)
        .set({ invoiceId })
        .where(inArray(timeEntries.id, timeEntryIds))

      return { success: true }
    }
  )

export const sendTimesheetToClientAction = authedActionClient
  .inputSchema(sendTimesheetToClientSchema)
  .action(
    async ({
      parsedInput: {
        projectId,
        clientMemberIds,
        title,
        timeEntryIds,
        currency,
      },
      ctx: { role, orgMember, user },
    }) => {
      if (!role.authorize({ timesheet_report: ['send'] }).success) {
        throw new Error('You do not have permission to send timesheets')
      }
      if (clientMemberIds.length === 0) {
        throw new Error('At least one client member is required')
      }
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('You do not have access to this project')
      }
      const settings = await projectsService.getSettings(
        orgMember.organizationId,
        projectId
      )
      if (settings.clientInvolvement.timesheets === 'off') {
        throw new Error(
          'Client involvement is disabled for timesheets in this project'
        )
      }

      const entries = await db
        .select(timeEntryColumns)
        .from(timeEntries)
        .where(
          and(
            inArray(timeEntries.id, timeEntryIds),
            eq(timeEntries.projectId, projectId)
          )
        )
      if (entries.length !== timeEntryIds.length) {
        throw new Error(
          'Some of the time entries do not belong to the selected project.'
        )
      }
      for (const entry of entries) {
        if (entry.status !== 'admin_accepted') {
          throw new Error('Only approved entries can be sent to clients')
        }
      }

      const totalMinutes = entries.reduce(
        (sum, e) => sum + e.durationMinutes,
        0
      )

      const memberIds = [...new Set(entries.map((e) => e.memberId))]
      const allRates = await Promise.all(
        memberIds.map((id) =>
          timesheetService.getMemberRate(
            id,
            projectId,
            entries.find((e) => e.memberId === id)!.date.toISOString()
          )
        )
      )
      const rateByMember = new Map(memberIds.map((id, i) => [id, allRates[i]]))

      let totalAmountCents = 0
      for (const entry of entries) {
        const rate = rateByMember.get(entry.memberId)
        if (rate) {
          totalAmountCents += Math.round(
            (entry.durationMinutes / 60) * rate.hourlyRate
          )
        }
      }

      const report = await db.transaction(async (tx) => {
        const [r] = await tx
          .insert(timesheetReports)
          .values({
            projectId,
            title,
            totalMinutes,
            totalAmount: totalAmountCents,
            currency,
            sentByMemberId: orgMember.id,
            status: 'sent',
            sentAt: new Date(),
          })
          .returning()

        if (!r) {
          throw new Error('Failed to create timesheet report')
        }

        await tx.insert(timesheetReportRecipients).values(
          clientMemberIds.map((clientMemberId) => ({
            reportId: r.id,
            clientMemberId,
            status: 'pending' as const,
          }))
        )

        await tx.insert(timesheetReportEntries).values(
          timeEntryIds.map((teId) => ({
            reportId: r.id,
            timeEntryId: teId,
          }))
        )
        await tx
          .update(timeEntries)
          .set({ status: 'submitted_to_client' })
          .where(inArray(timeEntries.id, timeEntryIds))

        return r
      })

      const details = await projectsService.getProjectDetails(projectId)

      const clients = await db
        .select({ email: users.email, name: users.name })
        .from(members)
        .innerJoin(users, eq(members.userId, users.id))
        .where(inArray(members.id, clientMemberIds))

      if (clients.length > 0) {
        const totalHours = (totalMinutes / 60).toFixed(1)
        const totalAmountFormatted = (totalAmountCents / 100).toLocaleString(
          'en-US',
          {
            style: 'currency',
            currency,
          }
        )
        await sendEmailsToRecipients(clients, async (recipient) => {
          const html = await render(
            TimesheetSentToClientEmail({
              recipientName: recipient.name ?? 'there',
              senderName: user.name ?? 'there',
              projectName: details.projectName,
              reportTitle: title,
              totalHours,
              totalAmount: totalAmountFormatted,
              currency,
              orgSlug: details.orgSlug ?? '',
              projectSlug: details.projectSlug,
              reportId: report.id,
            })
          )
          return {
            to: recipient.email,
            subject: `Timesheet for review — ${title}`,
            html,
          }
        })
      }

      return report
    }
  )

export const respondTimesheetReportAction = authedActionClient
  .inputSchema(respondTimesheetReportSchema)
  .action(
    async ({
      parsedInput: { reportId, action, reason },
      ctx: { role, orgMember, user },
    }) => {
      const permission =
        action === 'approve' ? ('approve' as const) : ('dispute' as const)
      if (!role.authorize({ timesheet_report: [permission] }).success) {
        throw new Error(`You do not have permission to ${action} timesheets`)
      }

      const [report] = await db
        .select({
          id: timesheetReports.id,
          projectId: timesheetReports.projectId,
          title: timesheetReports.title,
          status: timesheetReports.status,
          totalMinutes: timesheetReports.totalMinutes,
          sentByMemberId: timesheetReports.sentByMemberId,
        })
        .from(timesheetReports)
        .where(eq(timesheetReports.id, reportId))

      if (!report) {
        throw new Error('Report not found')
      }
      const hasProjectAccess = await authService.checkProjectAccess(
        orgMember.organizationId,
        report.projectId,
        user.id
      )
      if (!hasProjectAccess.success) {
        throw new Error('Report not found')
      }
      const settings = await projectsService.getSettings(
        orgMember.organizationId,
        report.projectId
      )
      if (settings.clientInvolvement.timesheets === 'off') {
        throw new Error(
          'Client involvement is disabled for timesheets in this project'
        )
      }
      if (report.status !== 'sent') {
        throw new Error('Only sent reports can be responded to')
      }

      const recipients = await db
        .select({
          id: timesheetReportRecipients.id,
          clientMemberId: timesheetReportRecipients.clientMemberId,
          status: timesheetReportRecipients.status,
        })
        .from(timesheetReportRecipients)
        .where(eq(timesheetReportRecipients.reportId, reportId))

      const currentRecipient = recipients.find(
        (r) => r.clientMemberId === orgMember.id
      )
      if (!currentRecipient) {
        throw new Error('Only assigned clients can respond to this report')
      }
      if (currentRecipient.status !== 'pending') {
        throw new Error('You have already responded to this report')
      }

      const recipientStatus = action === 'approve' ? 'approved' : 'disputed'

      await db
        .update(timesheetReportRecipients)
        .set({
          status: recipientStatus,
          disputeReason: action === 'dispute' ? (reason ?? null) : null,
          respondedAt: new Date(),
        })
        .where(eq(timesheetReportRecipients.id, currentRecipient.id))

      if (action === 'dispute') {
        await db.transaction(async (tx) => {
          await tx
            .update(timesheetReports)
            .set({
              status: 'disputed',
              respondedAt: new Date(),
            })
            .where(eq(timesheetReports.id, reportId))
          const entries = await tx
            .select()
            .from(timesheetReportEntries)
            .where(eq(timesheetReportEntries.reportId, reportId))
          await tx
            .update(timeEntries)
            .set({ status: 'client_rejected' })
            .where(
              inArray(
                timeEntries.id,
                entries.map((e) => e.timeEntryId)
              )
            )
        })
      } else {
        const totalRecipients = recipients.length
        const alreadyApproved = recipients.filter(
          (r) => r.status === 'approved'
        ).length
        const totalApproved = alreadyApproved + 1

        if (totalApproved >= totalRecipients) {
          await db.transaction(async (tx) => {
            await tx
              .update(timesheetReports)
              .set({
                status: 'approved',
                respondedAt: new Date(),
              })
              .where(eq(timesheetReports.id, reportId))
            const entries = await tx
              .select()
              .from(timesheetReportEntries)
              .where(eq(timesheetReportEntries.reportId, reportId))
            await tx
              .update(timeEntries)
              .set({ status: 'client_accepted' })
              .where(
                inArray(
                  timeEntries.id,
                  entries.map((e) => e.timeEntryId)
                )
              )
          })
        }
      }

      if (report.sentByMemberId) {
        const [sender] = await db
          .select({ email: users.email, name: users.name })
          .from(members)
          .innerJoin(users, eq(members.userId, users.id))
          .where(eq(members.id, report.sentByMemberId))

        if (sender) {
          const details = await projectsService.getProjectDetails(
            report.projectId
          )
          const totalHours = (report.totalMinutes / 60).toFixed(1)
          await sendEmailsToRecipients([sender], async (recipient) => {
            const html = await render(
              TimesheetClientRespondedEmail({
                recipientName: recipient.name ?? 'there',
                clientName: user.name ?? 'there',
                projectName: details.projectName,
                reportTitle: report.title,
                totalHours,
                action: action === 'approve' ? 'approved' : 'disputed',
                disputeReason: reason,
                orgSlug: details.orgSlug ?? '',
                projectSlug: details.projectSlug,
                reportId: report.id,
              })
            )
            return {
              to: recipient.email,
              subject: `Timesheet ${action === 'approve' ? 'approved' : 'disputed'} — ${report.title}`,
              html,
            }
          })
        }
      }

      return { success: true }
    }
  )

export const resendTimesheetReportAction = authedActionClient
  .inputSchema(resendTimesheetReportSchema)
  .action(
    async ({ parsedInput: { reportId }, ctx: { role, orgMember, user } }) => {
      if (!role.authorize({ timesheet_report: ['send'] }).success) {
        throw new Error('You do not have permission to resend timesheets')
      }

      const [report] = await db
        .select({
          id: timesheetReports.id,
          projectId: timesheetReports.projectId,
          title: timesheetReports.title,
          status: timesheetReports.status,
          currency: timesheetReports.currency,
        })
        .from(timesheetReports)
        .where(eq(timesheetReports.id, reportId))

      if (!report) {
        throw new Error('Report not found')
      }

      const [project] = await db
        .select({ organizationId: projects.organizationId })
        .from(projects)
        .where(eq(projects.id, report.projectId))
      if (!project || project.organizationId !== orgMember.organizationId) {
        throw new Error('Report not found')
      }

      const settings = await projectsService.getSettings(
        orgMember.organizationId,
        report.projectId
      )
      if (settings.clientInvolvement.timesheets === 'off') {
        throw new Error(
          'Client involvement is disabled for timesheets in this project'
        )
      }

      if (report.status !== 'disputed') {
        throw new Error('Only disputed reports can be resent')
      }

      const entryLinks = await db
        .select({ timeEntryId: timesheetReportEntries.timeEntryId })
        .from(timesheetReportEntries)
        .where(eq(timesheetReportEntries.reportId, reportId))

      const entryIds = entryLinks.map((e) => e.timeEntryId)
      const linkedEntries =
        entryIds.length > 0
          ? await db
              .select(timeEntryColumns)
              .from(timeEntries)
              .where(inArray(timeEntries.id, entryIds))
          : []

      const totalMinutes = linkedEntries.reduce(
        (sum, e) => sum + e.durationMinutes,
        0
      )

      const memberIds = [...new Set(linkedEntries.map((e) => e.memberId))]
      const allRates = await Promise.all(
        memberIds.map((id) =>
          timesheetService.getMemberRate(
            id,
            report.projectId,
            linkedEntries.find((e) => e.memberId === id)!.date.toISOString()
          )
        )
      )
      const rateByMember = new Map(memberIds.map((id, i) => [id, allRates[i]]))

      let totalAmountCents = 0
      for (const entry of linkedEntries) {
        const rate = rateByMember.get(entry.memberId)
        if (rate) {
          totalAmountCents += Math.round(
            (entry.durationMinutes / 60) * rate.hourlyRate
          )
        }
      }

      await db
        .update(timesheetReports)
        .set({
          status: 'sent',
          disputeReason: null,
          respondedAt: null,
          sentAt: new Date(),
          totalMinutes,
          totalAmount: totalAmountCents,
        })
        .where(eq(timesheetReports.id, reportId))

      await db
        .update(timesheetReportRecipients)
        .set({
          status: 'pending',
          disputeReason: null,
          respondedAt: null,
        })
        .where(eq(timesheetReportRecipients.reportId, reportId))

      const details = await projectsService.getProjectDetails(report.projectId)

      const recipients = await db
        .select({ clientMemberId: timesheetReportRecipients.clientMemberId })
        .from(timesheetReportRecipients)
        .where(eq(timesheetReportRecipients.reportId, reportId))

      const clientMemberIds = recipients.map((r) => r.clientMemberId)

      if (clientMemberIds.length > 0) {
        const clients = await db
          .select({ email: users.email, name: users.name })
          .from(members)
          .innerJoin(users, eq(members.userId, users.id))
          .where(inArray(members.id, clientMemberIds))

        if (clients.length > 0) {
          const totalHours = (totalMinutes / 60).toFixed(1)
          const totalAmountFormatted = (totalAmountCents / 100).toLocaleString(
            'en-US',
            { style: 'currency', currency: report.currency }
          )
          await sendEmailsToRecipients(clients, async (recipient) => {
            const html = await render(
              TimesheetSentToClientEmail({
                recipientName: recipient.name ?? 'there',
                senderName: user.name ?? 'there',
                projectName: details.projectName,
                reportTitle: report.title,
                totalHours,
                totalAmount: totalAmountFormatted,
                currency: report.currency,
                orgSlug: details.orgSlug ?? '',
                projectSlug: details.projectSlug,
                reportId: report.id,
              })
            )
            return {
              to: recipient.email,
              subject: `Revised timesheet for review — ${report.title}`,
              html,
            }
          })
        }
      }

      return { success: true }
    }
  )

function formatWeekLabel(dates: Date[]): string {
  if (dates.length === 0) {
    return ''
  }
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const first = sorted.at(0)!
  const last = sorted.at(-1)!
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const year = last.getFullYear()
  return `${fmt(first)} – ${fmt(last)}, ${year}`
}

async function checkBudgetThreshold(projectId: string, organizationId: string) {
  const budgetStatus = await timesheetService.getProjectBudgetStatus(projectId)
  if (!budgetStatus) {
    return
  }

  const { budget, percentageUsed, totalApprovedMinutes } = budgetStatus

  if (percentageUsed >= budget.alertThreshold) {
    const details = await projectsService.getProjectDetails(projectId)
    const recipients = await getAdminsAndOwners(organizationId)

    await sendEmailsToRecipients(recipients, async (recipient) => {
      const html = await render(
        BudgetThresholdReachedEmail({
          recipientName: recipient.name ?? 'there',
          projectName: details.projectName,
          organizationName: details.orgName,
          percentageUsed,
          hoursUsed: (totalApprovedMinutes / 60).toFixed(1),
          hoursTotal: (budget.budgetMinutes / 60).toFixed(1),
          orgSlug: details.orgSlug ?? '',
          projectSlug: details.projectSlug,
        })
      )
      return {
        to: recipient.email,
        subject: `Budget alert — ${percentageUsed}% used`,
        html,
      }
    })
  }
}
