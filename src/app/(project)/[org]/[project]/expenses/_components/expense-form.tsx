'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileText, Paperclip, X } from 'lucide-react'
import Image from 'next/image'
import { useAction } from 'next-safe-action/hooks'
import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import z from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CurrencySelect } from '@/components/ui/currency-selector'
import DatePicker from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { uploadFile } from '@/lib/upload'
import { createExpenseAction, updateExpenseAction } from '../actions'
import type { ExpenseCategory, ExpenseWithDetails } from '../types'

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024

interface ReceiptState {
  file: File | null
  name: string
  previewUrl: string | null
  type: 'image' | 'pdf'
}

const expenseFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.string().min(1, 'Amount is required'),
  currency: z.string().min(1, 'Currency is required'),
  date: z.string().min(1, 'Date is required'),
  categoryId: z.string().min(1, 'Category is required'),
  billable: z.boolean(),
  description: z.string(),
  receiptMediaId: z.string().nullable(),
})

type ExpenseFormValues = z.infer<typeof expenseFormSchema>

interface ExpenseFormProps {
  categories: ExpenseCategory[]
  defaultCurrency?: string
  editExpense?: ExpenseWithDetails
  onOpenChange: (open: boolean) => void
  open: boolean
  projectId: string
}

export function ExpenseForm({
  open,
  onOpenChange,
  projectId,
  categories,
  editExpense,
  defaultCurrency,
}: ExpenseFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptState | null>(
    editExpense?.receiptMediaId
      ? {
          file: null,
          name: 'Receipt',
          type: 'image',
          previewUrl: `/api/files/${editExpense.receiptMediaId}`,
        }
      : null
  )

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      title: editExpense?.title ?? '',
      amount: editExpense ? (editExpense.amountCents / 100).toFixed(2) : '',
      currency: editExpense?.currency ?? defaultCurrency ?? 'USD',
      date: editExpense
        ? new Date(editExpense.date).toISOString().split('T').at(0)!
        : new Date().toISOString().split('T').at(0)!,
      categoryId: editExpense?.categoryId ?? '',
      billable: editExpense?.billable ?? true,
      description: editExpense?.description ?? '',
      receiptMediaId: editExpense?.receiptMediaId ?? null,
    },
  })

  const createAction = useAction(createExpenseAction, {
    onSuccess: () => {
      toast.success('Expense created')
      onOpenChange(false)
      form.reset()
      cleanupReceipt()
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to create expense')
    },
  })

  const updateAction = useAction(updateExpenseAction, {
    onSuccess: () => {
      toast.success('Expense updated')
      onOpenChange(false)
      cleanupReceipt()
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to update expense')
    },
  })

  function handleFileSelect(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Only images and PDF files are allowed')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 10MB.')
      return
    }

    if (receipt?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(receipt.previewUrl)
    }

    const isPdf = file.type === 'application/pdf'
    const previewUrl = isPdf ? null : URL.createObjectURL(file)
    setReceipt({
      file,
      name: file.name,
      type: isPdf ? 'pdf' : 'image',
      previewUrl,
    })
  }

  function removeReceipt() {
    if (receipt?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(receipt.previewUrl)
    }
    setReceipt(null)
    form.setValue('receiptMediaId', null)
  }

  function cleanupReceipt() {
    if (receipt?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(receipt.previewUrl)
    }
    setReceipt(null)
  }

  async function handleSubmit(data: ExpenseFormValues) {
    const cents = Math.round(Number.parseFloat(data.amount) * 100)
    if (Number.isNaN(cents) || cents <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setSubmitting(true)

    let receiptMediaId = data.receiptMediaId
    if (receipt?.file) {
      try {
        const { id } = await uploadFile(receipt.file, projectId)
        receiptMediaId = id
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Receipt upload failed'
        )
        setSubmitting(false)
        return
      }
    }

    if (editExpense) {
      updateAction.execute({
        expenseId: editExpense.id,
        title: data.title,
        amountCents: cents,
        currency: data.currency,
        date: data.date,
        categoryId: data.categoryId,
        billable: data.billable,
        description: data.description || null,
        receiptMediaId,
      })
    } else {
      createAction.execute({
        projectId,
        title: data.title,
        amountCents: cents,
        currency: data.currency,
        date: data.date,
        categoryId: data.categoryId,
        billable: data.billable,
        description: data.description || undefined,
        receiptMediaId: receiptMediaId ?? undefined,
      })
    }

    setSubmitting(false)
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{editExpense ? 'Edit' : 'Log'} Expense</DialogTitle>
          <DialogDescription>
            {editExpense
              ? 'Update the expense details.'
              : 'Log a project-related expense.'}
          </DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup>
            <Controller
              control={form.control}
              name='title'
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Title</FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    placeholder='e.g. Website design'
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <Controller
                control={form.control}
                name='amount'
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Amount</FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      min='0.01'
                      placeholder='0.00'
                      step='0.01'
                      type='number'
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name='currency'
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Currency</FieldLabel>
                    <CurrencySelect
                      {...field}
                      name='currency'
                      onCurrencySelect={(currency) => {
                        form.setValue('currency', currency.code)
                      }}
                      variant='default'
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
              name='date'
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Date</FieldLabel>
                  <DatePicker
                    disablePastDates={false}
                    onChange={(date) =>
                      field.onChange(date?.toISOString() ?? '')
                    }
                    value={field.value ? new Date(field.value) : undefined}
                  />

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name='categoryId'
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Category</FieldLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder='Select category' />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className='flex items-center gap-2'>
                            {c.color && (
                              <span
                                className='inline-block size-2.5 rounded-full'
                                style={{ backgroundColor: c.color }}
                              />
                            )}
                            {c.name}
                          </div>
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

            <Controller
              control={form.control}
              name='description'
              render={({ field }) => (
                <Field>
                  <FieldLabel>Description</FieldLabel>
                  <Textarea
                    {...field}
                    placeholder='Additional details (optional)'
                    rows={2}
                  />
                </Field>
              )}
            />

            <Field>
              <FieldLabel>Receipt</FieldLabel>
              <input
                accept='image/*,application/pdf'
                className='hidden'
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleFileSelect(file)
                  }
                  e.target.value = ''
                }}
                ref={fileInputRef}
                type='file'
              />
              {receipt ? (
                <div className='flex items-center gap-3 rounded-md border px-3 py-2'>
                  {receipt.type === 'pdf' ? (
                    <div className='flex size-10 shrink-0 items-center justify-center rounded bg-muted'>
                      <FileText className='size-5 text-muted-foreground' />
                    </div>
                  ) : (
                    <Image
                      alt='Receipt preview'
                      className='size-10 shrink-0 rounded object-cover'
                      height={40}
                      src={receipt.previewUrl!}
                      unoptimized
                      width={40}
                    />
                  )}
                  <span className='min-w-0 flex-1 truncate text-sm'>
                    {receipt.name}
                  </span>
                  <Button
                    className='size-6 shrink-0'
                    onClick={removeReceipt}
                    size='icon'
                    type='button'
                    variant='ghost'
                  >
                    <X className='size-3' />
                  </Button>
                </div>
              ) : (
                <button
                  className='flex items-center gap-2 rounded-md border border-dashed px-4 py-3 text-muted-foreground text-sm transition-colors hover:border-primary/50 hover:text-foreground'
                  onClick={() => fileInputRef.current?.click()}
                  type='button'
                >
                  <Paperclip className='size-4' />
                  Attach receipt
                </button>
              )}
            </Field>

            <Controller
              control={form.control}
              name='billable'
              render={({ field }) => (
                <div className='flex items-center gap-2'>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                  <Label
                    className='cursor-pointer font-normal'
                    htmlFor='expense-billable'
                  >
                    Billable
                  </Label>
                </div>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              type='button'
              variant='outline'
            >
              Cancel
            </Button>
            <Button
              loading={
                submitting || createAction.isPending || updateAction.isPending
              }
              type='submit'
            >
              {editExpense ? 'Update Expense' : 'Log Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
