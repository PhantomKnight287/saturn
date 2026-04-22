'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, CreditCard, Save, Sparkles } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { proPlanFeatures } from '@/app/_landing/data'
import {
  type ClientInvolvementValue,
  clientInvolvementEntities,
  clientInvolvementEntityLabels,
  defaultClientInvolvement,
} from '@/app/(project)/[org]/[project]/settings/common'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { Badge } from '@/components/ui/badge'
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
import { authClient, useSession } from '@/lib/auth-client'
import { ApiKeysCard } from './_components/api-keys/card'
import { InvoiceNumberTemplateInput } from './_components/invoice-number-template-input'
import {
  deleteOrganizationAction,
  renameOrganizationAction,
  updateInvoiceNumberTemplateAction,
  updateOrgClientInvolvementAction,
  updateTimesheetDefaultsAction,
} from './actions'
import {
  renameOrganizationSchema,
  type TimesheetDuration,
  updateInvoiceNumberTemplateSchema,
  updateOrgClientInvolvementSchema,
  updateTimesheetDefaultsSchema,
} from './common'

type RenameFormValues = z.infer<typeof renameOrganizationSchema>
type TimesheetFormValues = z.infer<typeof updateTimesheetDefaultsSchema>
type InvoiceTemplateFormValues = z.infer<
  typeof updateInvoiceNumberTemplateSchema
>

