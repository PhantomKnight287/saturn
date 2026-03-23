'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import type z from 'zod'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { createMilestoneSchema } from '../common'

interface CreateMilestoneDialogProps {
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: z.infer<typeof createMilestoneSchema>) => void
  open: boolean
  projectId: string
}

export function CreateMilestoneDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  projectId,
}: CreateMilestoneDialogProps) {
  const form = useForm<z.infer<typeof createMilestoneSchema>>({
    resolver: zodResolver(createMilestoneSchema),
    defaultValues: {
      name: '',
      description: '',
      dueDate: undefined,
      budgetMinutes: undefined,
      budgetAmountCents: undefined,
      projectId,
      currency: 'USD',
    },
  })

  const handleSubmit = (data: z.infer<typeof createMilestoneSchema>) => {
    onSubmit(data)
  }

  return (
    <Dialog
      onOpenChange={(val) => {
        if (!val) {
          form.reset()
        }
        onOpenChange(val)
      }}
      open={open}
    >
      <DialogContent>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <DialogHeader>
            <DialogTitle>Create Milestone</DialogTitle>
            <DialogDescription>
              Add a new milestone to track project progress.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Controller
              control={form.control}
              name='name'
              render={({ field, fieldState }) => (
                <Field
                  className='col-span-full gap-1'
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel>Title</FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => {
                      field.onChange(e.target.value)
                    }}
                    placeholder='e.g. Phase 1 — Core Features'
                    type='text'
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name='description'
              render={({ field, fieldState }) => (
                <Field
                  className='col-span-full gap-1'
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel>Description</FieldLabel>
                  <Textarea
                    {...field}
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => {
                      field.onChange(e.target.value)
                    }}
                    placeholder='What does this milestone cover?'
                    rows={3}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name='dueDate'
              render={({ field, fieldState }) => (
                <Field
                  className='col-span-full gap-1'
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel>Due Date</FieldLabel>
                  <DatePicker {...field} />

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <div className='flex flex-row gap-2'>
              <Controller
                control={form.control}
                name='currency'
                render={({ field, fieldState }) => (
                  <Field
                    className='col-span-full gap-1'
                    data-invalid={fieldState.invalid}
                  >
                    <FieldLabel>Currency</FieldLabel>
                    <CurrencySelect
                      {...field}
                      aria-invalid={fieldState.invalid}
                      onCurrencySelect={(currency) => {
                        field.onChange(currency.code)
                      }}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name='budgetAmountCents'
                render={({ field, fieldState }) => (
                  <Field
                    className='col-span-full gap-1'
                    data-invalid={fieldState.invalid}
                  >
                    <FieldLabel>Budget Amount</FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      onChange={(e) => {
                        const raw = e.target.value
                        if (raw === '') {
                          field.onChange(undefined)
                          return
                        }
                        const value = Number.parseInt(raw, 10)
                        if (!Number.isNaN(value)) {
                          field.onChange(value)
                        }
                      }}
                      placeholder='e.g. 1000'
                      step='1'
                      type='number'
                      value={field.value ?? ''}
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
              name='budgetMinutes'
              render={({ field, fieldState }) => (
                <Field
                  className='col-span-full gap-1'
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel>Time Budget (hours)</FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw === '') {
                        field.onChange(undefined)
                        return
                      }
                      const value = Number.parseInt(raw, 10)
                      if (!Number.isNaN(value)) {
                        field.onChange(value)
                      }
                    }}
                    placeholder='e.g. 100'
                    step='1'
                    type='number'
                    value={field.value ?? ''}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter className='mt-6'>
            <Button
              onClick={() => onOpenChange(false)}
              type='button'
              variant='outline'
            >
              Cancel
            </Button>
            <Button
              disabled={!form.formState.isValid}
              loading={isPending}
              type='submit'
            >
              {isPending ? 'Creating...' : 'Create Milestone'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
