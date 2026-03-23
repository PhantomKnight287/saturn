'use client'

import { CheckCircle2, FileText, MessageSquareWarning } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { respondTimesheetReportAction } from '../actions'
import { formatMinutes } from '../common'
import type { ClientReportWithEntries } from '../types'

interface ClientReportsViewProps {
  reports: ClientReportWithEntries[]
}

export function ClientReportsView({ reports }: ClientReportsViewProps) {
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const formId = useId()

  const { execute: executeRespond, isPending } = useAction(
    respondTimesheetReportAction,
    {
      onSuccess() {
        toast.success('Response submitted')
        setDisputeOpen(false)
        setDisputeReason('')
        setActiveReportId(null)
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to submit response')
      },
    }
  )

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
          <TimesheetCard
            actionPending={isPending}
            item={item}
            key={item.report.id}
            onApprove={handleApprove}
            onDispute={openDispute}
          />
        ))}

        {history.length > 0 && (
          <>
            {pending.length > 0 && <Separator />}
            <div className='space-y-6'>
              <p className='text-muted-foreground text-sm'>Past timesheets</p>
              {history.map((item) => (
                <TimesheetCard item={item} key={item.report.id} />
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

function TimesheetCard({
  item,
  actionPending,
  onApprove,
  onDispute,
}: {
  item: ClientReportWithEntries
  actionPending?: boolean
  onApprove?: (id: string) => void
  onDispute?: (id: string) => void
}) {
  const { report, entries } = item
  const isSent = report.status === 'sent'
  const totalAmount = (report.totalAmount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: report.currency,
  })

  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return (
    <div className='overflow-hidden rounded-lg border'>
      <div className='flex items-center justify-between border-b bg-muted/30 px-2 py-3'>
        <div>
          <div className='flex items-center gap-2.5'>
            <h3 className='font-semibold'>{report.title}</h3>
            {report.status === 'approved' && (
              <Badge variant='default'>Approved</Badge>
            )}
            {report.status === 'disputed' && (
              <Badge variant='destructive'>Disputed</Badge>
            )}
          </div>
          {report.sentAt && (
            <p className='text-muted-foreground text-xs'>
              Sent{' '}
              {new Date(report.sentAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
        {isSent && onApprove && onDispute && (
          <div className='flex items-center gap-2'>
            <Button
              disabled={actionPending}
              onClick={() => onDispute(report.id)}
              size='sm'
              variant='outline'
            >
              <MessageSquareWarning className='mr-1.5 size-4' />
              Report Issue
            </Button>
            <Button
              disabled={actionPending}
              onClick={() => onApprove(report.id)}
              size='sm'
            >
              <CheckCircle2 className='mr-1.5 size-4' />
              Approve
            </Button>
          </div>
        )}
      </div>

      {report.status === 'disputed' && report.disputeReason && (
        <div className='border-b bg-destructive/5 px-4 py-3'>
          <p className='mb-0.5 font-medium text-destructive text-sm'>
            Your feedback
          </p>
          <p className='text-sm'>{report.disputeReason}</p>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-[100px]'>Date</TableHead>
            <TableHead>Person</TableHead>
            <TableHead>Work done</TableHead>
            <TableHead>Requirement</TableHead>
            <TableHead className='w-[80px] text-center'>Billable</TableHead>
            <TableHead className='w-[80px] text-right'>Hours</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className='whitespace-nowrap text-sm'>
                {new Date(entry.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </TableCell>
              <TableCell className='text-sm'>
                {entry.memberName ?? 'Team member'}
              </TableCell>
              <TableCell className='text-sm'>{entry.description}</TableCell>
              <TableCell className='text-muted-foreground text-sm'>
                {entry.requirementTitle ?? '—'}
              </TableCell>
              <TableCell className='text-center'>
                {entry.billable ? (
                  <Badge className='text-xs' variant='outline'>
                    Yes
                  </Badge>
                ) : (
                  <span className='text-muted-foreground text-xs'>No</span>
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
            <TableCell className='font-semibold text-sm' colSpan={5}>
              Total — {totalAmount}
            </TableCell>
            <TableCell className='text-right font-mono font-semibold text-sm'>
              {formatMinutes(report.totalMinutes)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
