'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { Archive, ArchiveRestore, Check, Plus, X } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import z from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  archiveExpenseCategoryAction,
  createExpenseCategoryAction,
  updateExpenseCategoryAction,
} from '../actions'
import type { ExpenseCategory } from '../types'

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  color: z.string().min(1),
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

function CategoryRow({
  cat,
  onArchive,
  isArchiving,
}: {
  cat: ExpenseCategory
  onArchive: () => void
  isArchiving: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(cat.name)
  const [color, setColor] = useState(cat.color || '#6366f1')

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: cat.name, color: cat.color || '#6366f1' },
  })

  const updateAction = useAction(updateExpenseCategoryAction, {
    onSuccess: () => {
      toast.success('Category updated')
      setEditing(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to update category')
    },
  })

  function handleSave() {
    if (!name.trim()) {
      return
    }
    updateAction.execute({ categoryId: cat.id, name, color })
  }

  function handleCancel() {
    setName(cat.name)
    setColor(cat.color || '#6366f1')
    setEditing(false)
  }

  if (editing) {
    return (
      <div className='flex items-center gap-2 rounded-md border border-primary/30 bg-muted/30 px-3 py-2'>
        <form
          className='flex w-full flex-row items-center gap-2'
          onSubmit={form.handleSubmit(handleSave)}
        >
          <FieldGroup className='flex-row items-center gap-2'>
            <Controller
              control={form.control}
              name='color'
              render={({ field, fieldState }) => (
                <Field
                  className='col-span-full gap-1'
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel>Color</FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    autoFocus
                    onChange={(e) => {
                      field.onChange(e.target.value)
                    }}
                    type='color'
                  />
                  <FieldDescription>
                    The color of your category.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name='name'
              render={({ field, fieldState }) => (
                <Field
                  className='col-span-full gap-1'
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel>Name</FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    autoFocus
                    onChange={(e) => {
                      field.onChange(e.target.value)
                    }}
                    placeholder='My Category'
                  />
                  <FieldDescription>
                    The name of your category.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          <Button
            className='size-7'
            disabled={updateAction.isPending || !name.trim()}
            onClick={handleSave}
            size='icon'
            variant='ghost'
          >
            <Check className='size-3.5' />
          </Button>
          <Button
            className='size-7'
            onClick={handleCancel}
            size='icon'
            variant='ghost'
          >
            <X className='size-3.5' />
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className='group flex items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-muted/50'>
      <div className='flex items-center gap-2'>
        <span
          className='inline-block size-3 rounded-full'
          style={{ backgroundColor: cat.color || '#6366f1' }}
        />
        <span className='text-sm'>{cat.name}</span>
      </div>
      <div className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
        <Button
          className='h-7 px-2 text-xs'
          onClick={() => setEditing(true)}
          variant='ghost'
        >
          Edit
        </Button>
        <Button
          className='size-7 text-muted-foreground'
          disabled={isArchiving}
          onClick={onArchive}
          size='icon'
          variant='ghost'
        >
          <Archive className='size-3.5' />
        </Button>
      </div>
    </div>
  )
}

interface CategoryManagerProps {
  categories: ExpenseCategory[]
  onOpenChange: (open: boolean) => void
  open: boolean
  organizationId: string
}

export function CategoryManager({
  open,
  onOpenChange,
  categories,
  organizationId,
}: CategoryManagerProps) {
  const [showArchived, setShowArchived] = useState(false)
  const router = useRouter()
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '', color: '#6366f1' },
  })

  const createAction = useAction(createExpenseCategoryAction, {
    onSuccess: () => {
      toast.success('Category created')
      form.reset({ name: '', color: '#6366f1' })
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to create category')
    },
  })

  const archiveAction = useAction(archiveExpenseCategoryAction, {
    onSuccess: () => {
      toast.success('Category updated')
      router.refresh()
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? 'Failed to update category'),
  })

  function handleCreate(data: CategoryFormValues) {
    createAction.execute({
      organizationId,
      name: data.name,
      color: data.color,
    })
  }

  const activeCategories = categories.filter((c) => !c.isArchived)
  const archivedCategories = categories.filter((c) => c.isArchived)

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Expense Categories</DialogTitle>
          <DialogDescription>
            Manage expense categories for your organization.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3'>
          {activeCategories.length > 0 && (
            <div className='space-y-1.5'>
              {activeCategories.map((cat) => (
                <CategoryRow
                  cat={cat}
                  isArchiving={archiveAction.isPending}
                  key={cat.id}
                  onArchive={() =>
                    archiveAction.execute({ categoryId: cat.id })
                  }
                />
              ))}
            </div>
          )}

          {activeCategories.length === 0 && (
            <p className='py-4 text-center text-muted-foreground text-sm'>
              No categories yet. Add one below.
            </p>
          )}

          {archivedCategories.length > 0 && (
            <>
              <Button
                className='w-full text-muted-foreground text-xs'
                onClick={() => setShowArchived(!showArchived)}
                variant='ghost'
              >
                {showArchived ? 'Hide' : 'Show'} archived (
                {archivedCategories.length})
              </Button>
              {showArchived && (
                <div className='space-y-1.5'>
                  {archivedCategories.map((cat) => (
                    <div
                      className='flex items-center justify-between rounded-md border border-dashed px-3 py-2 opacity-60'
                      key={cat.id}
                    >
                      <div className='flex items-center gap-2'>
                        <span
                          className='inline-block size-3 rounded-full'
                          style={{
                            backgroundColor: cat.color || '#6366f1',
                          }}
                        />
                        <span className='text-sm'>{cat.name}</span>
                        <Badge className='text-xs' variant='outline'>
                          Archived
                        </Badge>
                      </div>
                      <Button
                        className='size-7'
                        disabled={archiveAction.isPending}
                        onClick={() =>
                          archiveAction.execute({ categoryId: cat.id })
                        }
                        size='icon'
                        variant='ghost'
                      >
                        <ArchiveRestore className='size-3.5' />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <form
          className='flex items-center gap-2 border-t pt-3'
          onSubmit={form.handleSubmit(handleCreate)}
        >
          <Controller
            control={form.control}
            name='color'
            render={({ field }) => (
              <Input
                {...field}
                className='h-9 w-12 cursor-pointer border-none p-1'
                type='color'
              />
            )}
          />
          <Controller
            control={form.control}
            name='name'
            render={({ field, fieldState }) => (
              <Field className='flex-1' data-invalid={fieldState.invalid}>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  placeholder='New category name'
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Button disabled={createAction.isPending} type='submit'>
            <Plus className='size-4' />
            Add
          </Button>
        </form>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant='outline'>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
