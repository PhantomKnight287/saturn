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
import { updateTimesheetDefaultsAction } from '../actions'
import {
  type TimesheetDuration,
  updateTimesheetDefaultsSchema,
} from '../common'

type FormValues = z.infer<typeof updateTimesheetDefaultsSchema>

export function TimesheetDefaultsCard({
  organizationId,
  defaultMemberRate,
  defaultCurrency,
  defaultTimesheetDuration,
}: {
  organizationId: string
  defaultMemberRate: number
  defaultCurrency: string
  defaultTimesheetDuration: TimesheetDuration
}) {
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(updateTimesheetDefaultsSchema),
    defaultValues: {
      organizationId,
      defaultMemberRate,
      defaultCurrency,
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
        <CardContent>
          <div className='grid grid-cols-2 gap-4'>
            <Controller
              control={form.control}
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
              control={form.control}
              name='defaultMemberRate'
              render={({ field, fieldState }) => (
                <Field className='gap-1' data-invalid={fieldState.invalid}>
                  <FieldLabel>Default Hourly Rate</FieldLabel>
                  <Input
                    min={0}
                    onChange={(e) =>
                      field.onChange(Math.round(Number(e.target.value) * 100))
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
