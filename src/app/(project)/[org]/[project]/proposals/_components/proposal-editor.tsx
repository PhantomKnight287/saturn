'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  Check,
  MessageSquarePlus,
  Save,
  Send,
  XCircle,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import type { proposalsService } from '@/app/api/proposals/service'
import type { signaturesService } from '@/app/api/signatures/service'
import LineItemsEditor from '@/components/line-items-editor'
import SendToClientDialog from '@/components/send-to-client-dialog'
import type { SignatureResult } from '@/components/signature-dialog'
import { SignatureDialog } from '@/components/signature-dialog'
import StatusBadge from '@/components/status-badge'
import TiptapEditor, { type EditorRef } from '@/components/tiptap-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CurrencySelect } from '@/components/ui/currency-selector'
import DatePicker from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/utils'
import type { proposalDeliverables, proposals } from '@/server/db/schema'
import type { Role, RouteImpl } from '@/types'
import ThreadsPanel from '../../requirements/_components/threads-panel'
import type { Thread } from '../../requirements/types'
import type { ProjectClient } from '../../team/types'
import {
  addThreadReplyAction,
  createProposalAction,
  createThreadAction,
  declineProposalAction,
  sendProposalAction,
  signProposalAction,
  updateProposalAction,
} from '../action'
import { proposalFormSchema } from '../common'

type Proposal = typeof proposals.$inferSelect

type ProposalSignature = Awaited<
  ReturnType<typeof proposalsService.getSignatures>
>[number]

type SignatureMedia = Awaited<
  ReturnType<typeof signaturesService.getSignatureMediaForMember>
>[number]

interface ProposalEditorProps {
  canEdit?: boolean
  canSend?: boolean
  canSign?: boolean
  hasSignedAlready?: boolean
  //   initialExpenseItems?: ExpenseItem[]
  initialDeliverables?: (typeof proposalDeliverables.$inferSelect)[]
  mode: 'create' | 'edit'
  orgSlug: string
  projectClients?: ProjectClient[]
  projectId: string
  projectName: string
  projectSlug: string
  proposal?: Proposal
  role?: Role
  signatureMedia?: SignatureMedia[]
  signatures?: ProposalSignature[]
  threads?: Thread[]
}

