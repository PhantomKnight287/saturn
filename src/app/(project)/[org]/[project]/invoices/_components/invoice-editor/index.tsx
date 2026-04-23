'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Info,
  ListChecks,
  Pen,
  Plus,
  Receipt,
  Save,
  Send,
  StickyNote,
  Trash2,
  User,
  X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type z from 'zod'
import ImageUpload from '@/components/image-upload'
import SendToClientDialog from '@/components/send-to-client-dialog'
import type { SignatureResult } from '@/components/signature-dialog'
import { SignatureDialog } from '@/components/signature-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CurrencySelect } from '@/components/ui/currency-selector'
import DatePicker from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { uploadDataUrl } from '@/lib/upload'
import type { RouteImpl } from '@/types'
import ThreadsPanel from '../../../requirements/_components/threads-panel'
import { linkTimeEntriesToInvoiceAction } from '../../../timesheets/actions'
import {
  changeInvoiceStatusAction,
  createInvoiceAction,
  deleteInvoiceAction,
  markInvoicePaidAction,
  replyToThreadAction,
  resolveThreadAction,
  sendInvoiceAction,
  updateInvoiceAction,
} from '../../actions'
import { invoiceFormSchema } from '../../common'
import type { CustomField, InvoiceEditorProps, MediaItem } from '../../types'
import DisputeInvoiceDialog from '../dispute-invoice-dialog'
import { ImportTimeEntriesDialog } from '../import-time-entries-dialog'
import InvoiceStatusBadge from '../status-badge'
import { CustomFieldsEditor } from './custom-fields-editor'
import { InvoiceItemRow } from './invoice-item'
import { ItemsTotal } from './items-total'
import { PdfPreviewPane } from './pdf-preview-pane'

function formatDateForInput(date: Date): string {
  return new Date(date).toISOString().split('T')[0]!
}

