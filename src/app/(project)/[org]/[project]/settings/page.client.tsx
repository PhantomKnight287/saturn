'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Save } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { InvoiceNumberTemplateInput } from '@/app/(organization)/[org]/settings/_components/invoice-number-template-input'
import { updateInvoiceNumberTemplateAction } from '@/app/(organization)/[org]/settings/actions'
import { updateInvoiceNumberTemplateSchema } from '@/app/(organization)/[org]/settings/common'
import type { projectsService } from '@/app/api/projects/service'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { CurrencySelect } from '@/components/ui/currency-selector'
import DatePicker from '@/components/ui/date-picker'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  deleteProjectAction,
  renameProjectAction,
  updateClientInvolvementLevelAction,
  updateProjectTimesheetDefaultsAction,
} from './actions'
import {
  clientInvolvementEntities,
  clientInvolvementEntityLabels,
  clientInvolvementProjectSchema,
  defaultClientInvolvement,
  deleteProjectSchema,
  renameProjectSchema,
  updateProjectTimesheetDefaultsSchema,
} from './common'

type RenameFormValues = z.infer<typeof renameProjectSchema>
type TimesheetFormValues = z.infer<typeof updateProjectTimesheetDefaultsSchema>
type DeleteFormValues = z.infer<typeof deleteProjectSchema>
type InvoiceTemplateFormValues = z.infer<
  typeof updateInvoiceNumberTemplateSchema
>

