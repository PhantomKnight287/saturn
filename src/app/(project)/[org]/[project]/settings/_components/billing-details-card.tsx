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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { updateProjectBillingDetailsAction } from '../actions'
import { updateProjectBillingDetailsSchema } from '../common'

type FormValues = z.infer<typeof updateProjectBillingDetailsSchema>

export function BillingDetailsCard({
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
    resolver: zodResolver(updateProjectBillingDetailsSchema),
    defaultValues: {
      organizationId,
      projectId,
      invoiceFromName: settings.invoiceFromName ?? '',
      invoiceFromAddress: settings.invoiceFromAddress ?? '',
      invoiceToName: settings.invoiceToName ?? '',
      invoiceToAddress: settings.invoiceToAddress ?? '',
    },
  })

  const { execute, isPending } = useAction(updateProjectBillingDetailsAction, {
    onSuccess() {
      toast.success('Billing details updated')
      form.reset(form.getValues())
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to update billing details')
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Details</CardTitle>
        <CardDescription>
          The default "From" and "Bill To" details used on invoices generated
          for this project.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit((values) => execute(values))}>
        <CardContent className='space-y-6'>
          <div className='space-y-4'>
            <h4 className='font-medium text-muted-foreground text-sm'>From</h4>
            <Controller
              control={form.control}
              name='invoiceFromName'
              render={({ field, fieldState }) => (
                <Field className='gap-1' data-invalid={fieldState.invalid}>
                  <FieldLabel>From Name</FieldLabel>
                  <Input
                    placeholder='Acme Inc.'
                    {...field}
                    value={field.value ?? ''}
                  />
                  <FieldDescription>
                    The sender name shown on this project's invoices.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name='invoiceFromAddress'
              render={({ field, fieldState }) => (
                <Field className='gap-1' data-invalid={fieldState.invalid}>
                  <FieldLabel>From Address</FieldLabel>
                  <Textarea
                    placeholder={'Ticklemore Street, Devon, UK'}
                    rows={3}
                    {...field}
                    value={field.value ?? ''}
                  />
                  <FieldDescription>
                    The sender address shown on this project's invoices.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>
          <div className='space-y-4'>
            <h4 className='font-medium text-muted-foreground text-sm'>
              Bill To
            </h4>
            <Controller
              control={form.control}
              name='invoiceToName'
              render={({ field, fieldState }) => (
                <Field className='gap-1' data-invalid={fieldState.invalid}>
                  <FieldLabel>Bill To Name</FieldLabel>
                  <Input
                    placeholder='Client / company name'
                    {...field}
                    value={field.value ?? ''}
                  />
                  <FieldDescription>
                    The client name billed on this project's invoices.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name='invoiceToAddress'
              render={({ field, fieldState }) => (
                <Field className='gap-1' data-invalid={fieldState.invalid}>
                  <FieldLabel>Bill To Address</FieldLabel>
                  <Textarea
                    placeholder='Ticklemore Street, Devon, UK'
                    rows={3}
                    {...field}
                    value={field.value ?? ''}
                  />
                  <FieldDescription>
                    The client address billed on this project's invoices.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className='mt-4'
            disabled={!form.formState.isDirty}
            loading={isPending}
            type='submit'
          >
            <Save className='size-4' />
            Save Billing Details
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