export default function InvoiceEditor({
  mode,
  projectId,
  orgSlug,
  orgName,
  projectSlug,
  projectName,
  invoice,
  existingItems = [],
  existingRecipientIds = [],
  linkedRequirements = [],
  clients,
  requirements,
  canEdit = true,
  canSend = false,
  canDelete = false,
  canMarkPaid = false,
  canResolveThread = false,
  extendData,
  mediaItems = [],
  billableEntries = [],
  unbilledTimeEntries = [],
  memberRateMap = {},
  autoImportTime = false,
  timesheetWarning,
  threads = [],
  unpaidExpenses = [],
  role,
  defaultCurrency,
  suggestedInvoiceNumber,
  isClientInvolved = true,
}: InvoiceEditorProps) {
  const router = useRouter()
  const backUrl = `/${orgSlug}/${projectSlug}/invoices` as RouteImpl
  const [importOpen, setImportOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)
  const [isUploadingSignature, setIsUploadingSignature] = useState(false)
  const [importedEntryIds, setImportedEntryIds] = useState<string[]>([])
  const [uploadedMedia, setUploadedMedia] = useState<MediaItem[]>([])
  const allMediaItems = useMemo(
    () => [...mediaItems, ...uploadedMedia],
    [mediaItems, uploadedMedia]
  )
  const handleUploadComplete = useCallback(
    (item: { id: string; url: string }) => {
      setUploadedMedia((prev) =>
        prev.some((m) => m.id === item.id)
          ? prev
          : [
              ...prev,
              {
                id: item.id,
                url: item.url,
                name: '',
                contentType: '',
                createdAt: new Date(),
              },
            ]
      )
    },
    []
  )
  const rateMap = new Map(Object.entries(memberRateMap))
  const isEditable =
    mode === 'create' || (canEdit && invoice?.status === 'draft')

  const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: invoice?.invoiceNumber ?? suggestedInvoiceNumber ?? '',
      currency:
        extendData?.currency ?? invoice?.currency ?? defaultCurrency ?? 'USD',
      issueDate: invoice
        ? formatDateForInput(invoice.issueDate)
        : formatDateForInput(new Date()),
      dueDate: invoice?.dueDate ? formatDateForInput(invoice.dueDate) : '',
      senderLogo: extendData?.senderLogo ?? invoice?.senderLogo ?? null,
      senderSignature:
        extendData?.senderSignature ?? invoice?.senderSignature ?? null,
      senderName: extendData?.senderName ?? invoice?.senderName ?? orgName,
      senderAddress: extendData?.senderAddress ?? invoice?.senderAddress ?? '',
      senderCustomFields:
        extendData?.senderCustomFields ?? invoice?.senderCustomFields ?? [],
      clientName: extendData?.clientName ?? invoice?.clientName ?? '',
      clientAddress: extendData?.clientAddress ?? invoice?.clientAddress ?? '',
      clientCustomFields:
        extendData?.clientCustomFields ?? invoice?.clientCustomFields ?? [],
      clientMemberIds: extendData?.recipientMemberIds ?? existingRecipientIds,
      items:
        extendData?.items && extendData.items.length > 0
          ? extendData.items
          : existingItems.length > 0
            ? existingItems
            : [{ description: '', quantity: '1', unitPrice: '0', amount: '0' }],
      selectedRequirementIds: linkedRequirements.map((r) => r.requirementId),
      expenseIds: [],
      paymentTerms: extendData?.paymentTerms ?? invoice?.paymentTerms ?? '',
      notes: extendData?.notes ?? invoice?.notes ?? '',
      terms: extendData?.terms ?? invoice?.terms ?? '',
      discountLabel: invoice?.discountLabel ?? '',
      discountAmount: invoice?.discountAmount ?? '',
    },
  })

  const { control, setValue, getValues } = form

  const handleSignatureConfirm = async (result: SignatureResult) => {
    try {
      setIsUploadingSignature(true)
      let mediaId: string
      let mediaUrl: string

      if (result.source === 'library') {
        const match = allMediaItems.find((m) => m.id === result.dataUrl)
        if (!match) {
          toast.error('Could not find the selected signature')
          return
        }
        mediaId = match.id
        mediaUrl = match.id
      } else {
        const uploaded = await uploadDataUrl(
          result.dataUrl,
          projectId,
          'signature.png'
        )
        mediaId = uploaded.id
        mediaUrl = uploaded.url
        handleUploadComplete({ id: mediaId, url: mediaUrl })
      }

      setValue('senderSignature', mediaId)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to add signature'
      )
    } finally {
      setIsUploadingSignature(false)
    }
  }

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({ control, name: 'items' })

  const { execute: executeLinkEntries } = useAction(
    linkTimeEntriesToInvoiceAction
  )

  const autoImportDone = useRef(false)
  useEffect(() => {
    if (
      !autoImportTime ||
      autoImportDone.current ||
      billableEntries.length === 0
    ) {
      return
    }
    autoImportDone.current = true

    const grouped = new Map<string, typeof billableEntries>()
    for (const entry of billableEntries) {
      const key = entry.memberId
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(entry)
    }

    const newItems: {
      description: string
      quantity: string
      unitPrice: string
      amount: string
    }[] = []
    const entryIds: string[] = []

    for (const [memberId, memberEntries] of grouped) {
      const rate = rateMap.get(memberId)
      const totalMinutes = memberEntries.reduce(
        (s, e) => s + e.durationMinutes,
        0
      )
      const hours = totalMinutes / 60
      const memberName = memberEntries.at(0)?.memberName ?? 'Team member'
      const unitPrice = rate ? (rate.hourlyRate / 100).toFixed(2) : '0'
      const amount = rate ? ((hours * rate.hourlyRate) / 100).toFixed(2) : '0'

      newItems.push({
        description: `${memberName} — ${hours.toFixed(1)}h`,
        quantity: hours.toFixed(2),
        unitPrice,
        amount,
      })

      for (const e of memberEntries) {
        entryIds.push(e.id)
      }
    }

    if (newItems.length > 0) {
      setValue('items', newItems)
      setImportedEntryIds(entryIds)
    }
  }, [autoImportTime, billableEntries, rateMap, setValue])

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createInvoiceAction,
    {
      onSuccess({ data }) {
        toast.success('Invoice created')
        if (data?.id) {
          if (importedEntryIds.length > 0) {
            executeLinkEntries({
              timeEntryIds: importedEntryIds,
              invoiceId: data.id,
            })
          }
          router.push(`/${orgSlug}/${projectSlug}/invoices/${data.id}`)
        }
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to create invoice')
      },
    }
  )

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateInvoiceAction,
    {
      onSuccess() {
        toast.success('Invoice saved')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to save invoice')
      },
    }
  )

  const { execute: executeSend, isPending: isSending } = useAction(
    sendInvoiceAction,
    {
      onSuccess() {
        toast.success('Invoice sent')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to send invoice')
      },
    }
  )

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

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteInvoiceAction,
    {
      onSuccess() {
        toast.success('Invoice deleted')
        //@ts-expect-error - TODO: fix this
        router.push(backUrl)
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to delete invoice')
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

  const { execute: executeChangeStatus } = useAction(
    changeInvoiceStatusAction,
    {
      onSuccess() {
        toast.success('Invoice status updated')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to change invoice status')
      },
    }
  )

  const canChangeStatus = canEdit && invoice && invoice.status !== 'draft'

  const cleanCustomFields = useCallback(
    (fields: CustomField[]) =>
      fields.filter((f) => f.label.trim() && f.value.trim()),
    []
  )

  const handleSave = () => {
    const v = getValues()

    if (!v.invoiceNumber.trim()) {
      toast.error('Invoice number is required')
      return
    }
    const validItems = v.items.filter((item) => item.description.trim())
    if (validItems.length === 0) {
      toast.error('At least one item is required')
      return
    }

    const payload = {
      clientMemberIds: v.clientMemberIds,
      invoiceNumber: v.invoiceNumber.trim(),
      issueDate: v.issueDate,
      dueDate: v.dueDate || undefined,
      notes: v.notes.trim() || undefined,
      currency: v.currency,
      items: validItems,
      requirementIds: v.selectedRequirementIds.length
        ? v.selectedRequirementIds
        : undefined,
      senderLogo: v.senderLogo || undefined,
      senderSignature: v.senderSignature || undefined,
      senderName: v.senderName.trim() || undefined,
      senderAddress: v.senderAddress.trim() || undefined,
      senderCustomFields: cleanCustomFields(v.senderCustomFields).length
        ? cleanCustomFields(v.senderCustomFields)
        : undefined,
      clientName: v.clientName.trim() || undefined,
      clientAddress: v.clientAddress.trim() || undefined,
      clientCustomFields: cleanCustomFields(v.clientCustomFields).length
        ? cleanCustomFields(v.clientCustomFields)
        : undefined,
      paymentTerms: v.paymentTerms.trim() || undefined,
      terms: v.terms.trim() || undefined,
      discountLabel: v.discountLabel.trim() || undefined,
      discountAmount: v.discountAmount.trim() || undefined,
      expenseIds: v.expenseIds.length ? v.expenseIds : undefined,
    }

    if (mode === 'create') {
      executeCreate({ ...payload, projectId })
    } else if (invoice) {
      executeUpdate({ ...payload, invoiceId: invoice.id })
    }
  }

  const handleSend = async (clientMemberIds: string[]) => {
    if (!invoice) {
      return
    }
    await executeSend({ invoiceId: invoice.id, clientMemberIds })
    setSendOpen(false)
  }

  const handleMarkPaid = () => {
    if (!invoice) {
      return
    }
    executeMarkPaid({ invoiceId: invoice.id })
  }

  const handleDelete = () => {
    if (!invoice) {
      return
    }
    executeDelete({ invoiceId: invoice.id })
  }

  const isPending = isCreating || isUpdating
  return (
    <div className='mx-auto w-full max-w-7xl'>
      <div className='mb-6 flex items-center justify-between gap-4'>
        <Button asChild size='sm' variant='ghost'>
          <Link href={backUrl}>
            <ArrowLeft className='size-4' />
            Back
          </Link>
        </Button>
        <div className='flex items-center gap-2'>
          {mode === 'edit' && invoice && (
            <InvoiceStatusBadge
              isClientInvolved={isClientInvolved}
              role={role}
              status={invoice.status}
            />
          )}
          {canChangeStatus && invoice?.status === 'paid' && (
            <Button
              onClick={() =>
                executeChangeStatus({
                  invoiceId: invoice.id,
                  status: 'sent',
                })
              }
              size='sm'
              variant='outline'
            >
              Mark as Unpaid
            </Button>
          )}
          {canDelete && invoice?.status === 'draft' && (
            <Button
              className='text-destructive hover:bg-destructive/10'
              loading={isDeleting}
              onClick={handleDelete}
              size='sm'
              variant='outline'
            >
              <Trash2 className='size-4' />
              Delete
            </Button>
          )}
          {canMarkPaid &&
            (invoice?.status === 'sent' ||
              (!isClientInvolved && invoice?.status === 'draft')) && (
              <Button
                loading={isMarkingPaid}
                onClick={handleMarkPaid}
                size='sm'
              >
                <CheckCircle2 className='size-4' />
                Mark as Paid
              </Button>
            )}
          {canSend && isClientInvolved && invoice?.status === 'draft' && (
            <Button
              loading={isSending}
              onClick={() => setSendOpen(true)}
              size='sm'
              variant='outline'
            >
              <Send className='size-4' />
              Send to Client
            </Button>
          )}
          {isEditable && (
            <Button loading={isPending} onClick={handleSave} size='sm'>
              <Save className='size-4' />
              {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {timesheetWarning && (
        <div className='mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-900 dark:bg-amber-950/50'>
          <AlertTriangle className='size-4 shrink-0 text-amber-600 dark:text-amber-400' />
          <span>{timesheetWarning}</span>
        </div>
      )}

      {extendData && (
        <div className='mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm dark:border-blue-900 dark:bg-blue-950/50'>
          <Info className='size-4 shrink-0 text-blue-600 dark:text-blue-400' />
          <span>
            Extended from{' '}
            <Link
              className='font-medium underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300'
              href={`/${orgSlug}/${projectSlug}/invoices/${extendData.sourceInvoiceId}`}
            >
              {extendData.sourceInvoiceNumber || 'previous invoice'}
            </Link>
          </span>
        </div>
      )}

      <div className='grid gap-8 lg:grid-cols-[1fr_560px]'>
        <div className='space-y-5'>
          <section className='overflow-hidden rounded-lg border bg-card'>
            <header className='flex items-center gap-2 border-b bg-muted/30 px-4 py-3'>
              <FileText className='size-4 text-muted-foreground' />
              <h3 className='font-semibold text-sm'>Invoice Details</h3>
            </header>
            <div className='grid gap-4 p-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label>Invoice Number</Label>
                <Controller
                  control={control}
                  name='invoiceNumber'
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder='INV-2026-001'
                      readOnly={!isEditable}
                    />
                  )}
                />
              </div>
              <div className='space-y-2'>
                <Label>Currency</Label>
                <Controller
                  control={control}
                  name='currency'
                  render={({ field }) => (
                    <CurrencySelect
                      disabled={!isEditable}
                      name='currency'
                      onCurrencySelect={(c) => field.onChange(c.code)}
                      value={field.value}
                    />
                  )}
                />
              </div>
              <div className='space-y-2'>
                <Label>Issue Date</Label>
                <Controller
                  control={control}
                  name='issueDate'
                  render={({ field }) => (
                    <DatePicker
                      disablePastDates={false}
                      onChange={field.onChange}
                      value={field.value ? new Date(field.value) : undefined}
                    />
                  )}
                />
              </div>
              <div className='space-y-2'>
                <Label>Due Date</Label>
                <Controller
                  control={control}
                  name='dueDate'
                  render={({ field }) => (
                    <DatePicker
                      disablePastDates={false}
                      onChange={field.onChange}
                      value={field.value ? new Date(field.value) : undefined}
                    />
                  )}
                />
              </div>
            </div>
          </section>

          <section className='overflow-hidden rounded-lg border bg-card'>
            <header className='flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-2'>
                <Building2 className='size-4 text-muted-foreground' />
                <h3 className='font-semibold text-sm'>From</h3>
              </div>
              <span className='text-muted-foreground text-xs'>
                Your business details
              </span>
            </header>
            <div className='space-y-4 p-4'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label className='text-muted-foreground text-xs'>
                    Company Logo
                  </Label>
                  <Controller
                    control={control}
                    name='senderLogo'
                    render={({ field }) => (
                      <ImageUpload
                        disabled={!isEditable}
                        label='Logo'
                        mediaItems={allMediaItems}
                        onChange={field.onChange}
                        onUploadComplete={handleUploadComplete}
                        previewSize={80}
                        projectId={projectId}
                        value={field.value}
                      />
                    )}
                  />
                </div>
                <div className='space-y-2'>
                  <Label className='text-muted-foreground text-xs'>
                    Signature
                  </Label>
                  <Controller
                    control={control}
                    name='senderSignature'
                    render={({ field }) => {
                      const signatureId = field.value
                        ? allMediaItems.find((m) => m.id === field.value)?.id
                        : null
                      return (
                        <div className='flex items-center gap-3'>
                          <button
                            className='flex h-[60px] w-[140px] shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50'
                            disabled={!isEditable || isUploadingSignature}
                            onClick={() => setSignatureDialogOpen(true)}
                            type='button'
                          >
                            {signatureId ? (
                              <Image
                                alt='Signature'
                                className='max-h-[54px] object-contain'
                                height={54}
                                src={`/api/files/${signatureId}`}
                                unoptimized
                                width={130}
                              />
                            ) : (
                              <span className='flex items-center gap-1.5 text-muted-foreground text-xs'>
                                <Pen className='size-3.5' />
                                Add signature
                              </span>
                            )}
                          </button>
                          {field.value && isEditable && (
                            <Button
                              onClick={() => field.onChange(null)}
                              size='icon'
                              type='button'
                              variant='ghost'
                            >
                              <X className='size-4' />
                            </Button>
                          )}
                        </div>
                      )
                    }}
                  />
                </div>
              </div>
              <div className='grid gap-3 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label className='text-muted-foreground text-xs'>
                    Company Name
                  </Label>
                  <Controller
                    control={control}
                    name='senderName'
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder={orgName}
                        readOnly={!isEditable}
                      />
                    )}
                  />
                </div>
                <div className='space-y-2'>
                  <Label className='text-muted-foreground text-xs'>
                    Address
                  </Label>
                  <Controller
                    control={control}
                    name='senderAddress'
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder='Company address'
                        readOnly={!isEditable}
                      />
                    )}
                  />
                </div>
              </div>
              <Controller
                control={control}
                name='senderCustomFields'
                render={({ field }) => (
                  <CustomFieldsEditor
                    disabled={!isEditable}
                    fields={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </section>

          <section className='overflow-hidden rounded-lg border bg-card'>
            <header className='flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-2'>
                <User className='size-4 text-muted-foreground' />
                <h3 className='font-semibold text-sm'>Bill To</h3>
              </div>
              <span className='text-muted-foreground text-xs'>
                Client details
              </span>
            </header>
            <div className='space-y-4 p-4'>
              <div className='grid gap-3 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label className='text-muted-foreground text-xs'>
                    Client Name
                  </Label>
                  <Controller
                    control={control}
                    name='clientName'
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder='Client / company name'
                        readOnly={!isEditable}
                      />
                    )}
                  />
                </div>
                <div className='space-y-2'>
                  <Label className='text-muted-foreground text-xs'>
                    Address
                  </Label>
                  <Controller
                    control={control}
                    name='clientAddress'
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder='Client address'
                        readOnly={!isEditable}
                      />
                    )}
                  />
                </div>
              </div>
              <Controller
                control={control}
                name='clientCustomFields'
                render={({ field }) => (
                  <CustomFieldsEditor
                    disabled={!isEditable}
                    fields={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </section>

          <section className='overflow-hidden rounded-lg border bg-card'>
            <header className='flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-2'>
                <ListChecks className='size-4 text-muted-foreground' />
                <h3 className='font-semibold text-sm'>Line Items</h3>
              </div>
              {isEditable && (
                <div className='flex items-center gap-2'>
                  <Button
                    onClick={() => setImportOpen(true)}
                    size='sm'
                    variant='outline'
                  >
                    <Clock className='size-4' />
                    Import Time
                  </Button>
                  <Button
                    onClick={() =>
                      appendItem({
                        description: '',
                        quantity: '1',
                        unitPrice: '0',
                        amount: '0',
                      })
                    }
                    size='sm'
                    variant='outline'
                  >
                    <Plus className='size-4' />
                    Add Item
                  </Button>
                </div>
              )}
            </header>
            <div className='space-y-3 p-4'>
              <div className='hidden grid-cols-[1fr_80px_110px_110px_32px] gap-2 px-1 font-medium text-muted-foreground text-xs uppercase tracking-wide sm:grid'>
                <span>Description</span>
                <span>Qty</span>
                <span>Unit Price</span>
                <span>Amount</span>
                <span />
              </div>
              {itemFields.map((field, index) => (
                <InvoiceItemRow
                  canRemove={itemFields.length > 1}
                  control={control}
                  index={index}
                  isEditable={isEditable}
                  key={field.id}
                  onRemove={() => {
                    const removedItem = getValues('items')[index]
                    if (removedItem?.description.startsWith('Expense: ')) {
                      const expTitle = removedItem.description.slice(
                        'Expense: '.length
                      )
                      const matchedExp = unpaidExpenses.find(
                        (e) => e.title === expTitle
                      )
                      if (matchedExp) {
                        const currentExpIds = getValues('expenseIds')
                        setValue(
                          'expenseIds',
                          currentExpIds.filter((id) => id !== matchedExp.id)
                        )
                      }
                    }
                    removeItem(index)
                  }}
                  setValue={setValue}
                />
              ))}
              <div className='mt-2 flex flex-col items-stretch gap-4 border-t pt-4 sm:flex-row sm:items-start sm:justify-between'>
                <div className='grid flex-1 gap-3 sm:max-w-sm sm:grid-cols-[1fr_130px]'>
                  <div className='space-y-2'>
                    <Label className='text-muted-foreground text-xs'>
                      Discount Label
                    </Label>
                    <Controller
                      control={control}
                      name='discountLabel'
                      render={({ field }) => (
                        <Input
                          {...field}
                          className='h-9 text-sm'
                          disabled={!isEditable}
                          placeholder='e.g. 10% off'
                        />
                      )}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label className='text-muted-foreground text-xs'>
                      Discount Amount
                    </Label>
                    <Controller
                      control={control}
                      name='discountAmount'
                      render={({ field }) => (
                        <Input
                          {...field}
                          className='h-9 text-sm'
                          disabled={!isEditable}
                          min='0'
                          placeholder='0.00'
                          step='0.01'
                          type='number'
                        />
                      )}
                    />
                  </div>
                </div>
                <div className='flex items-end sm:min-w-[200px]'>
                  <ItemsTotal control={control} />
                </div>
              </div>
            </div>
          </section>

          {requirements.length > 0 && (
            <section className='overflow-hidden rounded-lg border bg-card'>
              <header className='flex items-center gap-2 border-b bg-muted/30 px-4 py-3'>
                <ClipboardList className='size-4 text-muted-foreground' />
                <h3 className='font-semibold text-sm'>Linked Requirements</h3>
              </header>
              <Controller
                control={control}
                name='selectedRequirementIds'
                render={({ field }) => (
                  <div className='max-h-[240px] space-y-1 overflow-y-auto p-3'>
                    {requirements.map((req) => (
                      <div
                        className='flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50'
                        key={req.id}
                      >
                        <Checkbox
                          checked={field.value.includes(req.id)}
                          disabled={!isEditable}
                          id={`req-${req.id}`}
                          onCheckedChange={() => {
                            const next = field.value.includes(req.id)
                              ? field.value.filter((id) => id !== req.id)
                              : [...field.value, req.id]
                            field.onChange(next)
                          }}
                        />
                        <label
                          className='flex-1 cursor-pointer text-sm'
                          htmlFor={`req-${req.id}`}
                        >
                          {req.title}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              />
            </section>
          )}

          {unpaidExpenses.length > 0 && (
            <section className='overflow-hidden rounded-lg border bg-card'>
              <header className='flex items-center gap-2 border-b bg-muted/30 px-4 py-3'>
                <Receipt className='size-4 text-muted-foreground' />
                <h3 className='font-semibold text-sm'>Unpaid Expenses</h3>
              </header>
              <Controller
                control={control}
                name='expenseIds'
                render={({ field }) => (
                  <div className='max-h-[280px] space-y-2 overflow-y-auto p-3'>
                    {unpaidExpenses.map((exp) => {
                      const isSelected = field.value.includes(exp.id)
                      const formattedAmount = (exp.amountCents / 100).toFixed(2)
                      const formattedDate = new Date(
                        exp.date
                      ).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                      return (
                        <div
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                            isSelected
                              ? 'border-primary/30 bg-primary/5'
                              : 'hover:bg-muted/50'
                          }`}
                          key={exp.id}
                        >
                          <Checkbox
                            checked={isSelected}
                            className='pointer-events-none'
                            disabled={!isEditable}
                            id={`exp-${exp.id}`}
                          />
                          <div className='min-w-0 flex-1'>
                            <p className='truncate font-medium text-sm'>
                              {exp.title}
                            </p>
                            <p className='text-muted-foreground text-xs'>
                              {formattedDate}
                            </p>
                          </div>
                          <Badge
                            className='shrink-0 font-mono'
                            variant='secondary'
                          >
                            {exp.currency} {formattedAmount}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              />
            </section>
          )}

          <section className='overflow-hidden rounded-lg border bg-card'>
            <header className='flex items-center gap-2 border-b bg-muted/30 px-4 py-3'>
              <StickyNote className='size-4 text-muted-foreground' />
              <h3 className='font-semibold text-sm'>Additional Information</h3>
            </header>
            <div className='space-y-4 p-4'>
              <div className='space-y-2'>
                <Label className='text-muted-foreground text-xs'>
                  Payment Terms
                </Label>
                <Controller
                  control={control}
                  name='paymentTerms'
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder='e.g. Net 30, Due on receipt'
                      readOnly={!isEditable}
                    />
                  )}
                />
              </div>
              <div className='space-y-2'>
                <Label className='text-muted-foreground text-xs'>Notes</Label>
                <Controller
                  control={control}
                  name='notes'
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      className='min-h-[80px]'
                      placeholder='Additional notes (bank details, thank you message, etc.)'
                      readOnly={!isEditable}
                    />
                  )}
                />
              </div>
              <div className='space-y-2'>
                <Label className='text-muted-foreground text-xs'>
                  Terms & Conditions
                </Label>
                <Controller
                  control={control}
                  name='terms'
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      className='min-h-[80px]'
                      placeholder='Terms and conditions for this invoice'
                      readOnly={!isEditable}
                    />
                  )}
                />
              </div>
            </div>
          </section>

          {(invoice?.status === 'sent' ||
            invoice?.status === 'disputed' ||
            threads.length > 0) && (
            <ThreadsPanel
              entityId={invoice?.id ?? ''}
              isSending={isReplying}
              onResolve={canResolveThread ? handleResolve : undefined}
              onSubmit={handleReply}
              orgSlug={orgSlug}
              projectId={projectId}
              threads={threads}
            />
          )}
        </div>

        <div className='hidden lg:block'>
          <div className='sticky top-4'>
            <PdfPreviewPane
              clients={clients}
              control={control}
              mediaItems={allMediaItems}
              orgName={orgName}
              orgSlug={orgSlug}
              projectName={projectName}
              projectSlug={projectSlug}
              requirements={requirements}
            />
          </div>
        </div>
      </div>

      <ImportTimeEntriesDialog
        billableEntries={unbilledTimeEntries}
        onImport={(items, entryIds) => {
          for (const item of items) {
            appendItem(item)
          }
          setImportedEntryIds((prev) => [...prev, ...entryIds])
          toast.success(`Imported ${items.length} line items from time entries`)
        }}
        onOpenChange={setImportOpen}
        open={importOpen}
        rates={rateMap}
      />

      {isClientInvolved && (
        <SendToClientDialog
          clients={clients}
          description='Select which clients should receive this invoice.'
          onOpenChange={setSendOpen}
          onSend={handleSend}
          open={sendOpen}
          recipientLabel='client'
          title='Send Invoice'
        />
      )}

      <SignatureDialog
        description='Draw your signature or pick one from the library.'
        disabled={isUploadingSignature}
        mediaItems={allMediaItems}
        onConfirm={handleSignatureConfirm}
        onOpenChange={setSignatureDialogOpen}
        open={signatureDialogOpen}
        title='Add Signature'
      />

      {invoice && (
        <DisputeInvoiceDialog
          invoiceId={invoice.id}
          onOpenChange={setDisputeOpen}
          open={disputeOpen}
        />
      )}
    </div>
  )
}