export function ProjectSettingsPageClient({
  project,
  organizationId,
  orgSlug,
  canDelete,
  settings,
}: {
  project: { id: string; name: string; slug: string; dueDate: Date | null }
  organizationId: string
  orgSlug: string
  canDelete: boolean
  settings: Awaited<ReturnType<typeof projectsService.getSettings>>
}) {
  const router = useRouter()

  const renameForm = useForm<RenameFormValues>({
    resolver: zodResolver(renameProjectSchema),
    defaultValues: {
      projectId: project.id,
      organizationId,
      name: project.name,
      slug: project.slug,
      dueDate: project.dueDate ?? undefined,
    },
  })

  const timesheetForm = useForm<TimesheetFormValues>({
    resolver: zodResolver(updateProjectTimesheetDefaultsSchema),
    defaultValues: {
      organizationId,
      projectId: project.id,
      defaultMemberRate: settings.memberRate,
      defaultCurrency: settings.currency,
      defaultTimesheetDuration: settings.timesheetDuration,
    },
  })

  const _deleteForm = useForm<DeleteFormValues>({
    resolver: zodResolver(deleteProjectSchema),
    defaultValues: {
      projectId: project.id,
      organizationId,
      confirmName: '',
    },
  })

  const invoiceTemplateForm = useForm<InvoiceTemplateFormValues>({
    resolver: zodResolver(updateInvoiceNumberTemplateSchema),
    defaultValues: {
      organizationId,
      projectId: project.id,
      invoiceNumberTemplate: settings.invoiceNumberTemplate,
    },
  })

  const clientInvolvementForm = useForm<
    z.infer<typeof clientInvolvementProjectSchema>
  >({
    resolver: zodResolver(clientInvolvementProjectSchema),
    defaultValues: {
      clientInvolvement: settings.clientInvolvement ?? defaultClientInvolvement,
      projectId: project.id,
      organizationId,
    },
  })

  const [slugAcknowledged, setSlugAcknowledged] = useState(false)
  const watchedSlug = renameForm.watch('slug')
  const slugChanged = watchedSlug !== project.slug

  const [deleteOpen, setDeleteOpen] = useState(false)

  const { execute: executeRename, isPending: isRenaming } = useAction(
    renameProjectAction,
    {
      onSuccess({ data }) {
        toast.success('Project updated')
        if (data?.slug && data.slug !== project.slug) {
          router.replace(`/${orgSlug}/${data.slug}/settings`)
        } else {
          router.refresh()
        }
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to update project')
      },
    }
  )

  const { execute: executeTimesheetDefaults, isPending: isSavingDefaults } =
    useAction(updateProjectTimesheetDefaultsAction, {
      onSuccess() {
        toast.success('Timesheet defaults updated')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to update timesheet defaults')
      },
    })

  const {
    execute: executeInvoiceTemplate,
    isPending: isSavingInvoiceTemplate,
  } = useAction(updateInvoiceNumberTemplateAction, {
    onSuccess() {
      toast.success('Invoice number template updated')
      invoiceTemplateForm.reset(invoiceTemplateForm.getValues())
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to update invoice template')
    },
  })

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteProjectAction,
    {
      onSuccess() {
        toast.success('Project deleted')
        router.replace(`/${orgSlug}`)
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to delete project')
      },
    }
  )

  const {
    execute: executeClientInvolvementUpdate,
    isPending: isClientInvolvementUpdating,
  } = useAction(updateClientInvolvementLevelAction, {
    onSuccess() {
      router.refresh()
      toast.success('Updated client involvement level')
    },
    onError({ error }) {
      toast.error(
        error.serverError ?? 'Failed to update client involvement level'
      )
    },
  })

  function handleRenameSubmit(data: RenameFormValues) {
    executeRename({
      projectId: data.projectId,
      organizationId: data.organizationId,
      name: data.name.trim(),
      slug: data.slug.trim(),
      dueDate: data.dueDate,
    })
  }

  function handleTimesheetSubmit(data: TimesheetFormValues) {
    executeTimesheetDefaults(data)
  }

  function handleInvoiceTemplateSubmit(data: InvoiceTemplateFormValues) {
    executeInvoiceTemplate(data)
  }

  return (
    <div className='w-full'>
      <div className='mb-6'>
        <h1 className='font-semibold text-2xl'>Settings</h1>
      </div>

      <div className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>
              Manage your project name, URL slug and due date.
            </CardDescription>
          </CardHeader>
          <form onSubmit={renameForm.handleSubmit(handleRenameSubmit)}>
            <CardContent>
              <FieldGroup className='gap-4'>
                <Controller
                  control={renameForm.control}
                  name='name'
                  render={({ field, fieldState }) => (
                    <Field className='gap-1' data-invalid={fieldState.invalid}>
                      <FieldLabel>Project Name</FieldLabel>
                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        placeholder='My Project'
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  control={renameForm.control}
                  name='slug'
                  render={({ field, fieldState }) => (
                    <Field className='gap-1' data-invalid={fieldState.invalid}>
                      <FieldLabel>URL Slug</FieldLabel>
                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        onChange={(e) => {
                          const newSlug = e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, '')
                          field.onChange(newSlug)
                          if (newSlug === project.slug) {
                            setSlugAcknowledged(false)
                          }
                        }}
                        placeholder='my-project'
                      />
                      <FieldDescription>
                        Your project will be accessible at /{orgSlug}/
                        {field.value}
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  control={renameForm.control}
                  name='dueDate'
                  render={({ field, fieldState }) => (
                    <Field className='gap-1' data-invalid={fieldState.invalid}>
                      <FieldLabel>Due Date</FieldLabel>
                      <DatePicker
                        onChange={(date) => field.onChange(date ?? undefined)}
                        value={field.value ?? undefined}
                      />
                      <FieldDescription>
                        Optional target date for project completion.
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                {slugChanged && (
                  <div className='rounded-lg border border-amber-500/50 bg-amber-500/5 p-3'>
                    <div className='flex items-start gap-3'>
                      <Checkbox
                        checked={slugAcknowledged}
                        onCheckedChange={(checked) =>
                          setSlugAcknowledged(checked === true)
                        }
                      />
                      <label
                        className='text-sm leading-snug'
                        htmlFor='slug-ack'
                      >
                        I acknowledge that by changing the slug of this project,
                        links in previously sent emails and notifications will
                        stop working, as they still point to{' '}
                        <span className='font-medium'>
                          /{orgSlug}/{project.slug}
                        </span>
                        .
                      </label>
                    </div>
                  </div>
                )}
              </FieldGroup>
            </CardContent>
            <CardFooter>
              <Button
                className='mt-4'
                disabled={
                  !renameForm.formState.isDirty ||
                  (slugChanged && !slugAcknowledged)
                }
                loading={isRenaming}
                type='submit'
              >
                <Save className='size-4' />
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timesheet Defaults</CardTitle>
            <CardDescription>
              Set the default hourly rate and currency for this project. These
              override the workspace-level defaults.
            </CardDescription>
          </CardHeader>
          <form onSubmit={timesheetForm.handleSubmit(handleTimesheetSubmit)}>
            <CardContent>
              <div className='grid grid-cols-2 gap-4'>
                <Controller
                  control={timesheetForm.control}
                  name='defaultCurrency'
                  render={({ field, fieldState }) => (
                    <Field className='gap-1' data-invalid={fieldState.invalid}>
                      <FieldLabel>Default Currency</FieldLabel>
                      <CurrencySelect
                        name='currency'
                        onValueChange={field.onChange}
                        value={field.value}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  control={timesheetForm.control}
                  name='defaultMemberRate'
                  render={({ field, fieldState }) => (
                    <Field className='gap-1' data-invalid={fieldState.invalid}>
                      <FieldLabel>Default Hourly Rate</FieldLabel>
                      <Input
                        min={0}
                        onChange={(e) =>
                          field.onChange(
                            Math.round(Number(e.target.value) * 100)
                          )
                        }
                        placeholder='0.00'
                        step={0.01}
                        type='number'
                        value={field.value ? field.value / 100 : ''}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>
              <Controller
                control={timesheetForm.control}
                name='defaultTimesheetDuration'
                render={({ field, fieldState }) => (
                  <Field
                    className='mt-4 gap-1'
                    data-invalid={fieldState.invalid}
                  >
                    <FieldLabel>Default Duration</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select duration' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='weekly'>Weekly</SelectItem>
                        <SelectItem value='biweekly'>Bi-Weekly</SelectItem>
                        <SelectItem value='monthly'>Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      The default time period for new timesheets in this project
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button
                className='mt-4'
                disabled={!timesheetForm.formState.isDirty}
                loading={isSavingDefaults}
                type='submit'
              >
                <Save className='size-4' />
                Save Defaults
              </Button>
            </CardFooter>
          </form>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              Client Approval
            </CardTitle>
            <CardDescription>
              Choose which parts of the workflow require client approval. Turn
              off the ones your client isn't involved in — those steps will be
              handled internally instead.
            </CardDescription>
          </CardHeader>
          <form
            onSubmit={clientInvolvementForm.handleSubmit((values) =>
              executeClientInvolvementUpdate(values)
            )}
          >
            <CardContent>
              <FieldGroup>
                {clientInvolvementEntities.map((entity) => (
                  <Controller
                    control={clientInvolvementForm.control}
                    key={entity}
                    name={`clientInvolvement.${entity}`}
                    render={({ field }) => (
                      <Field orientation='horizontal'>
                        <Checkbox
                          checked={field.value === 'on'}
                          id={`client-involvement-${entity}`}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true ? 'on' : 'off')
                          }
                        />
                        <div className='flex flex-col gap-0.5'>
                          <FieldLabel htmlFor={`client-involvement-${entity}`}>
                            {clientInvolvementEntityLabels[entity].label}
                          </FieldLabel>
                          <FieldDescription>
                            {clientInvolvementEntityLabels[entity].description}
                          </FieldDescription>
                        </div>
                      </Field>
                    )}
                  />
                ))}
              </FieldGroup>
            </CardContent>
            <CardFooter>
              <Button
                className='mt-4'
                disabled={!clientInvolvementForm.formState.isDirty}
                loading={isClientInvolvementUpdating}
                type='submit'
              >
                <Save className='size-4' />
                Save Approval Settings
              </Button>
            </CardFooter>
          </form>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              Invoice Numbering
            </CardTitle>
            <CardDescription>
              Override the workspace-level invoice number template for this
              project only.
            </CardDescription>
          </CardHeader>
          <form
            onSubmit={invoiceTemplateForm.handleSubmit(
              handleInvoiceTemplateSubmit
            )}
          >
            <CardContent>
              <Controller
                control={invoiceTemplateForm.control}
                name='invoiceNumberTemplate'
                render={({ field, fieldState }) => (
                  <Field className='gap-1' data-invalid={fieldState.invalid}>
                    <FieldLabel>Template</FieldLabel>
                    <InvoiceNumberTemplateInput
                      onChange={field.onChange}
                      value={field.value}
                    />
                    <FieldDescription>
                      Preview uses sequence #1 and the current date/time. Real
                      invoices use the next available sequence.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button
                className='mt-4'
                disabled={!invoiceTemplateForm.formState.isDirty}
                loading={isSavingInvoiceTemplate}
                type='submit'
              >
                <Save className='size-4' />
                Save Template
              </Button>
            </CardFooter>
          </form>
        </Card>

        {canDelete && (
          <Card className='border-destructive/50'>
            <CardHeader>
              <CardTitle className='text-destructive'>Danger Zone</CardTitle>
              <CardDescription>
                Permanently delete this project and all of its data. This action
                cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                loading={isDeleting}
                onClick={() => setDeleteOpen(true)}
                variant='destructive'
              >
                <AlertTriangle className='size-4' />
                Delete Project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDeleteDialog
        confirmationText={project.name}
        description={
          <>
            This will permanently delete{' '}
            <span className='font-semibold text-foreground'>
              "{project.name}"
            </span>{' '}
            and all associated data including timesheets, invoices, and
            milestones. This action cannot be undone.
          </>
        }
        onConfirm={() => {
          executeDelete({
            projectId: project.id,
            confirmName: project.name,
            organizationId,
          })
        }}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title='Delete Project'
      />
    </div>
  )
}
