'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import DatePicker from '@/components/ui/date-picker'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { renameProjectAction } from '../actions'
import { renameProjectSchema } from '../common'

type RenameFormValues = z.infer<typeof renameProjectSchema>

export function GeneralCard({
  project,
  organizationId,
  orgSlug,
}: {
  project: { id: string; name: string; slug: string; dueDate: Date | null }
  organizationId: string
  orgSlug: string
}) {
  const router = useRouter()

  const form = useForm<RenameFormValues>({
    resolver: zodResolver(renameProjectSchema),
    defaultValues: {
      projectId: project.id,
      organizationId,
      name: project.name,
      slug: project.slug,
      dueDate: project.dueDate ?? undefined,
    },
  })

  const [slugAcknowledged, setSlugAcknowledged] = useState(false)
  const watchedSlug = form.watch('slug')
  const slugChanged = watchedSlug !== project.slug

  const { execute, isPending } = useAction(renameProjectAction, {
    onSuccess({ data }) {
      toast.success('Project updated')
      if (data?.slug && data.slug !== project.slug) {
        router.replace(`/${orgSlug}/${data.slug}/settings`)
      } else {
        router.refresh()
      }
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to update project')
    },
  })

  function onSubmit(data: RenameFormValues) {
    execute({
      projectId: data.projectId,
      organizationId: data.organizationId,
      name: data.name.trim(),
      slug: data.slug.trim(),
      dueDate: data.dueDate,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>
          Manage your project name, URL slug and due date.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent>
          <FieldGroup className='gap-4'>
            <Controller
              control={form.control}
              name='name'
              render={({ field, fieldState }) => (
                <Field className='gap-1' data-invalid={fieldState.invalid}>
                  <FieldLabel>Project Name</FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    placeholder='My Project'
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name='slug'
              render={({ field, fieldState }) => (
                <Field className='gap-1' data-invalid={fieldState.invalid}>
                  <FieldLabel>URL Slug</FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => {
                      const newSlug = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, '')
                      field.onChange(newSlug)
                      if (newSlug === project.slug) {
                        setSlugAcknowledged(false)
                      }
                    }}
                    placeholder='my-project'
                  />
                  <FieldDescription>
                    Your project will be accessible at /{orgSlug}/{field.value}
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
                <Field className='gap-1' data-invalid={fieldState.invalid}>
                  <FieldLabel>Due Date</FieldLabel>
                  <DatePicker
                    onChange={(date) => field.onChange(date ?? undefined)}
                    value={field.value ?? undefined}
                  />
                  <FieldDescription>
                    Optional target date for project completion.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            {slugChanged && (
              <div className='rounded-lg border border-amber-500/50 bg-amber-500/5 p-3'>
                <div className='flex items-start gap-3'>
                  <Checkbox
                    checked={slugAcknowledged}
                    id='slug-ack'
                    onCheckedChange={(checked) =>
                      setSlugAcknowledged(checked === true)
                    }
                  />
                  <label className='text-sm leading-snug' htmlFor='slug-ack'>
                    I acknowledge that by changing the slug of this project,
                    links in previously sent emails and notifications will stop
                    working, as they still point to{' '}
                    <span className='font-medium'>
                      /{orgSlug}/{project.slug}
                    </span>
                    .
                  </label>
                </div>
              </div>
            )}
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button
            className='mt-4'
            disabled={
              !form.formState.isDirty || (slugChanged && !slugAcknowledged)
            }
            loading={isPending}
            type='submit'
          >
            <Save className='size-4' />
            Save Changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
