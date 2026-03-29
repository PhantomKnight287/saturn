'use client'

import { useRouter } from '@bprogress/next/app'
import {
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Receipt,
  RefreshCw,
  Send,
  Users,
} from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
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
import { resendTimesheetReportAction } from '../actions'
import { formatMinutes } from '../common'
import type {
  ReportEntryDetail,
  TimesheetReport,
  TimesheetReportRecipient,
} from '../types'

interface SentReportsListProps {
  orgSlug: string
  projectName: string
  projectSlug: string
  reportEntriesMap: Record<string, ReportEntryDetail[]>
  reportRecipientsMap: Record<string, TimesheetReportRecipient[]>
  reports: TimesheetReport[]
}

const statusConfig: Record<
  string,
  {
    label: string
    variant: 'secondary' | 'outline' | 'default' | 'destructive'
  }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent: { label: 'Awaiting Review', variant: 'outline' },
  approved: { label: 'Client Approved', variant: 'default' },
  disputed: { label: 'Disputed', variant: 'destructive' },
}

export function SentReportsList({
  reports,
  reportEntriesMap,
  reportRecipientsMap,
  orgSlug,
  projectSlug,
}: SentReportsListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const router = useRouter()
  const resendAction = useAction(resendTimesheetReportAction, {
    onSuccess: () => {
      toast.success('Report resent to client')
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to resend report')
    },
  })

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (reports.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <Send />
          </EmptyMedia>
          <EmptyTitle>No reports sent yet</EmptyTitle>
          <EmptyDescription>
            Send approved timesheets to clients for review using the &ldquo;Send
            to Client&rdquo; button.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const disputed = reports.filter((r) => r.status === 'disputed')
  const awaiting = reports.filter((r) => r.status === 'sent')
  const resolved = reports.filter(
    (r) => r.status === 'approved' || r.status === 'draft'
  )

  return (
    <div className='space-y-6'>
      {disputed.length > 0 && (
        <div className='space-y-3'>
          <h3 className='font-medium text-destructive text-sm'>
            Needs Attention ({disputed.length})
          </h3>
          {disputed.map((report) => (
            <ReportCard
              entries={reportEntriesMap[report.id] ?? []}
              expanded={expandedIds.has(report.id)}
              isResending={resendAction.isPending}
              key={report.id}
              onResend={() =>
                resendAction.execute({
                  reportId: report.id,
                })
              }
              onToggle={() => toggleExpand(report.id)}
              recipients={reportRecipientsMap[report.id] ?? []}
              report={report}
            />
          ))}
        </div>
      )}

      {awaiting.length > 0 && (
        <div className='space-y-3'>
          <h3 className='font-medium text-muted-foreground text-sm'>
            Awaiting Client Review ({awaiting.length})
          </h3>
          {awaiting.map((report) => (
            <ReportCard
              entries={reportEntriesMap[report.id] ?? []}
              expanded={expandedIds.has(report.id)}
              key={report.id}
              onToggle={() => toggleExpand(report.id)}
              recipients={reportRecipientsMap[report.id] ?? []}
              report={report}
            />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className='space-y-3'>
          <h3 className='font-medium text-muted-foreground text-sm'>
            Resolved ({resolved.length})
          </h3>
          {resolved.map((report) => (
            <ReportCard
              entries={reportEntriesMap[report.id] ?? []}
              expanded={expandedIds.has(report.id)}
              invoiceUrl={
                report.status === 'approved'
                  ? `/${orgSlug}/${projectSlug}/invoices/new?fromTimesheet=${report.id}`
                  : undefined
              }
              key={report.id}
              onToggle={() => toggleExpand(report.id)}
              recipients={reportRecipientsMap[report.id] ?? []}
              report={report}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ReportCard({
  report,
  entries,
  recipients,
  expanded,
  onToggle,
  onResend,
  isResending,
  invoiceUrl,
}: {
  report: TimesheetReport
  entries: ReportEntryDetail[]
  recipients: TimesheetReportRecipient[]
  expanded: boolean
  onToggle: () => void
  onResend?: () => void
  isResending?: boolean
  invoiceUrl?: string
}) {
  const totalHours = formatMinutes(report.totalMinutes)
  const totalAmount = (report.totalAmount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: report.currency,
  })
  const config = statusConfig[report.status] ?? statusConfig.draft

  // Group entries by member
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
      {/* Header - always visible */}
      <button
        className='flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30'
        onClick={onToggle}
        type='button'
      >
        <div className='flex items-center gap-3'>
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
              {report.sentAt && (
                <span>
                  {new Date(report.sentAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant={config?.variant ?? 'secondary'}>
            {config?.label ?? 'Draft'}
          </Badge>
          {invoiceUrl && (
            <a href={invoiceUrl} onClick={(e) => e.stopPropagation()}>
              <Button className='h-7 text-xs' size='sm' variant='outline'>
                <Receipt className='size-3' />
                Create Invoice
              </Button>
            </a>
          )}
        </div>
      </button>

      {/* Dispute banner */}
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
                    {new Date(r.respondedAt).toLocaleDateString('en-US', {
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
                size='sm'
              >
                <RefreshCw className='size-4' />
                {isResending ? 'Resending...' : 'Resend'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Expanded detail view */}
      {expanded && entries.length > 0 && (
        <>
          {/* Summary stats */}
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

          {/* Entries grouped by member */}
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
                            {new Date(entry.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
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
