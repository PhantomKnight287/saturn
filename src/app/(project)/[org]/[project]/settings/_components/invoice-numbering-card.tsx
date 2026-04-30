'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { InvoiceNumberTemplateInput } from '@/app/(organization)/[org]/settings/_components/invoice-number-template-input'
import { updateInvoiceNumberTemplateAction } from '@/app/(organization)/[org]/settings/actions'
import { updateInvoiceNumberTemplateSchema } from '@/app/(organization)/[org]/settings/common'
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

type FormValues = z.infer<typeof updateInvoiceNumberTemplateSchema>

export function InvoiceNumberingCard({
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
    resolver: zodResolver(updateInvoiceNumberTemplateSchema),
    defaultValues: {
      organizationId,
      projectId,
      invoiceNumberTemplate: settings.invoiceNumberTemplate,
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
          Override the workspace-level invoice number template for this project
          only.
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
