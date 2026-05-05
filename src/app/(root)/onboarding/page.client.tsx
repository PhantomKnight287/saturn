'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { titleToSlug } from '@/lib/utils'
import { analyticsService } from '@/services/analytics.service'
import { createNewOrganizationSchema } from './common'

export default function OnboardingPageClient() {
  const form = useForm<z.infer<typeof createNewOrganizationSchema>>({
    resolver: zodResolver(createNewOrganizationSchema),
    defaultValues: {},
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const nameValue = form.watch('name') ?? ''
  const slugPreview = nameValue ? titleToSlug(nameValue).slugified : ''

  async function handleSubmit(
    data: z.infer<typeof createNewOrganizationSchema>
  ) {
    setIsLoading(true)
    try {
      const { slugified, slugifiedWithSuffix } = titleToSlug(data.name)
      const slugVerify = await authClient.organization.checkSlug({
        slug: slugified,
      })

      const organization = await authClient.organization.create({
        name: data.name,
        slug: slugVerify.data?.status ? slugified : slugifiedWithSuffix,
      })
      if (organization.error) {
        toast.error(organization.error.message)
        return
      }
      toast.success('Workspace created successfully')
      analyticsService.track('workspace_created')
      router.replace(`/${organization.data.slug}`)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='relative w-full max-w-md'>
      <div
        aria-hidden
        className='pointer-events-none absolute top-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl'
      />
      <div className='relative flex flex-col items-center gap-6'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <div className='flex flex-col gap-1'>
            <h1 className='font-semibold text-2xl tracking-tight'>
              Welcome to Saturn
            </h1>
            <p className='text-muted-foreground text-sm'>
              Let&apos;s set up your first workspace to get started.
            </p>
          </div>
        </div>

        <Card className='w-full'>
          <CardHeader>
            <CardTitle>Create a workspace</CardTitle>
            <CardDescription>
              A workspace is where you&apos;ll manage clients, projects, and
              invoices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className='space-y-6'
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <FieldGroup>
                <Controller
                  control={form.control}
                  name='name'
                  render={({ field, fieldState }) => (
                    <Field
                      className='col-span-full gap-1'
                      data-invalid={fieldState.invalid}
                    >
                      <FieldLabel>Workspace name</FieldLabel>
                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        autoFocus
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder='Acme Inc.'
                        type='text'
                      />
                      <FieldDescription>
                        {slugPreview ? (
                          <span className='flex flex-wrap items-center gap-1'>
                            Your workspace URL will be
                            <code className='rounded bg-muted px-1.5 py-0.5 font-mono text-foreground text-xs'>
                              {typeof window !== 'undefined'
                                ? window.location.host
                                : ''}
                              /{slugPreview}
                            </code>
                          </span>
                        ) : (
                          "Don't worry, you can change it later."
                        )}
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
              <Button className='w-full' loading={isLoading} type='submit'>
                Create workspace
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className='text-muted-foreground text-xs'>
          You can create more workspaces anytime from your account.
        </p>
      </div>
    </div>
  )
}
