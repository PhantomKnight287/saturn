/** biome-ignore-all lint/performance/noImgElement: Don't wanna use Next's Image tag here */
/** biome-ignore-all lint/a11y/useValidAriaRole: The role prop is for user role not aria */
/** biome-ignore-all lint/correctness/useImageSize: Hard to handle proper scaling  */
'use client'

import { pdf } from '@react-pdf/renderer'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import type { InvoiceWithMedia } from '@/app/api/invoices/service'
import StatusBadge from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { statusEnum } from '@/server/db/schema'
import type { RouteImpl } from '@/types'
import ThreadsPanel from '../../requirements/_components/threads-panel'
import type { Thread } from '../../requirements/types'
import {
  markInvoicePaidAction,
  replyToThreadAction,
  resolveThreadAction,
} from '../actions'
import type {
  CustomField,
  InvoiceItem,
  InvoicePDFData,
  LinkedRequirement,
} from '../types'
import DisputeInvoiceDialog from './dispute-invoice-dialog'
import InvoicePDF from './invoice-pdf'
import InvoiceStatusBadge from './status-badge'

function formatAmount(amount: string, currency: string) {
  return Number(amount).toLocaleString('en-US', {
    style: 'currency',
    currency,
  })
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function CustomFieldsList({ fields }: { fields: CustomField[] }) {
  if (fields.length === 0) {
    return null
  }
  return (
    <div className='space-y-1'>
      {fields.map((f, i) => (
        <div className='flex justify-between text-sm' key={i}>
          <span className='text-muted-foreground'>{f.label}</span>
          <span>{f.value}</span>
        </div>
      ))}
    </div>
  )
}

interface InvoiceClientViewProps {
  canCreateThread: boolean
  canMarkPaid: boolean
  canResolveThread: boolean
  invoice: InvoiceWithMedia
  items: InvoiceItem[]
  linkedRequirements: LinkedRequirement[]
  orgName: string
  orgSlug: string
  projectId: string
  projectName: string
  projectSlug: string
  threads: Thread[]
}

export function InvoiceClientView({
  projectId,
  invoice,
  items,
  linkedRequirements,
  canMarkPaid,
  canCreateThread,
  canResolveThread,
  orgSlug,
  orgName,
  projectSlug,
  projectName,
  threads,
}: InvoiceClientViewProps) {
  const router = useRouter()
  const backUrl = `/${orgSlug}/${projectSlug}/invoices` as RouteImpl
  const [isDownloading, setIsDownloading] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)

  const { execute: executeMarkPaid, isPending: isMarkingPaid } = useAction(
    markInvoicePaidAction,
    {
      onSuccess() {
        toast.success('Invoice marked as paid')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to mark invoice as paid')
      },
    }
  )

  const { execute: executeReply, isPending: isReplying } = useAction(
    replyToThreadAction,
    {
      onSuccess() {
        toast.success('Reply added')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to add reply')
      },
    }
  )

  const { execute: executeResolve } = useAction(resolveThreadAction, {
    onSuccess() {
      toast.success('Thread resolved')
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to resolve thread')
    },
  })

  const handleReply = (replyBody: string, threadId: string) => {
    executeReply({ threadId, body: replyBody })
  }

  const handleResolve = (threadId: string) => {
    executeResolve({ threadId })
  }

  const canDispute =
    canCreateThread &&
    (invoice.status === 'sent' || invoice.status === 'disputed')

  const senderLogoFileId = invoice.senderLogoObject?.id ?? invoice.senderLogo
  const senderSignatureFileId =
    invoice.senderSignatureObject?.id ?? invoice.senderSignature

  const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0)
  const discount = invoice.discountAmount ? Number(invoice.discountAmount) : 0
  const total = subtotal - discount

  const handleDownloadPdf = useCallback(async () => {
    setIsDownloading(true)
    try {
      const pdfData: InvoicePDFData = {
        invoiceNumber: invoice.invoiceNumber,
        issueDate: formatDate(invoice.issueDate),
        dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : null,
        currency: invoice.currency,
        notes: invoice.notes,
        recipients: [],
        items,
        totalAmount: String(total),
        projectName,
        orgName,
        orgSlug,
        projectSlug,
        senderLogo: senderLogoFileId,
        senderSignature: senderSignatureFileId,
        senderName: invoice.senderName,
        senderAddress: invoice.senderAddress,
        senderCustomFields: invoice.senderCustomFields ?? [],
        clientName: invoice.clientName,
        clientAddress: invoice.clientAddress,
        clientCustomFields: invoice.clientCustomFields ?? [],
        paymentTerms: invoice.paymentTerms,
        terms: invoice.terms,
        linkedRequirements: linkedRequirements.map((r) => ({
          title: r.title,
          slug: r.slug,
          status: r.status,
        })),
        discountLabel: invoice.discountLabel ?? undefined,
        discountAmount: invoice.discountAmount ?? undefined,
      }
      const blob = await pdf(<InvoicePDF data={pdfData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoiceNumber || 'invoice'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setIsDownloading(false)
    }
  }, [
    invoice,
    items,
    linkedRequirements,
    total,
    projectName,
    orgName,
    orgSlug,
    projectSlug,
    senderLogoFileId,
    senderSignatureFileId,
  ])

  return (
    <div className='mx-auto w-full max-w-3xl'>
      <div className='mb-6 flex items-center justify-between gap-4'>
        <Button asChild size='sm' variant='ghost'>
          <Link href={backUrl}>
            <ArrowLeft className='mr-1 size-4' />
            Back
          </Link>
        </Button>
        <div className='flex items-center gap-2'>
          <InvoiceStatusBadge role='client' status={invoice.status} />
          <Button
            disabled={isDownloading}
            onClick={handleDownloadPdf}
            size='sm'
            variant='outline'
          >
            <Download className='mr-1 size-4' />
            {isDownloading ? 'Generating...' : 'Download PDF'}
          </Button>
          {canDispute && (
            <Button
              onClick={() => setDisputeOpen(true)}
              size='sm'
              variant='outline'
            >
              <AlertTriangle className='mr-1 size-4' />
              Dispute
            </Button>
          )}
          {canMarkPaid && invoice.status === 'sent' && (
            <Button
              loading={isMarkingPaid}
              onClick={() => executeMarkPaid({ invoiceId: invoice.id })}
              size='sm'
            >
              <CheckCircle2 className='mr-1 size-4' />
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className='p-6 sm:p-8'>
          <div className='mb-8 flex items-start justify-between'>
            <div>
              {senderLogoFileId && (
                <img
                  alt='Company logo'
                  className='mb-3 h-12 object-contain'
                  src={`/api/files/${senderLogoFileId}`}
                />
              )}
              <h1 className='font-semibold text-2xl'>Invoice</h1>
              <p className='mt-1 font-mono text-muted-foreground text-sm'>
                {invoice.invoiceNumber}
              </p>
            </div>
            <div className='text-right text-sm'>
              <div className='space-y-1'>
                <div>
                  <span className='text-muted-foreground'>Issue Date: </span>
                  {formatDate(invoice.issueDate)}
                </div>
                {invoice.dueDate && (
                  <div>
                    <span className='text-muted-foreground'>Due Date: </span>
                    {formatDate(invoice.dueDate)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className='mb-8 grid gap-8 sm:grid-cols-2'>
            <div>
              <p className='mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider'>
                From
              </p>
              {invoice.senderName && (
                <p className='font-medium'>{invoice.senderName}</p>
              )}
              {invoice.senderAddress && (
                <p className='text-muted-foreground text-sm'>
                  {invoice.senderAddress}
                </p>
              )}
              {invoice.senderCustomFields && (
                <div className='mt-2'>
                  <CustomFieldsList fields={invoice.senderCustomFields} />
                </div>
              )}
            </div>
            <div>
              <p className='mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider'>
                Bill To
              </p>
              {invoice.clientName && (
                <p className='font-medium'>{invoice.clientName}</p>
              )}
              {invoice.clientAddress && (
                <p className='text-muted-foreground text-sm'>
                  {invoice.clientAddress}
                </p>
              )}
              {invoice.clientCustomFields && (
                <div className='mt-2'>
                  <CustomFieldsList fields={invoice.clientCustomFields} />
                </div>
              )}
            </div>
          </div>

          <Separator className='mb-6' />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className='w-20 text-right'>Qty</TableHead>
                <TableHead className='w-28 text-right'>Unit Price</TableHead>
                <TableHead className='w-28 text-right'>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className='text-sm'>{item.description}</TableCell>
                  <TableCell className='text-right text-sm'>
                    {item.quantity}
                  </TableCell>
                  <TableCell className='text-right text-sm'>
                    {formatAmount(item.unitPrice, invoice.currency)}
                  </TableCell>
                  <TableCell className='text-right font-medium text-sm'>
                    {formatAmount(item.amount, invoice.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className='mt-4 flex justify-end'>
            <div className='w-64 space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Subtotal</span>
                <span>{formatAmount(String(subtotal), invoice.currency)}</span>
              </div>
              {invoice.discountLabel && discount > 0 && (
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>
                    {invoice.discountLabel}
                  </span>
                  <span className='text-destructive'>
                    -{formatAmount(String(discount), invoice.currency)}
                  </span>
                </div>
              )}
              <Separator />
              <div className='flex justify-between font-semibold'>
                <span>Total</span>
                <span>{formatAmount(String(total), invoice.currency)}</span>
              </div>
            </div>
          </div>

          {invoice.paymentTerms && (
            <div className='mt-8'>
              <p className='mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider'>
                Payment Terms
              </p>
              <p className='text-sm'>{invoice.paymentTerms}</p>
            </div>
          )}

          {invoice.notes && (
            <div className='mt-6'>
              <p className='mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider'>
                Notes
              </p>
              <p className='whitespace-pre-wrap text-sm'>{invoice.notes}</p>
            </div>
          )}

          {invoice.terms && (
            <div className='mt-6'>
              <p className='mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider'>
                Terms & Conditions
              </p>
              <p className='whitespace-pre-wrap text-muted-foreground text-sm'>
                {invoice.terms}
              </p>
            </div>
          )}

          {linkedRequirements.length > 0 && (
            <div className='mt-6'>
              <p className='mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider'>
                Linked Requirements
              </p>
              <div className='space-y-1'>
                {linkedRequirements.map((req) => (
                  <div
                    className='flex items-center gap-2 text-sm'
                    key={req.requirementId}
                  >
                    <FileText className='size-3.5 text-muted-foreground' />
                    <span>{req.title}</span>

                    <StatusBadge
                      role='client'
                      status={
                        req.status as (typeof statusEnum.enumValues)[number]
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {senderSignatureFileId && (
            <div className='mt-8 border-t pt-6'>
              <p className='mb-2 text-muted-foreground text-xs'>Signature</p>
              <img
                alt='Signature'
                className='h-16 object-contain'
                src={`/api/files/${senderSignatureFileId}`}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {(invoice.status === 'sent' ||
        invoice.status === 'disputed' ||
        threads.length > 0) && (
        <div className='mt-8'>
          <ThreadsPanel
            entityId={invoice.id}
            isSending={isReplying}
            onResolve={canResolveThread ? handleResolve : undefined}
            onSubmit={handleReply}
            orgSlug={orgSlug}
            projectId={projectId}
            threads={threads}
          />
        </div>
      )}

      <DisputeInvoiceDialog
        invoiceId={invoice.id}
        onOpenChange={setDisputeOpen}
        open={disputeOpen}
      />
    </div>
  )
}
