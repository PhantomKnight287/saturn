import dynamic from 'next/dynamic'
import { memo, useCallback, useMemo } from 'react'
import type { Control } from 'react-hook-form'
import { useWatch } from 'react-hook-form'
import type { ProjectClient } from '../../../team/types'
import type {
  CustomField,
  InvoiceFormValues,
  InvoicePDFData,
  MediaItem,
} from '../../types'

const InvoicePreview = dynamic(() => import('../invoice-preview'), {
  ssr: false,
})

export const PdfPreviewPane = memo(function PdfPreviewPane({
  control,
  clients,
  requirements,
  orgName,
  orgSlug,
  projectName,
  projectSlug,
  mediaItems,
}: {
  control: Control<InvoiceFormValues>
  clients: ProjectClient[]
  requirements: { id: string; title: string; slug: string }[]
  orgName: string
  orgSlug: string
  projectName: string
  projectSlug: string
  mediaItems: MediaItem[]
}) {
  const values = useWatch({ control }) as InvoiceFormValues

  const cleanCustomFields = useCallback(
    (fields: CustomField[] | undefined) =>
      (fields ?? []).filter((f) => f.label.trim() && f.value.trim()),
    []
  )

  const totalAmount = (values.items ?? [])
    .reduce((sum: number, item) => sum + Number(item.amount || 0), 0)
    .toFixed(4)

  const pdfData: InvoicePDFData = useMemo(
    () => ({
      invoiceNumber: values.invoiceNumber || 'DRAFT',
      issueDate: values.issueDate
        ? new Date(values.issueDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : '',
      dueDate: values.dueDate
        ? new Date(values.dueDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : null,
      currency: values.currency ?? 'USD',
      notes: values.notes || null,
      recipients: (values.clientMemberIds ?? [])
        .map((id) => clients.find((c) => c.memberId === id))
        .filter((c): c is ProjectClient => Boolean(c)),
      items: (values.items ?? []).filter((i) => i.description.trim()),
      totalAmount,
      projectName,
      orgName,
      orgSlug,
      projectSlug,
      senderLogo: values.senderLogo
        ? (mediaItems.find((m) => m.id === values.senderLogo)?.id ?? null)
        : null,
      senderSignature: values.senderSignature
        ? (mediaItems.find((m) => m.id === values.senderSignature)?.id ?? null)
        : null,
      senderName: values.senderName || null,
      senderAddress: values.senderAddress || null,
      senderCustomFields: cleanCustomFields(values.senderCustomFields),
      clientName: values.clientName || null,
      clientAddress: values.clientAddress || null,
      clientCustomFields: cleanCustomFields(values.clientCustomFields),
      paymentTerms: values.paymentTerms || null,
      terms: values.terms || null,
      linkedRequirements: (values.selectedRequirementIds ?? [])
        .map((id) => requirements.find((r) => r.id === id))
        .filter((r): r is { id: string; title: string; slug: string } =>
          Boolean(r)
        )
        .map((r) => ({
          title: r.title,
          slug: r.slug,
          status: '',
        })),
      discountLabel: values.discountLabel || undefined,
      discountAmount: values.discountAmount || undefined,
    }),
    [
      values,
      clients,
      requirements,
      orgName,
      orgSlug,
      projectName,
      projectSlug,
      totalAmount,
      cleanCustomFields,
      mediaItems,
    ]
  )

  return <InvoicePreview data={pdfData} />
})
