'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Save } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  deleteOrganizationAction,
  renameOrganizationAction,
  updateTimesheetDefaultsAction,
} from './actions'
import {
  deleteOrganizationSchema,
  renameOrganizationSchema,
  type TimesheetDuration,
  updateTimesheetDefaultsSchema,
} from './common'

type RenameFormValues = z.infer<typeof renameOrganizationSchema>
type TimesheetFormValues = z.infer<typeof updateTimesheetDefaultsSchema>
type DeleteFormValues = z.infer<typeof deleteOrganizationSchema>

export function SettingsPageClient({
  organization,
  orgSlug,
  canDelete,
  defaultMemberRate,
  defaultTimesheetDuration,
  defaultCurrency,
}: {
  organization: { id: string; name: string; slug: string }
  orgSlug: string
  canDelete: boolean
  defaultMemberRate: number
  defaultCurrency: string
  defaultTimesheetDuration: TimesheetDuration
}) {
  const router = useRouter()

  // General settings form
  const renameForm = useForm<RenameFormValues>({
    resolver: zodResolver(renameOrganizationSchema),
    defaultValues: {
      organizationId: organization.id,
      name: organization.name,
      slug: organization.slug,
    },
  })

  // Timesheet defaults form
  const timesheetForm = useForm<TimesheetFormValues>({
    resolver: zodResolver(updateTimesheetDefaultsSchema),
    defaultValues: {
      organizationId: organization.id,
      defaultMemberRate,
      defaultCurrency,
      defaultTimesheetDuration,
    },
  })

  // Delete form
  const deleteForm = useForm<DeleteFormValues>({
    resolver: zodResolver(deleteOrganizationSchema),
    defaultValues: {
      organizationId: organization.id,
      confirmName: '',
    },
  })

  // Slug change acknowledgement
  const [slugAcknowledged, setSlugAcknowledged] = useState(false)
  const watchedSlug = renameForm.watch('slug')
  const slugChanged = watchedSlug !== organization.slug

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { execute: executeRename, isPending: isRenaming } = useAction(
    renameOrganizationAction,
    {
      onSuccess({ data }) {
        toast.success('Workspace updated')
        if (data?.slug && data.slug !== orgSlug) {
          router.push(`/${data.slug}/settings`)
        } else {
          router.refresh()
        }
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to update workspace')
      },
    }
  )

  const { execute: executeTimesheetDefaults, isPending: isSavingDefaults } =
    useAction(updateTimesheetDefaultsAction, {
      onSuccess() {
        toast.success('Timesheet defaults updated')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to update timesheet defaults')
      },
    })

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteOrganizationAction,
    {
      onSuccess() {
        toast.success('Workspace deleted')
        router.push('/')
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to delete workspace')
      },
    }
  )

  function handleRenameSubmit(data: RenameFormValues) {
    executeRename({
      organizationId: data.organizationId,
      name: data.name.trim(),
      slug: data.slug.trim(),
    })
  }

  function handleTimesheetSubmit(data: TimesheetFormValues) {
    executeTimesheetDefaults(data)
  }

  function handleDeleteSubmit(data: DeleteFormValues) {
    executeDelete(data)
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
              Manage your workspace name and URL slug.
            </CardDescription>
          </CardHeader>
          <form onSubmit={renameForm.handleSubmit(handleRenameSubmit)}>
            <CardContent>
              <FieldGroup>
                <Controller
                  control={renameForm.control}
                  name='name'
                  render={({ field, fieldState }) => (
                    <Field className='gap-1' data-invalid={fieldState.invalid}>
                      <FieldLabel>Workspace Name</FieldLabel>
                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        placeholder='My Workspace'
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
                          if (newSlug === organization.slug) {
                            setSlugAcknowledged(false)
                          }
                        }}
                        placeholder='my-workspace'
                      />
                      <FieldDescription>
                        Your workspace will be accessible at /{field.value}
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
                        I acknowledge that by changing the slug of workspace,
                        links in previously sent emails and notifications will
                        stop working, as they still point to{' '}
                        <span className='font-medium'>
                          /{organization.slug}
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
              Set the default hourly rate and currency for new members. These
              can be overridden per project.
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
                      The default time period for new timesheets
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

        {canDelete && (
          <Card className='border-destructive/50'>
            <CardHeader>
              <CardTitle className='text-destructive'>Danger Zone</CardTitle>
              <CardDescription>
                Permanently delete this workspace and all of its data. This
                action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setDeleteOpen(true)} variant='destructive'>
                <AlertTriangle className='size-4' />
                Delete Workspace
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
            <DialogDescription>
              This will permanently delete{' '}
              <span className='font-semibold text-foreground'>
                {organization.name}
              </span>{' '}
              and all associated data including projects, timesheets, and
              invoices. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={deleteForm.handleSubmit(handleDeleteSubmit)}>
            <div className='space-y-4'>
              <Controller
                control={deleteForm.control}
                name='confirmName'
                render={({ field, fieldState }) => (
                  <Field className='gap-1' data-invalid={fieldState.invalid}>
                    <Label>
                      Type{' '}
                      <span className='font-semibold'>{organization.name}</span>{' '}
                      to confirm
                    </Label>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      autoFocus
                      placeholder={organization.name}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <div className='flex justify-end gap-2'>
                <Button onClick={() => setDeleteOpen(false)} variant='outline'>
                  Cancel
                </Button>
                <Button
                  disabled={
                    deleteForm.watch('confirmName') !== organization.name
                  }
                  loading={isDeleting}
                  type='submit'
                  variant='destructive'
                >
                  Delete Workspace
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
