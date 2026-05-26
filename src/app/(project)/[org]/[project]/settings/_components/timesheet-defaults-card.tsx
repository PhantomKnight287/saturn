'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useId, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import type { projectsService } from '@/app/api/projects/service'
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { RateInput } from '@/components/ui/rate-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { billingFrequencyEnum } from '@/server/db/schema'
import { updateProjectTimesheetDefaultsAction } from '../actions'
import { updateProjectTimesheetDefaultsSchema } from '../common'

type FormValues = z.input<typeof updateProjectTimesheetDefaultsSchema>

export function TimesheetDefaultsCard({
  projectId,
  organizationId,
  settings,
}: {
  projectId: string
  organizationId: string
  settings: Awaited<ReturnType<typeof projectsService.getSettings>>
}) {
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(updateProjectTimesheetDefaultsSchema),
    defaultValues: {
      organizationId,
      projectId,
      defaultPayRate: settings.payRate,
      defaultPayCurrency: settings.payCurrency,
      defaultPayFrequency: settings.payFrequency ?? 'hourly',
      defaultBillingRate: settings.billingRate ?? undefined,
      defaultBillingCurrency: settings.billingCurrency,
      defaultBillingFrequency: settings.billingFrequency ?? 'hourly',
      defaultTimesheetDuration: settings.timesheetDuration,
    },
  })

  // Billing is optional: when unset, clients are billed at the pay rate.
  const [billSameAsPay, setBillSameAsPay] = useState(
    settings.billingRate == null
  )
  const billSameAsPayId = useId()

  function handleBillSameAsPayChange(checked: boolean) {
    setBillSameAsPay(checked)
    if (checked) {
      // Clear billing so it resolves to the pay rate.
      form.setValue('defaultBillingRate', undefined, { shouldDirty: true })
      form.setValue('defaultBillingCurrency', undefined, { shouldDirty: true })
      form.setValue('defaultBillingFrequency', undefined, { shouldDirty: true })
    } else {
      // Seed the billing fields from the current pay values.
      form.setValue('defaultBillingRate', form.getValues('defaultPayRate'), {
        shouldDirty: true,
      })
      form.setValue(
        'defaultBillingCurrency',
        form.getValues('defaultPayCurrency'),
        { shouldDirty: true }
      )
      form.setValue(
        'defaultBillingFrequency',
        form.getValues('defaultPayFrequency') ?? 'hourly',
        { shouldDirty: true }
      )
    }
  }

  const { execute, isPending } = useAction(
    updateProjectTimesheetDefaultsAction,
    {
      onSuccess() {
        toast.success('Timesheet defaults updated')
        router.refresh()
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Failed to update timesheet defaults')
      },
    }
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timesheet Defaults</CardTitle>
        <CardDescription>
          These are defaults for this project and override the workspace-level
          defaults. You can override the rate for an individual member from the
          rates dialog on the timesheets page.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit((values) => execute(values))}>
        <CardContent className='space-y-6'>
          <div className='space-y-3'>
            <p className='font-medium text-sm'>Pay (what members are paid)</p>
            <Controller
              control={form.control}
              name='defaultPayRate'
              render={({ field, fieldState }) => (
                <Field
                  className='w-auto gap-1'
                  data-invalid={fieldState.invalid}
                >
                  <RateInput
                    currency={form.watch('defaultPayCurrency')}
                    frequencies={billingFrequencyEnum.enumValues}
                    frequency={form.watch('defaultPayFrequency') ?? 'hourly'}
                    invalid={fieldState.invalid}
                    name='payCurrency'
                    onCurrencyChange={(v) =>
                      form.setValue('defaultPayCurrency', v, {
                        shouldDirty: true,
                      })
                    }
                    onFrequencyChange={(v) =>
                      form.setValue(
                        'defaultPayFrequency',
                        v as (typeof billingFrequencyEnum.enumValues)[number],
                        { shouldDirty: true }
                      )
                    }
                    onValueChange={field.onChange}
                    value={field.value}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          <div className='space-y-3'>
            <label
              className='flex items-center gap-2 font-medium text-sm'
              htmlFor={billSameAsPayId}
            >
              <Checkbox
                checked={billSameAsPay}
                id={billSameAsPayId}
                onCheckedChange={(c) => handleBillSameAsPayChange(c === true)}
              />
              Bill clients at the same rate members are paid
            </label>

            {!billSameAsPay && (
              <div className='space-y-3'>
                <p className='font-medium text-sm'>
                  Billing (what clients are charged)
                </p>
                <Controller
                  control={form.control}
                  name='defaultBillingRate'
                  render={({ field, fieldState }) => (
                    <Field className='gap-1' data-invalid={fieldState.invalid}>
                      <div>
                        <RateInput
                          allowEmpty
                          currency={form.watch('defaultBillingCurrency')}
                          frequencies={billingFrequencyEnum.enumValues}
                          frequency={
                            form.watch('defaultBillingFrequency') ?? 'hourly'
                          }
                          invalid={fieldState.invalid}
                          name='billingCurrency'
                          onCurrencyChange={(v) =>
                            form.setValue('defaultBillingCurrency', v, {
                              shouldDirty: true,
                            })
                          }
                          onFrequencyChange={(v) =>
                            form.setValue(
                              'defaultBillingFrequency',
                              v as (typeof billingFrequencyEnum.enumValues)[number],
                              { shouldDirty: true }
                            )
                          }
                          onValueChange={field.onChange}
                          value={field.value}
                        />
                      </div>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>
            )}
          </div>
          <Controller
            control={form.control}
            name='defaultTimesheetDuration'
            render={({ field, fieldState }) => (
              <Field className='mt-4 gap-1' data-invalid={fieldState.invalid}>
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
            disabled={!form.formState.isDirty}
            loading={isPending}
            type='submit'
          >
            <Save className='size-4' />
            Save Defaults
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
