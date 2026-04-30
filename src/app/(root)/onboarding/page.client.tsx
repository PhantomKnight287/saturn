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
import { CurrencySelect } from '@/components/ui/currency-selector'
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
    defaultValues: {
      currency: 'USD',
    },
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

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
        metadata: {
          currency: data.currency,
        },
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
    <Card className='w-full max-w-3xl'>
      <CardHeader>
        <CardTitle>Create a new workspace</CardTitle>
        <CardDescription>
          Create a new workspace to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                    onChange={(e) => {
                      field.onChange(e.target.value)
                    }}
                    placeholder='Enter your workspace name'
                    type='text'
                  />
                  <FieldDescription>
                    This is the name of your workspace. Don&apos;t worry, you
                    can change it later.
                  </FieldDescription>
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
                <Field
                  className='col-span-full gap-1'
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel>Currency</FieldLabel>
                  <CurrencySelect
                    {...field}
                    name='currency'
                    onCurrencySelect={(currency) => {
                      form.setValue('currency', currency.code)
                    }}
                  />
                  <FieldDescription>
                    The currency your workspace will use for clients. Don&apos;t
                    worry, you can choose different currencies for different
                    clients and invoices.
                  </FieldDescription>

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          <Button loading={isLoading} type='submit'>
            Create workspace
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
