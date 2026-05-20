'use client'

import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MessageSquareWarning,
  Receipt,
  ReceiptText,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CustomFieldDefinition } from '@/lib/custom-fields'
import { formatMinutes, formatShortDate } from '../common'
import type {
  ReportEntryDetail,
  TimesheetReport,
  TimesheetReportRecipient,
} from '../types'
import { CustomValuesInline } from './custom-values-inline'
import TimesheetStatusBadge from './timesheet-status-badge'

interface Props {
  actionPending?: boolean
  customFields?: CustomFieldDefinition[]
  entries: ReportEntryDetail[]
  expanded: boolean
  invoiceUrl?: string
  isAdmin?: boolean
  isResending?: boolean
  onApprove?: (id: string) => void
  onDispute?: (id: string) => void
  onResend?: () => void
  onToggle: () => void
  orgSlug?: string
  projectSlug?: string
  recipients: TimesheetReportRecipient[]
  report: TimesheetReport
  viewerRole?: 'sender' | 'client'
}

export function ReportCard({
  report,
  entries,
  recipients,
  expanded,
  onToggle,
  onResend,
  onApprove,
  onDispute,
  actionPending,
  customFields = [],
  isAdmin = false,
  isResending,
  invoiceUrl,
  orgSlug,
  projectSlug,
  viewerRole = 'sender',
}: Props) {
  const isClientView = viewerRole === 'client'
  const showClientActions =
    isClientView && report.status === 'sent' && onApprove && onDispute
  const canCreateMemberInvoice =
    isAdmin && !isClientView && orgSlug && projectSlug
  const totalHours = formatMinutes(report.totalMinutes)
  const totalAmount = (report.totalAmount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: report.currency,
  })

  const grouped = new Map<
    string,
    { memberId: string; memberName: string; entries: ReportEntryDetail[] }
  >()
  for (const entry of entries) {
    const memberName = entry.memberName ?? 'Team member'
    const existing = grouped.get(entry.memberId)
    if (existing) {
      existing.entries.push(entry)
    } else {
      grouped.set(entry.memberId, {
        memberId: entry.memberId,
        memberName,
        entries: [entry],
      })
    }
  }

  const subline = [
    !isClientView &&
      (recipients.length > 0
        ? `To ${recipients.map((r) => r.clientName ?? r.clientEmail).join(', ')}`
        : 'No recipients'),
    report.sentAt ? `Sent ${formatShortDate(report.sentAt)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className='overflow-hidden rounded-lg border'>
      <div className='flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/30'>
        <button
          className='flex flex-1 items-center gap-3 text-left'
          onClick={onToggle}
          type='button'
        >
          {expanded ? (
            <ChevronDown className='size-4 shrink-0 text-muted-foreground' />
          ) : (
            <ChevronRight className='size-4 shrink-0 text-muted-foreground' />
          )}
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <span className='truncate font-medium text-sm'>
                {report.title}
              </span>
              <TimesheetStatusBadge role={viewerRole} status={report.status} />
            </div>
            {subline && (
              <p className='mt-0.5 truncate text-muted-foreground text-xs'>
                {subline}
              </p>
            )}
          </div>
        </button>

        <div className='flex items-center gap-6'>
          {!expanded && (
            <div className='hidden text-right sm:block'>
              <p className='font-mono font-semibold text-sm'>{totalHours}</p>
              <p className='text-muted-foreground text-xs'>{totalAmount}</p>
            </div>
          )}
          <div className='flex items-center gap-2'>
            {invoiceUrl && (
              <Button asChild size='sm' variant='outline'>
                <a href={invoiceUrl}>
                  <Receipt className='size-3.5' />
                  Create Invoice
                </a>
              </Button>
            )}
            {showClientActions && (
              <>
                <Button
                  disabled={actionPending}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDispute?.(report.id)
                  }}
                  size='sm'
                  variant='outline'
                >
                  <MessageSquareWarning className='size-3.5' />
                  Report Issue
                </Button>
                <Button
                  disabled={actionPending}
                  onClick={(e) => {
                    e.stopPropagation()
                    onApprove?.(report.id)
                  }}
                  size='sm'
                >
                  <CheckCircle2 className='size-3.5' />
                  Approve
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {report.status === 'disputed' && (
        <div className='border-destructive/30 border-t bg-destructive/5 px-4 py-3'>
          {isClientView
            ? report.disputeReason && (
                <div>
                  <p className='mb-1 font-medium text-destructive text-sm'>
                    Your feedback
                  </p>
                  <p className='text-sm'>{report.disputeReason}</p>
                </div>
              )
            : recipients
                .filter((r) => r.status === 'disputed' && r.disputeReason)
                .map((r) => (
                  <div className='mb-2 last:mb-0' key={r.id}>
                    <p className='mb-1 font-medium text-destructive text-sm'>
                      {r.clientName ?? r.clientEmail} disputed
                      {r.respondedAt && (
                        <span className='ml-2 font-normal text-muted-foreground text-xs'>
                          {formatShortDate(r.respondedAt, {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </p>
                    <p className='text-sm'>{r.disputeReason}</p>
                  </div>
                ))}
          {onResend && (
            <div className='mt-3 flex items-center justify-between gap-3'>
              <p className='text-muted-foreground text-xs'>
                Edit entries in the Team tab, then resend.
              </p>
              <Button
                disabled={isResending}
                onClick={(e) => {
                  e.stopPropagation()
                  onResend()
                }}
                size='sm'
              >
                <RefreshCw className='size-3.5' />
                {isResending ? 'Resending...' : 'Resend'}
              </Button>
            </div>
          )}
        </div>
      )}

      {expanded && entries.length > 0 && (
        <div className='border-t'>
          {[...grouped.values()].map(
            ({ memberId, memberName, entries: memberEntries }, idx) => {
              const memberMinutes = memberEntries.reduce(
                (s, e) => s + e.durationMinutes,
                0
              )
              const memberInvoiceUrl =
                canCreateMemberInvoice &&
                `/${orgSlug}/${projectSlug}/invoices/new?fromTimesheet=${report.id}&memberId=${memberId}`
              const showSubtotal = grouped.size > 1
              const showMemberHeader = grouped.size > 1 || !!memberInvoiceUrl

              return (
                <div className={idx > 0 ? 'border-t' : ''} key={memberId}>
                  {showMemberHeader && (
                    <div className='flex items-center justify-between gap-3 bg-muted/20 px-4 py-2'>
                      <div className='flex items-baseline gap-3'>
                        <span className='font-medium text-sm'>
                          {memberName}
                        </span>
                        {grouped.size > 1 && (
                          <span className='font-mono text-muted-foreground text-xs'>
                            {formatMinutes(memberMinutes)}
                          </span>
                        )}
                      </div>
                      {memberInvoiceUrl && (
                        <Button asChild size='sm' variant='outline'>
                          <a href={memberInvoiceUrl}>
                            <ReceiptText className='size-3.5' />
                            Create Member Invoice
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                  <div className='px-4 py-2'>
                    <Table>
                      <TableHeader>
                        <TableRow className='text-muted-foreground'>
                          <TableHead className='h-8 w-[90px] font-medium'>
                            Date
                          </TableHead>
                          <TableHead className='h-8 font-medium'>
                            Description
                          </TableHead>
                          <TableHead className='h-8 font-medium'>
                            Requirement
                          </TableHead>
                          <TableHead className='h-8 w-[70px] text-center font-medium'>
                            Billable
                          </TableHead>
                          <TableHead className='h-8 w-[80px] text-right font-medium'>
                            Duration
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memberEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className='whitespace-nowrap text-sm'>
                              {formatShortDate(entry.date)}
                            </TableCell>
                            <TableCell className='text-sm'>
                              {entry.description}
                              <CustomValuesInline
                                customFields={customFields}
                                values={entry.customValues}
                              />
                            </TableCell>
                            <TableCell className='text-muted-foreground text-sm'>
                              {entry.requirementTitle ?? '—'}
                            </TableCell>
                            <TableCell className='text-center text-xs'>
                              {entry.billable ? (
                                <Badge className='text-xs' variant='outline'>
                                  Yes
                                </Badge>
                              ) : (
                                <span className='text-muted-foreground'>
                                  No
                                </span>
                              )}
                            </TableCell>
                            <TableCell className='text-right font-mono text-sm'>
                              {formatMinutes(entry.durationMinutes)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      {showSubtotal && (
                        <TableFooter>
                          <TableRow>
                            <TableCell
                              className='font-medium text-sm'
                              colSpan={4}
                            >
                              Subtotal
                            </TableCell>
                            <TableCell className='text-right font-mono font-semibold text-sm'>
                              {formatMinutes(memberMinutes)}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      )}
                    </Table>
                  </div>
                </div>
              )
            }
          )}

          <div className='flex items-center justify-between border-t bg-muted/30 px-4 py-3'>
            <span className='font-semibold text-sm'>Total</span>
            <div className='flex items-baseline gap-4'>
              <span className='font-mono font-semibold text-sm'>
                {totalHours}
              </span>
              <span className='font-semibold text-sm'>{totalAmount}</span>
            </div>
          </div>
        </div>
      )}

      {expanded && entries.length === 0 && (
        <div className='border-t px-4 py-6 text-center text-muted-foreground text-sm'>
          No entry details available for this report.
        </div>
      )}
    </div>
  )
}
