'use server'

import { timesheetService } from '@/app/api/timesheets/service'
import {
  orgScopedActionClient,
  projectScopedActionClient,
} from '@/lib/safe-action'
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

export const createTimeEntryAction = projectScopedActionClient
  .metadata({ authorize: { time_entry: ['create'] } })
  .inputSchema(createTimeEntrySchema)
  .action(({ parsedInput, ctx: { orgMember, project } }) =>
    timesheetService.createEntry({
      project,
      orgMember,
      requirementId: parsedInput.requirementId,
      description: parsedInput.description,
      date: parsedInput.date,
      durationMinutes: parsedInput.durationMinutes,
      billable: parsedInput.billable,
      customValues: parsedInput.customValues,
    })
  )

export const updateTimeEntryAction = orgScopedActionClient
  .metadata({ authorize: { time_entry: ['update'] } })
  .inputSchema(updateTimeEntrySchema)
  .action(({ parsedInput, ctx: { orgMember } }) =>
    timesheetService.updateEntry({
      timeEntryId: parsedInput.timeEntryId,
      orgMember,
      requirementId: parsedInput.requirementId,
      description: parsedInput.description,
      date: parsedInput.date,
      durationMinutes: parsedInput.durationMinutes,
      billable: parsedInput.billable,
      customValues: parsedInput.customValues,
    })
  )

export const deleteTimeEntryAction = orgScopedActionClient
  .metadata({ authorize: { time_entry: ['delete'] } })
  .inputSchema(deleteTimeEntrySchema)
  .action(({ parsedInput: { timeEntryId }, ctx: { orgMember } }) =>
    timesheetService.deleteEntry({ timeEntryId, orgMember })
  )

export const submitTimesheetAction = orgScopedActionClient
  .metadata({ authorize: { time_entry: ['submit'] } })
  .inputSchema(submitTimesheetSchema)
  .action(({ parsedInput: { timeEntryIds }, ctx: { orgMember } }) =>
    timesheetService.submit({ timeEntryIds, orgMember })
  )

export const approveTimeEntriesAction = orgScopedActionClient
  .metadata({ authorize: { time_entry: ['approve'] } })
  .inputSchema(approveTimeEntriesSchema)
  .action(({ parsedInput: { timeEntryIds }, ctx: { orgMember } }) =>
    timesheetService.approve({ timeEntryIds, orgMember })
  )

export const rejectTimeEntriesAction = orgScopedActionClient
  .metadata({ authorize: { time_entry: ['reject'] } })
  .inputSchema(rejectTimeEntriesSchema)
  .action(({ parsedInput: { timeEntryIds, reason }, ctx: { orgMember } }) =>
    timesheetService.reject({ timeEntryIds, reason, orgMember })
  )

export const setMemberRateAction = orgScopedActionClient
  .metadata({ authorize: { member_rate: ['manage'] } })
  .inputSchema(setMemberRateSchema)
  .action(({ parsedInput, ctx: { orgMember } }) =>
    timesheetService.setMemberRate({
      memberId: parsedInput.memberId,
      projectId: parsedInput.projectId,
      orgMember,
      effectiveFrom: parsedInput.effectiveFrom,
      billingCurrency: parsedInput.billingCurrency,
      billingFrequency: parsedInput.billingFrequency,
      billingRate: parsedInput.billingRate,
      payCurrency: parsedInput.payCurrency,
      payFrequency: parsedInput.payFrequency,
      payRate: parsedInput.payRate,
    })
  )

export const setProjectBudgetAction = projectScopedActionClient
  .metadata({ authorize: { project_budget: ['manage'] } })
  .inputSchema(setProjectBudgetSchema)
  .action(
    ({ parsedInput: { budgetMinutes, alertThreshold }, ctx: { project } }) =>
      timesheetService.setProjectBudget({
        projectId: project.id,
        budgetMinutes,
        alertThreshold,
      })
  )

export const linkTimeEntriesToInvoiceAction = orgScopedActionClient
  .metadata({ authorize: { invoice: ['create'] } })
  .inputSchema(linkTimeEntriesToInvoiceSchema)
  .action(({ parsedInput: { timeEntryIds, invoiceId }, ctx: { orgMember } }) =>
    timesheetService.linkToInvoice({ timeEntryIds, invoiceId, orgMember })
  )

export const sendTimesheetToClientAction = projectScopedActionClient
  .metadata({ authorize: { timesheet_report: ['send'] } })
  .inputSchema(sendTimesheetToClientSchema)
  .action(
    ({
      parsedInput: { clientMemberIds, title, timeEntryIds },
      ctx: { orgMember, project },
    }) =>
      timesheetService.sendToClient({
        project,
        orgMember,
        clientMemberIds,
        title,
        timeEntryIds,
      })
  )

export const respondTimesheetReportAction = orgScopedActionClient
  .metadata({})
  .inputSchema(respondTimesheetReportSchema)
  .action(
    ({
      parsedInput: { reportId, action, reason },
      ctx: { role, orgMember },
    }) => {
      const permission = action === 'approve' ? 'approve' : 'dispute'
      if (!role.authorize({ timesheet_report: [permission] }).success) {
        throw new Error(`You do not have permission to ${action} timesheets`)
      }
      return timesheetService.respondReport({
        reportId,
        action,
        reason,
        orgMember,
      })
    }
  )

export const resendTimesheetReportAction = orgScopedActionClient
  .metadata({ authorize: { timesheet_report: ['send'] } })
  .inputSchema(resendTimesheetReportSchema)
  .action(({ parsedInput: { reportId }, ctx: { orgMember } }) =>
    timesheetService.resendReport({ reportId, orgMember })
  )
