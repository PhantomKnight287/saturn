'use client'

import { useRouter } from '@bprogress/next/app'
import { FileText } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import type { CustomFieldDefinition } from '@/lib/custom-fields'
import { respondTimesheetReportAction } from '../actions'
import type { ClientReportWithEntries } from '../types'
import { ReportCard } from './report-card'

interface ClientReportsViewProps {
  customFields?: CustomFieldDefinition[]
  reports: ClientReportWithEntries[]
}

export function ClientReportsView({
  reports,
  customFields = [],
}: ClientReportsViewProps) {
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const formId = useId()
  const router = useRouter()

  const { execute: executeRespond, isPending } = useAction(
    respondTimesheetReportAction,
    {
      onSuccess({ input }) {
        toast.success(
          input.action === 'approve'
            ? 'Timesheet approved'
            : 'Timesheet disputed'
        )
        setDisputeOpen(false)
        setDisputeReason('')
        setActiveReportId(null)
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to submit response')
      },
    }
  )

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

  const handleApprove = (reportId: string) => {
    executeRespond({ reportId, action: 'approve' })
  }

  const openDispute = (reportId: string) => {
    setActiveReportId(reportId)
    setDisputeReason('')
    setDisputeOpen(true)
  }

  const handleDispute = () => {
    if (!(activeReportId && disputeReason.trim())) {
      return
    }
    executeRespond({
      reportId: activeReportId,
      action: 'dispute',
      reason: disputeReason,
    })
  }

  const pending = reports.filter((r) => r.report.status === 'sent')
  const history = reports.filter((r) => r.report.status !== 'sent')

  if (reports.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <FileText />
          </EmptyMedia>
          <EmptyTitle>No timesheets yet</EmptyTitle>
          <EmptyDescription>
            When the team logs their work and sends it for your review,
            it&apos;ll show up here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <div className='space-y-8'>
        {pending.map((item) => (
          <ReportCard
            actionPending={isPending}
            customFields={customFields}
            entries={item.entries}
            expanded={expandedIds.has(item.report.id)}
            key={item.report.id}
            onApprove={handleApprove}
            onDispute={openDispute}
            onToggle={() => toggleExpand(item.report.id)}
            recipients={[]}
            report={item.report}
            viewerRole='client'
          />
        ))}

        {history.length > 0 && (
          <>
            {pending.length > 0 && <Separator />}
            <div className='space-y-6'>
              <p className='text-muted-foreground text-sm'>Past timesheets</p>
              {history.map((item) => (
                <ReportCard
                  customFields={customFields}
                  entries={item.entries}
                  expanded={expandedIds.has(item.report.id)}
                  key={item.report.id}
                  onToggle={() => toggleExpand(item.report.id)}
                  recipients={[]}
                  report={item.report}
                  viewerRole='client'
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog onOpenChange={setDisputeOpen} open={disputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an issue</DialogTitle>
            <DialogDescription>
              Let the team know what doesn&apos;t look right. They&apos;ll
              review and send an updated timesheet.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2'>
            <Label htmlFor={`${formId}-reason`}>
              What needs to be changed?
            </Label>
            <Textarea
              id={`${formId}-reason`}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder='e.g. The 3 hours on Mar 5 seems too high — we discussed this would take about 1.5 hours.'
              rows={4}
              value={disputeReason}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setDisputeOpen(false)}
              type='button'
              variant='outline'
            >
              Cancel
            </Button>
            <Button
              disabled={isPending || !disputeReason.trim()}
              onClick={handleDispute}
              type='button'
            >
              {isPending ? 'Sending...' : 'Send Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
