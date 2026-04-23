'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
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
import { createExpenseAction, updateExpenseAction } from '../actions'
import type { ExpenseCategory, ExpenseWithDetails } from '../types'

const expenseFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.string().min(1, 'Amount is required'),
  currency: z.string().min(1, 'Currency is required'),
  date: z.string().min(1, 'Date is required'),
  categoryId: z.string().min(1, 'Category is required'),
  billable: z.boolean(),
  description: z.string(),
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
    },
  })

  const createAction = useAction(createExpenseAction, {
    onSuccess: () => {
      toast.success('Expense created')
      onOpenChange(false)
      form.reset()
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
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to update expense')
    },
  })

  const isPending = createAction.isPending || updateAction.isPending

  function handleSubmit(data: ExpenseFormValues) {
    const cents = Math.round(Number.parseFloat(data.amount) * 100)
    if (Number.isNaN(cents) || cents <= 0) {
      toast.error('Please enter a valid amount')
      return
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
      })
    }
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
            <Button loading={isPending} type='submit'>
              {editExpense ? 'Update Expense' : 'Log Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