export function SettingsPageClient({
  organization,
  orgSlug,
  canDelete,
  defaultMemberRate,
  defaultTimesheetDuration,
  defaultCurrency,
  invoiceNumberTemplate,
  clientInvolvement,
}: {
  organization: { id: string; name: string; slug: string }
  orgSlug: string
  canDelete: boolean
  defaultMemberRate: number
  defaultCurrency: string
  defaultTimesheetDuration: TimesheetDuration
  invoiceNumberTemplate: string
  clientInvolvement: ClientInvolvementValue
}) {
  const router = useRouter()
  const session = useSession()
  const renameForm = useForm<RenameFormValues>({
    resolver: zodResolver(renameOrganizationSchema),
    defaultValues: {
      organizationId: organization.id,
      name: organization.name,
      slug: organization.slug,
    },
  })

  const timesheetForm = useForm<TimesheetFormValues>({
    resolver: zodResolver(updateTimesheetDefaultsSchema),
    defaultValues: {
      organizationId: organization.id,
      defaultMemberRate,
      defaultCurrency,
      defaultTimesheetDuration,
    },
  })

  const invoiceTemplateForm = useForm<InvoiceTemplateFormValues>({
    resolver: zodResolver(updateInvoiceNumberTemplateSchema),
    defaultValues: {
      organizationId: organization.id,
      invoiceNumberTemplate,
    },
  })

  const clientInvolvementForm = useForm<
    z.infer<typeof updateOrgClientInvolvementSchema>
  >({
    resolver: zodResolver(updateOrgClientInvolvementSchema),
    defaultValues: {
      organizationId: organization.id,
      clientInvolvement: clientInvolvement ?? defaultClientInvolvement,
    },
  })

  const [slugAcknowledged, setSlugAcknowledged] = useState(false)
  const watchedSlug = renameForm.watch('slug')
  const slugChanged = watchedSlug !== organization.slug

  const [deleteOpen, setDeleteOpen] = useState(false)

  const [subscription, setSubscription] = useState<{
    status: 'loading' | 'free' | 'active'
    currentPeriodEnd?: string
    productName?: string
  }>({ status: 'loading' })
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    authClient.customer.subscriptions
      .list({
        query: {
          limit: 1,
          active: true,
          referenceId: session.data?.user.id,
        },
      })
      // biome-ignore lint/suspicious/noExplicitAny: I have no idea why this section is not typed
      .then(({ data }: { data: any }) => {
        if (data && data?.result?.items.length > 0) {
          const sub = data?.result?.items[0]
          setSubscription({
            status: 'active',
            currentPeriodEnd: sub.currentPeriodEnd,
            productName: sub.productName,
          })
        } else {
          setSubscription({ status: 'free' })
        }
      })
      .catch(() => {
        setSubscription({ status: 'free' })
      })
  }, [session.data?.user.id])

  const handleUpgrade = useCallback(async () => {
    setCheckoutLoading(true)
    try {
      await authClient.checkout({
        slug: 'pro-plan',
        referenceId: session.data?.user.id,
      })
    } catch {
      toast.error('Failed to start checkout')
      setCheckoutLoading(false)
    }
  }, [session.data?.user.id])

  const handleManageBilling = useCallback(async () => {
    try {
      await authClient.customer.portal()
    } catch {
      toast.error('Failed to open billing portal')
    }
  }, [])

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

  const {
    execute: executeClientInvolvement,
    isPending: isSavingClientInvolvement,
  } = useAction(updateOrgClientInvolvementAction, {
    onSuccess() {
      toast.success('Client approval defaults updated')
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to update client approval')
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

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              Invoice Numbering
            </CardTitle>
            <CardDescription>
              Define the template used to generate invoice numbers. Add
              variables like sequence, date parts, or time, and mix them with
              your own prefix and separators.
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

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              Client Approval
            </CardTitle>
            <CardDescription>
              Workspace defaults for which parts of the workflow require client
              approval. Individual projects can override these.
            </CardDescription>
          </CardHeader>
          <form
            onSubmit={clientInvolvementForm.handleSubmit((values) =>
              executeClientInvolvement(values)
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
                          id={`org-client-involvement-${entity}`}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true ? 'on' : 'off')
                          }
                        />
                        <div className='flex flex-col gap-0.5'>
                          <FieldLabel
                            htmlFor={`org-client-involvement-${entity}`}
                          >
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
                loading={isSavingClientInvolvement}
                type='submit'
              >
                <Save className='size-4' />
                Save Approval Defaults
              </Button>
            </CardFooter>
          </form>
        </Card>

        {subscription.status !== 'loading' && (
          <Card
            className={
              subscription.status === 'free'
                ? 'border-primary/30 bg-linear-to-br from-primary/5 to-transparent'
                : ''
            }
          >
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div className='space-y-1'>
                  <CardTitle className='flex items-center gap-2'>
                    Plan & Billing
                    {subscription.status === 'active' ? (
                      <Badge
                        className='border-teal-300 bg-teal-100 text-teal-800 dark:border-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                        variant='outline'
                      >
                        Pro
                      </Badge>
                    ) : (
                      <Badge variant='outline'>Free</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {subscription.status === 'active'
                      ? 'Your workspace is on the Pro plan.'
                      : 'Upgrade to Pro to unlock premium features for your workspace.'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {subscription.status === 'active' ? (
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='rounded-lg border p-3'>
                      <p className='text-muted-foreground text-sm'>
                        Current Plan
                      </p>
                      <p className='font-medium text-lg'>
                        {subscription.productName ?? 'Pro'}
                      </p>
                    </div>
                    {subscription.currentPeriodEnd && (
                      <div className='rounded-lg border p-3'>
                        <p className='text-muted-foreground text-sm'>
                          Renews On
                        </p>
                        <p className='font-medium text-lg'>
                          {new Date(
                            subscription.currentPeriodEnd
                          ).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleManageBilling}
                    type='button'
                    variant='outline'
                  >
                    <CreditCard className='size-4' />
                    Manage Billing
                  </Button>
                </div>
              ) : (
                <div className='space-y-4'>
                  <ul className='space-y-2 text-muted-foreground text-sm'>
                    {proPlanFeatures.map((e) => (
                      <li className='flex items-center gap-2' key={e}>
                        <Sparkles className='size-4 text-primary' />
                        {e}
                      </li>
                    ))}
                  </ul>
                  <Button
                    loading={checkoutLoading}
                    onClick={handleUpgrade}
                    type='button'
                  >
                    <Sparkles className='size-4' />
                    Upgrade to Pro
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <ApiKeysCard
          onUpgrade={handleUpgrade}
          organizationId={organization.id}
          subscriptionStatus={subscription.status}
          upgrading={checkoutLoading}
        />

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

      <ConfirmDeleteDialog
        actionLabel='Delete Workspace'
        confirmationText={organization.name}
        description={
          <>
            This will permanently delete{' '}
            <span className='font-semibold text-foreground'>
              {organization.name}
            </span>{' '}
            and all associated data including projects, timesheets, and
            invoices. This action cannot be undone.
          </>
        }
        loading={isDeleting}
        onConfirm={() =>
          executeDelete({
            organizationId: organization.id,
            confirmName: organization.name,
          })
        }
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title='Delete Workspace'
      />
    </div>
  )
}
