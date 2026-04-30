import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { type Dispatch, type SetStateAction, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type z from 'zod'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogClose,
  DialogContent,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { createProjectSchema } from '../common'

export default function CreateProjectDialog({
  dialogOpen,
  setDialogOpen,
  orgSlug,
  organizationId,
  handleSubmit,
  isPending,
}: {
  dialogOpen: boolean
  setDialogOpen: Dispatch<SetStateAction<boolean>>
  organizationId: string
  orgSlug: string
  handleSubmit: (values: z.infer<typeof createProjectSchema>) => void
  isPending: boolean
}) {
  const form = useForm<z.infer<typeof createProjectSchema>>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      organizationId,
      orgSlug,
      name: '',
      description: '',
    },
  })

  useEffect(() => {
    if (!dialogOpen) {
      form.reset({
        organizationId,
        orgSlug,
        name: '',
        description: '',
        dueDate: undefined,
      })
    }
  }, [dialogOpen, form, organizationId, orgSlug])

  return (
    <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new project</DialogTitle>
        </DialogHeader>
        <form className='space-y-4' onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup>
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
                    autoComplete='off'
                    autoFocus
                    name='project-title'
                    onChange={(e) => {
                      field.onChange(e.target.value)
                    }}
                    placeholder='My Project'
                  />
                  <FieldDescription>The name of your project.</FieldDescription>
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
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    autoComplete='off'
                    name='project-description'
                    placeholder='Optional description'
                  />
                  <FieldDescription>
                    A brief description of what this project is about.
                  </FieldDescription>
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                        size='lg'
                        type='button'
                        variant='outline'
                      >
                        <CalendarIcon className='size-4' />
                        {field.value
                          ? format(field.value, 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align='start' className='w-auto p-0'>
                      <Calendar
                        disabled={(date) => date < new Date()}
                        mode='single'
                        onSelect={field.onChange}
                        selected={field.value}
                      />
                    </PopoverContent>
                  </Popover>
                  <FieldDescription>
                    Optional deadline for this project.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button loading={isPending} type='submit'>
              Create Project
            </Button>
            <DialogClose asChild>
              <Button type='button' variant='outline'>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
