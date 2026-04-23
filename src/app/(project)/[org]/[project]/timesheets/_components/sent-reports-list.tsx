'use client'

import { useRouter } from '@bprogress/next/app'
import { Send } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { resendTimesheetReportAction } from '../actions'
import type {
  ReportEntryDetail,
  TimesheetReport,
  TimesheetReportRecipient,
} from '../types'
import { ReportCard } from './report-card'

interface SentReportsListProps {
  orgSlug: string
  projectName: string
  projectSlug: string
  reportEntriesMap: Record<string, ReportEntryDetail[]>
  reportRecipientsMap: Record<string, TimesheetReportRecipient[]>
  reports: TimesheetReport[]
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
