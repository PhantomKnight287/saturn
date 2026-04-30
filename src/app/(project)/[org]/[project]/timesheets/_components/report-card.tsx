'use client'

import {
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Receipt,
  RefreshCw,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMinutes, formatShortDate } from '../common'
import type {
  ReportEntryDetail,
  TimesheetReport,
  TimesheetReportRecipient,
} from '../types'
import TimesheetStatusBadge from './timesheet-status-badge'

interface Props {
  entries: ReportEntryDetail[]
  expanded: boolean
  invoiceUrl?: string
  isResending?: boolean
  onResend?: () => void
  onToggle: () => void
  recipients: TimesheetReportRecipient[]
  report: TimesheetReport
}

export function ReportCard({
  report,
  entries,
  recipients,
  expanded,
  onToggle,
  onResend,
  isResending,
  invoiceUrl,
}: Props) {
  const totalHours = formatMinutes(report.totalMinutes)
  const totalAmount = (report.totalAmount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: report.currency,
  })

  const grouped = new Map<string, ReportEntryDetail[]>()
  for (const entry of entries) {
    const key = entry.memberName ?? 'Team member'
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(entry)
  }

  return (
    <div className='overflow-hidden rounded-lg border'>
      <div className='flex w-full items-center justify-between px-4 py-3 hover:bg-muted/30'>
        <button
          className='flex flex-1 items-center gap-3 text-left'
          onClick={onToggle}
          type='button'
        >
          {expanded ? (
            <ChevronDown className='size-4 text-muted-foreground' />
          ) : (
            <ChevronRight className='size-4 text-muted-foreground' />
          )}
          <FileText className='size-4 text-muted-foreground' />
          <div>
            <span className='font-medium text-sm'>{report.title}</span>
            <div className='flex items-center gap-3 text-muted-foreground text-xs'>
              <span>
                To{' '}
                {recipients.length > 0
                  ? recipients
                      .map((r) => r.clientName ?? r.clientEmail)
                      .join(', ')
                  : 'No recipients'}
              </span>
              <span className='flex items-center gap-1'>
                <Clock className='size-3' />
                {totalHours}
              </span>
              <span>{totalAmount}</span>
              {report.sentAt && <span>{formatShortDate(report.sentAt)}</span>}
            </div>
          </div>
        </button>
        <div className='flex items-center gap-2'>
          <TimesheetStatusBadge status={report.status} />
          {invoiceUrl && (
            <a href={invoiceUrl}>
              <Button className='h-7 text-xs' variant='outline'>
                <Receipt className='size-3' />
                Create Invoice
              </Button>
            </a>
          )}
        </div>
      </div>

      {report.status === 'disputed' && (
        <div className='border-destructive/30 border-t bg-destructive/5 px-4 py-3'>
          {recipients
            .filter((r) => r.status === 'disputed' && r.disputeReason)
            .map((r) => (
              <div className='mb-2' key={r.id}>
                <p className='mb-1 font-medium text-destructive text-sm'>
                  {r.clientName ?? r.clientEmail} disputed:
                </p>
                <p className='text-sm'>{r.disputeReason}</p>
                {r.respondedAt && (
                  <p className='mt-1 text-muted-foreground text-xs'>
                    Disputed on{' '}
                    {formatShortDate(r.respondedAt, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            ))}
          {onResend && (
            <div className='mt-3'>
              <p className='mb-2 text-muted-foreground text-xs'>
                Edit entries in the Team tab, then resend.
              </p>
              <Button
                disabled={isResending}
                onClick={(e) => {
                  e.stopPropagation()
                  onResend()
                }}
              >
                <RefreshCw className='size-4' />
                {isResending ? 'Resending...' : 'Resend'}
              </Button>
            </div>
          )}
        </div>
      )}

      {expanded && entries.length > 0 && (
        <>
          <div className='grid grid-cols-3 divide-x border-t'>
            <div className='px-4 py-3 text-center'>
              <div className='mb-0.5 flex items-center justify-center gap-1 text-muted-foreground text-xs'>
                <Clock className='size-3' />
                Time
              </div>
              <p className='font-semibold'>{totalHours}</p>
            </div>
            <div className='px-4 py-3 text-center'>
              <div className='mb-0.5 flex items-center justify-center gap-1 text-muted-foreground text-xs'>
                <DollarSign className='size-3' />
                Amount
              </div>
              <p className='font-semibold'>{totalAmount}</p>
            </div>
            <div className='px-4 py-3 text-center'>
              <div className='mb-0.5 flex items-center justify-center gap-1 text-muted-foreground text-xs'>
                <Users className='size-3' />
                Members
              </div>
              <p className='font-semibold'>{grouped.size}</p>
            </div>
          </div>

          <div className='divide-y border-t'>
            {[...grouped.entries()].map(([memberName, memberEntries]) => {
              const memberMinutes = memberEntries.reduce(
                (s, e) => s + e.durationMinutes,
                0
              )

              return (
                <div key={memberName}>
                  <div className='flex items-center justify-between bg-muted/20 px-4 py-2'>
                    <span className='font-medium text-sm'>{memberName}</span>
                    <span className='text-muted-foreground text-xs'>
                      {formatMinutes(memberMinutes)}
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className='text-xs'>
                        <TableHead className='w-[90px]'>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Requirement</TableHead>
                        <TableHead className='w-[70px] text-center'>
                          Billable
                        </TableHead>
                        <TableHead className='w-[70px] text-right'>
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
                              <span className='text-muted-foreground'>No</span>
                            )}
                          </TableCell>
                          <TableCell className='text-right font-mono text-sm'>
                            {formatMinutes(entry.durationMinutes)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell className='font-medium text-sm' colSpan={4}>
                          Subtotal
                        </TableCell>
                        <TableCell className='text-right font-mono font-semibold text-sm'>
                          {formatMinutes(memberMinutes)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )
            })}
          </div>

          <Separator />
          <div className='flex items-center justify-between bg-muted/30 px-4 py-2.5'>
            <span className='font-semibold text-sm'>Grand Total</span>
            <div className='flex items-center gap-4'>
              <span className='font-mono font-semibold'>{totalHours}</span>
              <span className='font-semibold'>{totalAmount}</span>
            </div>
          </div>
        </>
      )}

      {expanded && entries.length === 0 && (
        <div className='border-t px-4 py-6 text-center text-muted-foreground text-sm'>
          No entry details available for this report.
        </div>
      )}
    </div>
  )
}
