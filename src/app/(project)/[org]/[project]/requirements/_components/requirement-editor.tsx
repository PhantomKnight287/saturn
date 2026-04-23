'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeftIcon,
  Check,
  MessageSquarePlus,
  RotateCcw,
  Save,
  Send,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type z from 'zod'
import SendToClientDialog from '@/components/send-to-client-dialog'
import type { SignatureResult } from '@/components/signature-dialog'
import { SignatureDialog } from '@/components/signature-dialog'
import StatusBadge from '@/components/status-badge'
import type { EditorRef } from '@/components/tiptap-editor'
import TiptapEditor from '@/components/tiptap-editor'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { uploadDataUrl } from '@/lib/upload'
import { formatDate } from '@/lib/utils'
import type { RouteImpl } from '@/types'
import {
  createRequirementAction,
  createThreadAction,
  sendForSignAction,
  signRequirementAction,
  updateRequirementAction,
} from '../action'
import { requirementFormSchema } from '../common'
import type { RequirementEditorProps } from '../types'
import ChangeRequestsPanel from './change-requests-panel'
import RequestChangesDialog from './request-changes-dialog'
import ThreadsPanel from './threads-panel'

export default function RequirementEditor(props: RequirementEditorProps) {
  const router = useRouter()
  const editorRef = useRef<EditorRef | null>(null)
  const backUrl =
    `/${props.orgSlug}/${props.projectSlug}/requirements` as RouteImpl
  const isEditable =
    props.mode === 'create' ||
    (props.canEdit && props.isClientInvolved === false)

  const form = useForm<z.infer<typeof requirementFormSchema>>({
    resolver: zodResolver(requirementFormSchema),
    defaultValues: {
      body: props.requirement?.body ?? '',
      title: props.requirement?.title ?? '',
    },
  })
  const body = form.watch('body')
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showChangesDialog, setShowChangesDialog] = useState(false)
  const [showNewThread, setShowNewThread] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [threadBody, setThreadBody] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [showSignatureDialog, setShowSignatureDialog] = useState(false)

  const canSend =
    props.canSendForSign && props.mode === 'edit' && props.requirement != null
  const showSign =
    props.canSign &&
    props.mode === 'edit' &&
    props.requirement?.status === 'submitted_to_client' &&
    !props.hasSignedAlready

  const showRequestChanges =
    props.canSign &&
    props.mode === 'edit' &&
    (props.requirement?.status === 'submitted_to_client' ||
      props.requirement?.status === 'changes_requested')

  const showThreads = props.mode === 'edit' && props.requirement != null

  const { execute: createRequirement, isExecuting: isCreating } = useAction(
    createRequirementAction,
    {
      onSuccess: (result) => {
        toast.success('Requirement created successfully')
        router.push(
          `/${props.orgSlug}/${props.projectSlug}/requirements/${result.data?.slug}`
        )
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Failed to create requirement')
      },
    }
  )

  const { execute: updateRequirement, isExecuting: isUpdating } = useAction(
    updateRequirementAction,
    {
      onSuccess: () => {
        toast.success('Requirement updated successfully')
        router.refresh()
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Failed to update requirement')
      },
    }
  )

  const { execute: sendForSign, isExecuting: isSendingForSign } = useAction(
    sendForSignAction,
    {
      onSuccess: () => {
        toast.success('Requirement sent for sign successfully')
        router.refresh()
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Failed to send requirement for sign')
      },
    }
  )
  const { execute: signRequirement, isExecuting: isSigning } = useAction(
    signRequirementAction,
    {
      onSuccess: () => {
        toast.success('Requirement signed successfully')
        setShowSignatureDialog(false)
        router.refresh()
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Failed to sign requirement')
      },
    }
  )

  const { execute: createThread, isExecuting: isCreatingThread } = useAction(
    createThreadAction,
    {
      onSuccess: () => {
        toast.success('Thread created successfully')
        setShowNewThread(false)
        setSelectedText('')
        setThreadBody('')
        router.refresh()
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Failed to create thread')
      },
    }
  )

  const handleSave = form.handleSubmit(async (values) => {
    // Upload any pending blob images before saving
    let finalBody = values.body
    try {
      setIsUploading(true)
      finalBody =
        (await editorRef.current?.uploadImagesAndGetHTML()) ?? values.body
    } catch {
      toast.error('Failed to upload images')
      return
    } finally {
      setIsUploading(false)
    }

    if (props.mode === 'create') {
      createRequirement({
        projectId: props.projectId,
        orgSlug: props.orgSlug,
        title: values.title.trim(),
        body: finalBody,
      })
    } else {
      updateRequirement({
        projectId: props.projectId,
        orgSlug: props.orgSlug,
        requirementId: props.requirement!.id,
        title: values.title.trim(),
        body: finalBody,
      })
    }
  })

  const handleStartThread = () => {
    const editor = editorRef.current?.getEditor()
    if (!editor) {
      return
    }

    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to, ' ')

    if (!text.trim()) {
      toast.error('Please select some text to start a thread')
      return
    }

    setSelectedText(text)
    setShowNewThread(true)
  }

  const handleCreateThread = () => {
    createThread({
      requirementId: props.requirement!.id,
      projectId: props.projectId,
      orgSlug: props.orgSlug,
      selectedText,
      threadBody,
    })
  }

  const [isUploadingSignature, setIsUploadingSignature] = useState(false)
  const handleSign = async (result: SignatureResult) => {
    if (!props.requirement) {
      return
    }

    try {
      setIsUploadingSignature(true)

      let mediaId: string

      if (result.source === 'library') {
        const match = props.signatureMedia?.find((m) => m.id === result.dataUrl)
        if (!match) {
          toast.error('Could not find the selected signature')
          return
        }
        mediaId = match.id
      } else {
        const uploaded = await uploadDataUrl(
          result.dataUrl,
          props.projectId,
          'signature.png'
        )
        mediaId = uploaded.id
      }

      signRequirement({
        requirementId: props.requirement.id,
        projectId: props.projectId,
        orgSlug: props.orgSlug,
        mediaId,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign')
    } finally {
      setIsUploadingSignature(false)
    }
  }

  return (
    <div className='mx-auto w-full max-w-4xl'>
      <div className='mb-6 flex items-center justify-between gap-4'>
        <Link
          className={buttonVariants({ size: 'sm', variant: 'ghost' })}
          href={backUrl}
        >
          <ArrowLeftIcon className='mr-1 size-4' />
          Back
        </Link>
        <div className='flex items-center gap-2'>
          {props.mode === 'edit' &&
          props.requirement !== null &&
          props.isClientInvolved ? (
            <StatusBadge role={props.role} status={props.requirement!.status} />
          ) : null}
          {showSign && (
            <Button
              loading={isSigning || isUploadingSignature}
              onClick={() => setShowSignatureDialog(true)}
              size='sm'
            >
              <Check className='mr-1 size-4' />
              Sign
            </Button>
          )}
          {showRequestChanges && (
            <Button
              className='border-amber-600 text-amber-600 hover:bg-amber-50 hover:text-amber-700'
              onClick={() => setShowChangesDialog(true)}
              size='sm'
              variant='outline'
            >
              <RotateCcw className='mr-1 size-4' />
              Request Changes
            </Button>
          )}
          {canSend && props.isClientInvolved && (
            <Button
              loading={isSendingForSign}
              onClick={() => setShowSendDialog(true)}
              size='sm'
              variant='outline'
            >
              <Send className='mr-1 size-4' />
              Send for Sign
            </Button>
          )}
          {showThreads && props.isClientInvolved && (
            <Button onClick={handleStartThread} size='sm' variant='outline'>
              <MessageSquarePlus className='mr-1 size-4' />
              New Thread
            </Button>
          )}
          {isEditable && (
            <Button
              disabled={!form.formState.isValid}
              loading={isUploading || isCreating || isUpdating}
              onClick={handleSave}
              size='sm'
            >
              <Save className='mr-1 size-4' />
              {props.mode === 'create' ? 'Create' : 'Save'}
            </Button>
          )}
        </div>
      </div>
      <div className='space-y-4'>
        <Input
          {...form.register('title')}
          placeholder='Requirement title'
          readOnly={!isEditable}
        />

        <TiptapEditor
          content={body}
          editable={isEditable}
          onChange={(value) => form.setValue('body', value)}
          placeholder='Describe the requirement in detail...'
          projectId={props.projectId}
          ref={editorRef}
        />

        {props.changeRequests && props.changeRequests.length > 0 && (
          <ChangeRequestsPanel
            canResolve={props.canEdit ?? false}
            changeRequests={props.changeRequests ?? []}
            orgSlug={props.orgSlug}
            projectId={props.projectId}
            requirementId={props.requirement!.id}
            threads={props.threads ?? []}
          />
        )}

        {showThreads && (
          <ThreadsPanel
            entityId={props.requirement!.id}
            orgSlug={props.orgSlug}
            projectId={props.projectId}
            threads={props.threads ?? []}
          />
        )}

        {props.signatures && props.signatures.length > 0 && (
          <div className='rounded-lg border p-4'>
            <h3 className='mb-3 font-semibold text-sm'>Signatures</h3>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              {props.signatures.map((sig) => (
                <div
                  className='flex items-center gap-3 rounded-md border bg-muted/30 p-3'
                  key={sig.id}
                >
                  {sig.mediaId && (
                    <div className='shrink-0 rounded border bg-white p-1'>
                      <Image
                        alt={`Signature by ${sig.signerName ?? 'Unknown'}`}
                        className='object-contain'
                        height={48}
                        src={`/api/files/${sig.mediaId}`}
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
      </div>
      {canSend && props.requirement && (
        <SendToClientDialog
          clients={props.projectClients ?? []}
          description='Select clients to send this requirement to for review and sign-off. They will receive an email notification.'
          emptyMessage='No clients assigned to this project. Add clients from the Team page first.'
          onOpenChange={setShowSendDialog}
          onSend={(clientMemberIds) => {
            sendForSign({
              requirementId: props.requirement!.id,
              projectId: props.projectId,
              orgSlug: props.orgSlug,
              recipients: clientMemberIds,
            })
            setShowSendDialog(false)
          }}
          open={showSendDialog}
          recipientLabel='clients'
          sendDisabled={isSendingForSign}
          title='Send for Sign'
        />
      )}
      {showRequestChanges && props.requirement && (
        <RequestChangesDialog
          onOpenChange={setShowChangesDialog}
          open={showChangesDialog}
          orgSlug={props.orgSlug}
          projectId={props.projectId}
          requirementId={props.requirement.id}
          threads={props.threads}
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
                disabled={!threadBody.trim() || isCreatingThread}
                loading={isCreatingThread}
                onClick={handleCreateThread}
              >
                Create Thread
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {props.canSign &&
        props.mode === 'edit' &&
        props.requirement?.status === 'submitted_to_client' && (
          <SignatureDialog
            disabled={isSigning || isUploadingSignature}
            mediaItems={props.signatureMedia ?? []}
            onConfirm={handleSign}
            onOpenChange={setShowSignatureDialog}
            open={showSignatureDialog}
          />
        )}
    </div>
  )
}
