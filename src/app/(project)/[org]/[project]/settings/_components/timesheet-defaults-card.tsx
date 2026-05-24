'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
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
          Set the default hourly rate and currency for this project. These
          override the workspace-level defaults.
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