export default function ProposalEditor({
  mode,
  projectId,
  orgSlug,
  projectSlug,
  proposal,
  canEdit = true,
  canSend = false,
  canSign = false,
  hasSignedAlready = false,
  threads = [],
  projectClients = [],
  role,
  initialDeliverables = [],
  signatures = [],
  signatureMedia = [],
}: ProposalEditorProps) {
  const router = useRouter()
  const editorRef = useRef<EditorRef>(null)
  const backUrl = `/${orgSlug}/${projectSlug}/proposals` as RouteImpl
  const isEditable = mode === 'create' || canEdit

  const form = useForm({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      title: proposal?.title ?? '',
      body: proposal?.body ?? '',
      terms: proposal?.terms ?? '',
      validUntil: proposal?.validUntil
        ? new Date(proposal.validUntil).toISOString().split('T')[0]
        : '',
      currency: proposal?.currency ?? 'USD',
      deliverables: initialDeliverables,
    },
  })

  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showSignatureDialog, setShowSignatureDialog] = useState(false)
  const [showNewThread, setShowNewThread] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [threadBody, setThreadBody] = useState('')

  const canSendProposal =
    canSend &&
    mode === 'edit' &&
    proposal != null &&
    (proposal.status === 'draft' || proposal.status === 'changes_requested')

  const showSign =
    canSign &&
    mode === 'edit' &&
    proposal?.status === 'submitted_to_client' &&
    !hasSignedAlready

  const showDecline =
    canSign && mode === 'edit' && proposal?.status === 'submitted_to_client'

  const showThreads = mode === 'edit' && proposal != null

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createProposalAction,
    {
      onSuccess({ data }) {
        toast.success('Proposal created')
        if (data?.slug) {
          router.push(`/${orgSlug}/${projectSlug}/proposals/${data.slug}`)
        }
      },
      onError({ error }) {
        toast.error(
          error.serverError ??
            'Failed to create proposal. Slug may already be taken.'
        )
      },
    }
  )

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateProposalAction,
    {
      onSuccess() {
        toast.success('Proposal saved')
      },
      onError({ error }) {
        console.error(error)
        toast.error(error.serverError ?? 'Failed to save proposal.')
      },
    }
  )

  const { execute: executeAddThread, isPending: isAddingThread } = useAction(
    createThreadAction,
    {
      onSuccess() {
        toast.success('Thread created')
        setShowNewThread(false)
        setSelectedText('')
        setThreadBody('')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to create thread')
      },
    }
  )

  const { execute: executeSign, isPending: isSigning } = useAction(
    signProposalAction,
    {
      onSuccess() {
        toast.success('Proposal accepted')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to sign proposal')
      },
    }
  )

  const { execute: executeDecline, isPending: isDeclining } = useAction(
    declineProposalAction,
    {
      onSuccess() {
        toast.success('Proposal declined')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to decline proposal')
      },
    }
  )

  const handleStartThread = () => {
    const editor = editorRef.current?.getEditor()
    if (!editor) {
      return
    }

    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to, ' ')

    if (!text.trim()) {
      toast.error('Select some text first to start a thread')
      return
    }

    setSelectedText(text)
    setShowNewThread(true)
  }

  const handleCreateThread = () => {
    if (!(proposal && selectedText.trim() && threadBody.trim())) {
      return
    }

    const editor = editorRef.current?.getEditor()
    if (!editor) {
      return
    }

    executeAddThread({
      proposalId: proposal.id,
      orgSlug,
      selectedText,
      threadBody: threadBody.trim(),
      projectId,
    })
  }

  const { execute: executeAddThreadReply, isPending: isAddingThreadReply } =
    useAction(addThreadReplyAction, {
      onSuccess() {
        toast.success('Thread reply added')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to add thread reply')
      },
    })
  const handleAddThreadReply = (replyBody: string, threadId: string) => {
    executeAddThreadReply({
      proposalId: proposal!.id,
      threadId,
      orgSlug,
      replyBody,
      projectId,
    })
  }

  const [isUploadingSignature, setIsUploadingSignature] = useState(false)
  const handleSign = async (result: SignatureResult) => {
    if (!proposal) {
      return
    }

    try {
      setIsUploadingSignature(true)

      let mediaId: string

      if (result.source === 'library') {
        const match = signatureMedia.find((m) => m.url === result.dataUrl)
        if (!match) {
          toast.error('Could not find the selected signature')
          return
        }
        mediaId = match.id
      } else {
        const blob = await fetch(result.dataUrl).then((r) => r.blob())
        const file = new File([blob], 'signature.png', { type: 'image/png' })
        const formData = new FormData()
        formData.append('file', file)
        formData.append('projectId', projectId)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Upload failed')
        }
        const { id } = await res.json()
        mediaId = id as string
      }

      executeSign({
        proposalId: proposal.id,
        projectId,
        orgSlug,
        mediaId,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign')
    } finally {
      setIsUploadingSignature(false)
    }
  }

  const handleDecline = () => {
    if (!proposal) {
      return
    }
    executeDecline({
      proposalId: proposal.id,
      orgSlug,
      projectId,
    })
  }

  const [isUploading, setIsUploading] = useState(false)
  const isPending = isCreating || isUpdating || isUploading

  const handleSave = async (data: z.infer<typeof proposalFormSchema>) => {
    let finalBody = data.body ?? ''
    try {
      setIsUploading(true)
      finalBody =
        (await editorRef.current?.uploadImagesAndGetHTML()) ?? finalBody
    } catch {
      toast.error('Failed to upload images')
      return
    } finally {
      setIsUploading(false)
    }

    const items =
      data.deliverables && data.deliverables.length > 0
        ? data.deliverables
        : undefined

    if (mode === 'create') {
      executeCreate({
        projectId,
        orgSlug,
        projectSlug,
        title: data.title.trim(),
        body: finalBody,
        terms: data.terms || undefined,
        validUntil: data.validUntil || undefined,
        currency: data.currency,
        deliverables: items,
      })
    } else if (proposal) {
      executeUpdate({
        proposalId: proposal.id,
        orgSlug,
        projectSlug,
        title: data.title.trim(),
        body: finalBody,
        terms: data.terms || undefined,
        validUntil: data.validUntil || undefined,
        currency: data.currency,
        deliverables: items,
        projectId,
      })
    }
  }

  return (
    <div className='mx-auto w-full max-w-4xl'>
      <div className='mb-6 flex items-center justify-between gap-4'>
        <Button asChild size='sm' variant='ghost'>
          <Link href={backUrl}>
            <ArrowLeft className='mr-1 size-4' />
            Back
          </Link>
        </Button>
        <div className='flex items-center gap-2'>
          {mode === 'edit' && proposal && (
            <StatusBadge role={role} status={proposal.status} />
          )}
          {showSign && (
            <Button
              loading={isSigning || isUploadingSignature}
              onClick={() => setShowSignatureDialog(true)}
              size='sm'
            >
              <Check className='mr-1 size-4' />
              Accept & Sign
            </Button>
          )}
          {hasSignedAlready && proposal?.status === 'submitted_to_client' && (
            <Badge
              className='border-green-600 text-green-600'
              variant='outline'
            >
              <Check className='mr-1 size-3' />
              Signed
            </Badge>
          )}
          {showDecline && !hasSignedAlready && (
            <Button
              className='border-destructive text-destructive hover:bg-destructive/10'
              loading={isDeclining}
              onClick={handleDecline}
              size='sm'
              variant='outline'
            >
              <XCircle className='mr-1 size-4' />
              Decline
            </Button>
          )}
          {canSendProposal && (
            <Button
              onClick={() => setShowSendDialog(true)}
              size='sm'
              variant='outline'
            >
              <Send className='mr-1 size-4' />
              Send to Client
            </Button>
          )}
          {showThreads && (
            <Button onClick={handleStartThread} size='sm' variant='outline'>
              <MessageSquarePlus className='mr-1 size-4' />
              New Thread
            </Button>
          )}
          {isEditable && (
            <Button
              loading={isPending}
              onClick={form.handleSubmit(handleSave)}
              size='sm'
            >
              <Save className='mr-1 size-4' />
              {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      <form className='space-y-6' onSubmit={form.handleSubmit(handleSave)}>
        <FieldGroup>
          <Controller
            control={form.control}
            name='title'
            render={({ field, fieldState }) => (
              <Field className='gap-0' data-invalid={fieldState.invalid}>
                <Input
                  {...field}
                  className='h-auto border-none py-2 font-semibold text-2xl shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0'
                  onChange={(e) => {
                    field.onChange(e.target.value)
                  }}
                  placeholder='Proposal title'
                  readOnly={!isEditable}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className='grid grid-cols-2 gap-4'>
            <Controller
              control={form.control}
              name='validUntil'
              render={({ field }) => (
                <Field className='gap-1'>
                  <FieldLabel>Valid Until</FieldLabel>
                  <DatePicker
                    onChange={(date) =>
                      field.onChange(date?.toISOString() ?? undefined)
                    }
                    value={field.value ? new Date(field.value) : undefined}
                  />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name='currency'
              render={({ field }) => (
                <Field className='gap-1'>
                  <FieldLabel>Currency</FieldLabel>
                  {isEditable ? (
                    <CurrencySelect
                      {...field}
                      name='currency'
                      onCurrencySelect={(c) => {
                        form.setValue('currency', c.code)
                      }}
                    />
                  ) : (
                    <Input className='h-9' readOnly value={field.value} />
                  )}
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name='body'
            render={({ field }) => (
              <TiptapEditor
                content={field.value ?? ''}
                editable={isEditable}
                onChange={field.onChange}
                placeholder='Describe the scope, timeline, and deliverables...'
                projectId={projectId}
                ref={editorRef}
              />
            )}
          />

          <Controller
            control={form.control}
            name='deliverables'
            render={({ field }) => (
              <LineItemsEditor
                currency={form.watch('currency') ?? 'USD'}
                editable={isEditable}
                items={field.value ?? []}
                onChange={field.onChange}
                title='Deliverables'
              />
            )}
          />

          {/*<Controller
            name="expenseItems"
            control={form.control}
            render={({ field }) => (
              <ExpenseItemsEditor
                items={field.value ?? []}
                onChange={field.onChange}
                currency={form.watch('currency') ?? 'USD'}
                editable={isEditable}
              />
            )}
          />*/}

          <Controller
            control={form.control}
            name='terms'
            render={({ field }) =>
              isEditable ? (
                <Field className='gap-1'>
                  <FieldLabel>Terms & Conditions</FieldLabel>
                  <Textarea
                    {...field}
                    className='min-h-[120px]'
                    placeholder='Enter terms and conditions...'
                  />
                </Field>
              ) : field.value ? (
                <Field className='gap-1'>
                  <FieldLabel>Terms & Conditions</FieldLabel>
                  <div className='whitespace-pre-wrap rounded-md border bg-muted/30 px-4 py-3 text-sm'>
                    {field.value}
                  </div>
                </Field>
              ) : (
                // biome-ignore lint/complexity/noUselessFragments: render does not accept null
                <></>
              )
            }
          />
        </FieldGroup>

        {showThreads && (
          <ThreadsPanel
            entityId={proposal?.id}
            isSending={isAddingThreadReply}
            onSubmit={(replyBody, threadId) => {
              handleAddThreadReply(replyBody, threadId)
            }}
            orgSlug={orgSlug}
            projectId={projectId}
            threads={threads}
          />
        )}

        {signatures.length > 0 && (
          <div className='rounded-lg border p-4'>
            <h3 className='mb-3 font-semibold text-sm'>Signatures</h3>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              {signatures.map((sig) => (
                <div
                  className='flex items-center gap-3 rounded-md border bg-muted/30 p-3'
                  key={sig.id}
                >
                  {sig.mediaUrl && (
                    <div className='shrink-0 rounded border bg-white p-1'>
                      <Image
                        alt={`Signature by ${sig.signerName ?? 'Unknown'}`}
                        className='object-contain'
                        height={48}
                        src={sig.mediaUrl}
                        unoptimized
                        width={96}
                      />
                    </div>
                  )}
                  <div className='min-w-0'>
                    <p className='truncate font-medium text-sm'>
                      {sig.signerName ?? 'Unknown'}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {formatDate(sig.signedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>

      {canSendProposal && proposal && (
        <SendToClientDialog
          clients={projectClients}
          description='Select clients to send this proposal to for review and acceptance. They will receive an email notification.'
          onOpenChange={setShowSendDialog}
          onSend={async (clientMemberIds) => {
            await sendProposalAction({
              proposalId: proposal.id,
              recipients: clientMemberIds,
              orgSlug,
              projectId,
            })
            toast.success('Proposal sent to clients')
            setShowSendDialog(false)
            router.refresh()
          }}
          open={showSendDialog}
          title='Send Proposal'
        />
      )}

      {canSign &&
        mode === 'edit' &&
        proposal?.status === 'submitted_to_client' && (
          <SignatureDialog
            disabled={isSigning || isUploadingSignature}
            mediaItems={signatureMedia.map((m) => ({
              id: m.id,
              name: m.name,
              url: m.url,
              contentType: m.contentType,
              createdAt: m.createdAt,
            }))}
            onConfirm={handleSign}
            onOpenChange={setShowSignatureDialog}
            open={showSignatureDialog}
            title='Sign Proposal'
          />
        )}

      <Dialog onOpenChange={setShowNewThread} open={showNewThread}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>New Thread</DialogTitle>
            <DialogDescription>
              Start a discussion about the selected text.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='rounded-md border bg-muted/50 px-3 py-2'>
              <p className='font-medium text-muted-foreground text-xs'>
                Selected text
              </p>
              <p className='mt-1 line-clamp-3 text-sm italic'>
                &ldquo;{selectedText}&rdquo;
              </p>
            </div>
            <Textarea
              autoFocus
              className='min-h-[100px]'
              onChange={(e) => setThreadBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleCreateThread()
                }
              }}
              placeholder='What do you want to discuss about this?'
              value={threadBody}
            />
            <div className='flex justify-end gap-2'>
              <Button onClick={() => setShowNewThread(false)} variant='outline'>
                Cancel
              </Button>
              <Button
                disabled={!threadBody.trim()}
                loading={isAddingThread}
                onClick={handleCreateThread}
              >
                Create Thread
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
