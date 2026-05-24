'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
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
import { CurrencySelect } from '@/components/ui/currency-selector'
import {
  Field,
  FieldDescription,
  FieldError,
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
import { billingFrequencyEnum } from '@/server/db/schema'
import { updateTimesheetDefaultsAction } from '../actions'
import {
  type BillingFrequency,
  type TimesheetDuration,
  updateTimesheetDefaultsSchema,
} from '../common'

// Use the schema's input type — the schema has a `.transform`, so `z.infer`
// would give the post-transform shape with billing fields already resolved.
type FormValues = z.input<typeof updateTimesheetDefaultsSchema>

export function TimesheetDefaultsCard({
  organizationId,
  defaultPayRate,
  defaultPayCurrency,
  defaultPayFrequency,
  defaultBillingRate,
  defaultBillingCurrency,
  defaultBillingFrequency,
  defaultTimesheetDuration,
}: {
  organizationId: string
  defaultPayRate: number
  defaultPayCurrency: string
  defaultPayFrequency: BillingFrequency | null
  defaultBillingRate: number | null
  defaultBillingCurrency: string
  defaultBillingFrequency: BillingFrequency | null
  defaultTimesheetDuration: TimesheetDuration
}) {
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(updateTimesheetDefaultsSchema),
    defaultValues: {
      organizationId,
      defaultPayRate,
      defaultPayCurrency,
      defaultPayFrequency: defaultPayFrequency ?? 'hourly',
      defaultBillingRate: defaultBillingRate ?? undefined,
      defaultBillingCurrency: defaultBillingCurrency,
      defaultBillingFrequency: defaultBillingFrequency ?? 'hourly',
      defaultTimesheetDuration,
    },
  })

  const { execute, isPending } = useAction(updateTimesheetDefaultsAction, {
    onSuccess() {
      toast.success('Timesheet defaults updated')
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to update timesheet defaults')
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timesheet Defaults</CardTitle>
        <CardDescription>
          Set the default hourly rate and currency for new members. These can be
          overridden per project.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit((values) => execute(values))}>
        <CardContent className='space-y-6'>
          <div className='space-y-3'>
            <p className='font-medium text-sm'>Pay (what members are paid)</p>
            <div className='grid grid-cols-3 gap-4'>
              <Controller
                control={form.control}
                name='defaultPayRate'
                render={({ field, fieldState }) => (
                  <Field className='gap-1' data-invalid={fieldState.invalid}>
                    <FieldLabel>Rate</FieldLabel>
                    <Input
                      min={0}
                      onChange={(e) =>
                        field.onChange(Math.round(Number(e.target.value) * 1000))
                      }
                      placeholder='0.000'
                      step={0.001}
                      type='number'
                      value={field.value ? field.value / 1000 : ''}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name='defaultPayCurrency'
                render={({ field, fieldState }) => (
                  <Field className='gap-1' data-invalid={fieldState.invalid}>
                    <FieldLabel>Currency</FieldLabel>
                    <CurrencySelect
                      name='payCurrency'
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
                control={form.control}
                name='defaultPayFrequency'
                render={({ field, fieldState }) => (
                  <Field className='gap-1' data-invalid={fieldState.invalid}>
                    <FieldLabel>Frequency</FieldLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {billingFrequencyEnum.enumValues.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
          </div>

          <div className='space-y-3'>
            <p className='font-medium text-sm'>
              Billing (what clients are charged)
              <span className='ml-1 font-normal text-muted-foreground'>
                — leave rate blank to match pay
              </span>
            </p>
            <div className='grid grid-cols-3 gap-4'>
              <Controller
                control={form.control}
                name='defaultBillingRate'
                render={({ field, fieldState }) => (
                  <Field className='gap-1' data-invalid={fieldState.invalid}>
                    <FieldLabel>Rate</FieldLabel>
                    <Input
                      min={0}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ''
                            ? undefined
                            : Math.round(Number(e.target.value) * 1000)
                        )
                      }
                      placeholder='0.000'
                      step={0.001}
                      type='number'
                      value={field.value ? field.value / 1000 : ''}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name='defaultBillingCurrency'
                render={({ field, fieldState }) => (
                  <Field className='gap-1' data-invalid={fieldState.invalid}>
                    <FieldLabel>Currency</FieldLabel>
                    <CurrencySelect
                      name='billingCurrency'
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
                control={form.control}
                name='defaultBillingFrequency'
                render={({ field, fieldState }) => (
                  <Field className='gap-1' data-invalid={fieldState.invalid}>
                    <FieldLabel>Frequency</FieldLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {billingFrequencyEnum.enumValues.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
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
