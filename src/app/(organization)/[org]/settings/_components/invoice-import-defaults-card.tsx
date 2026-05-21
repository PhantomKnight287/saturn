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
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateInvoiceImportDefaultsAction } from '../actions'
import type { InvoiceTimeUnit } from '../common'
import { updateInvoiceImportDefaultsSchema } from '../common'

type FormValues = z.infer<typeof updateInvoiceImportDefaultsSchema>

export function InvoiceImportDefaultsCard({
  organizationId,
  projectId,
  invoiceTimeUnit,
}: {
  organizationId: string
  projectId?: string
  invoiceTimeUnit: InvoiceTimeUnit
}) {
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(updateInvoiceImportDefaultsSchema),
    defaultValues: {
      organizationId,
      projectId,
      invoiceTimeUnit,
    },
  })

  const { execute, isPending } = useAction(updateInvoiceImportDefaultsAction, {
    onSuccess() {
      toast.success('Invoice import defaults updated')
      form.reset(form.getValues())
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to update import defaults')
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Import Defaults</CardTitle>
        <CardDescription>
          {projectId
            ? 'Override the workspace default time unit used when importing time entries into invoices for this project.'
            : 'The default time unit used when importing time entries into invoices. You can still switch units per import.'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit((values) => execute(values))}>
        <CardContent>
          <Controller
            control={form.control}
            name='invoiceTimeUnit'
            render={({ field }) => (
              <Field className='gap-1'>
                <FieldLabel>Time unit</FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select time unit' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='hours'>Hours (e.g. 1.5)</SelectItem>
                    <SelectItem value='minutes'>Minutes (e.g. 90)</SelectItem>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Minutes show whole numbers on the invoice; the hourly rate is
                  converted to a per-minute rate. Line totals are unchanged.
                </FieldDescription>
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
