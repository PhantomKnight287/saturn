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
import { updateInvoiceNumberTemplateAction } from '../actions'
import { updateInvoiceNumberTemplateSchema } from '../common'
import { InvoiceNumberTemplateInput } from './invoice-number-template-input'

type FormValues = z.infer<typeof updateInvoiceNumberTemplateSchema>

export function InvoiceNumberingCard({
  organizationId,
  invoiceNumberTemplate,
}: {
  organizationId: string
  invoiceNumberTemplate: string
}) {
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(updateInvoiceNumberTemplateSchema),
    defaultValues: {
      organizationId,
      invoiceNumberTemplate,
    },
  })

  const { execute, isPending } = useAction(updateInvoiceNumberTemplateAction, {
    onSuccess() {
      toast.success('Invoice number template updated')
      form.reset(form.getValues())
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to update invoice template')
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Numbering</CardTitle>
        <CardDescription>
          Define the template used to generate invoice numbers. Add variables
          like sequence, date parts, or time, and mix them with your own prefix
          and separators.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit((values) => execute(values))}>
        <CardContent>
          <Controller
            control={form.control}
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
            disabled={!form.formState.isDirty}
            loading={isPending}
            type='submit'
          >
            <Save className='size-4' />
            Save Template
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
