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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { renameOrganizationAction } from '../actions'
import { renameOrganizationSchema } from '../common'

type FormValues = z.infer<typeof renameOrganizationSchema>

export function GeneralCard({
  organization,
  orgSlug,
}: {
  organization: { id: string; name: string; slug: string }
  orgSlug: string
}) {
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(renameOrganizationSchema),
    defaultValues: {
      organizationId: organization.id,
      name: organization.name,
      slug: organization.slug,
    },
  })

  const [slugAcknowledged, setSlugAcknowledged] = useState(false)
  const watchedSlug = form.watch('slug')
  const slugChanged = watchedSlug !== organization.slug

  const { execute, isPending } = useAction(renameOrganizationAction, {
    onSuccess({ data }) {
      toast.success('Workspace updated')
      if (data?.slug && data.slug !== orgSlug) {
        router.push(`/${data.slug}/settings`)
      } else {
        router.refresh()
      }
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to update workspace')
    },
  })

  function onSubmit(data: FormValues) {
    execute({
      organizationId: data.organizationId,
      name: data.name.trim(),
      slug: data.slug.trim(),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>
          Manage your workspace name and URL slug.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent>
          <FieldGroup>
            <Controller
              control={form.control}
              name='name'
              render={({ field, fieldState }) => (
                <Field className='gap-1' data-invalid={fieldState.invalid}>
                  <FieldLabel>Workspace Name</FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    placeholder='My Workspace'
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
                      if (newSlug === organization.slug) {
                        setSlugAcknowledged(false)
                      }
                    }}
                    placeholder='my-workspace'
                  />
                  <FieldDescription>
                    Your workspace will be accessible at /{field.value}
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
                    id='org-slug-ack'
                    onCheckedChange={(checked) =>
                      setSlugAcknowledged(checked === true)
                    }
                  />
                  <label
                    className='text-sm leading-snug'
                    htmlFor='org-slug-ack'
                  >
                    I acknowledge that by changing the slug of workspace, links
                    in previously sent emails and notifications will stop
                    working, as they still point to{' '}
                    <span className='font-medium'>/{organization.slug}</span>.
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
