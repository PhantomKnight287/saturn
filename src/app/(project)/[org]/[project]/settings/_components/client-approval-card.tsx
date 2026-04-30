'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import type { projectsService } from '@/app/api/projects/service'
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
import { updateClientInvolvementLevelAction } from '../actions'
import {
  clientInvolvementEntities,
  clientInvolvementEntityLabels,
  clientInvolvementProjectSchema,
  defaultClientInvolvement,
} from '../common'

type FormValues = z.infer<typeof clientInvolvementProjectSchema>

export function ClientApprovalCard({
  projectId,
  organizationId,
  settings,
}: {
  projectId: string
  organizationId: string
  settings: Awaited<ReturnType<typeof projectsService.getSettings>>
}) {
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(clientInvolvementProjectSchema),
    defaultValues: {
      clientInvolvement: settings.clientInvolvement ?? defaultClientInvolvement,
      projectId,
      organizationId,
    },
  })

  const { execute, isPending } = useAction(updateClientInvolvementLevelAction, {
    onSuccess() {
      router.refresh()
      toast.success('Updated client involvement level')
    },
    onError({ error }) {
      toast.error(
        error.serverError ?? 'Failed to update client involvement level'
      )
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Approval</CardTitle>
        <CardDescription>
          Choose which parts of the workflow require client approval. Turn off
          the ones your client isn't involved in — those steps will be handled
          internally instead.
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
                      id={`client-involvement-${entity}`}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true ? 'on' : 'off')
                      }
                    />
                    <div className='flex flex-col gap-0.5'>
                      <FieldLabel htmlFor={`client-involvement-${entity}`}>
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
            Save Approval Settings
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
