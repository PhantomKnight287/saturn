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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { updateInvoiceFromDetailsAction } from '../actions'
import { updateInvoiceFromDetailsSchema } from '../common'

type FormValues = z.infer<typeof updateInvoiceFromDetailsSchema>

export function InvoiceFromCard({
  organizationId,
  invoiceFromName,
  invoiceFromAddress,
}: {
  organizationId: string
  invoiceFromName: string | null
  invoiceFromAddress: string | null
}) {
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(updateInvoiceFromDetailsSchema),
    defaultValues: {
      organizationId,
      invoiceFromName: invoiceFromName ?? '',
      invoiceFromAddress: invoiceFromAddress ?? '',
    },
  })

  const { execute, isPending } = useAction(updateInvoiceFromDetailsAction, {
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
          The default "From" details shown on invoices across this workspace.
          Projects can override these.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit((values) => execute(values))}>
        <CardContent className='space-y-4'>
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
                  The sender name shown on invoices.
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
                  placeholder='123 Main St&#10;Springfield, IL 62701'
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                />
                <FieldDescription>
                  The sender address shown on invoices.
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
            Save Billing Details
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
