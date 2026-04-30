'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import {
  type ClientInvolvementValue,
  clientInvolvementEntities,
  clientInvolvementEntityLabels,
  defaultClientInvolvement,
} from '@/app/(project)/[org]/[project]/settings/common'
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
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { updateOrgClientInvolvementAction } from '../actions'
import { updateOrgClientInvolvementSchema } from '../common'

type FormValues = z.infer<typeof updateOrgClientInvolvementSchema>

export function ClientApprovalCard({
  organizationId,
  clientInvolvement,
}: {
  organizationId: string
  clientInvolvement: ClientInvolvementValue
}) {
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(updateOrgClientInvolvementSchema),
    defaultValues: {
      organizationId,
      clientInvolvement: clientInvolvement ?? defaultClientInvolvement,
    },
  })

  const { execute, isPending } = useAction(updateOrgClientInvolvementAction, {
    onSuccess() {
      toast.success('Client approval defaults updated')
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to update client approval')
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Approval</CardTitle>
        <CardDescription>
          Workspace defaults for which parts of the workflow require client
          approval. Individual projects can override these.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit((values) => execute(values))}>
        <CardContent>
          <FieldGroup>
            {clientInvolvementEntities.map((entity) => (
              <Controller
                control={form.control}
                key={entity}
                name={`clientInvolvement.${entity}`}
                render={({ field }) => (
                  <Field orientation='horizontal'>
                    <Checkbox
                      checked={field.value === 'on'}
                      id={`org-client-involvement-${entity}`}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true ? 'on' : 'off')
                      }
                    />
                    <div className='flex flex-col gap-0.5'>
                      <FieldLabel htmlFor={`org-client-involvement-${entity}`}>
                        {clientInvolvementEntityLabels[entity].label}
                      </FieldLabel>
                      <FieldDescription>
                        {clientInvolvementEntityLabels[entity].description}
                      </FieldDescription>
                    </div>
                  </Field>
                )}
              />
            ))}
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button
            className='mt-4'
            disabled={!form.formState.isDirty}
            loading={isPending}
            type='submit'
          >
            <Save className='size-4' />
            Save Approval Defaults
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
