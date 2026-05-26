'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RateInput } from '@/components/ui/rate-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { analyticsService } from '@/services/analytics.service'
import { inviteOrgMemberAction } from '../actions'

const formSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['member', 'admin']),
  rate: z.number().optional(),
  currency: z.string(),
  setAsOrgDefault: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  email: '',
  role: 'member',
  rate: undefined,
  currency: '',
  setAsOrgDefault: false,
}

export default function InviteDialog({
  open,
  onOpenChange,
  organizationId,
  defaultMemberRate,
  defaultCurrency,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  defaultMemberRate: number
  defaultCurrency: string
}) {
  const router = useRouter()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const { execute, isPending } = useAction(inviteOrgMemberAction, {
    onSuccess({ input }) {
      toast.success(`Invitation sent to ${input.email}`)
      form.reset(defaultValues)
      onOpenChange(false)
      router.refresh()
      analyticsService.track('member_invited')
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Failed to send invitation')
    },
  })

  const email = form.watch('email')
  const rate = form.watch('rate')
  const currency = form.watch('currency')

  const handleInvite = (data: FormValues) => {
    const resolvedCurrency = data.currency || undefined

    let finalRate = data.rate
    let finalCurrency = resolvedCurrency

    if (finalRate === undefined || !finalCurrency) {
      if (defaultMemberRate > 0 && defaultCurrency) {
        finalRate = finalRate ?? defaultMemberRate
        finalCurrency = finalCurrency ?? defaultCurrency
      } else {
        toast.error(
          'No base rate set. Enter a rate or set an workspace wide default in Settings.'
        )
        return
      }
    }

    execute({
      organizationId,
      email: data.email.trim(),
      role: data.role,
      payRate: finalRate,
      payCurrency: finalCurrency,
      setAsOrgDefault: data.setAsOrgDefault,
    })
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Send an invitation email. They&apos;ll join the workspace once they
            accept.
          </DialogDescription>
        </DialogHeader>
        <form className='space-y-4' onSubmit={form.handleSubmit(handleInvite)}>
          <Controller
            control={form.control}
            name='email'
            render={({ field }) => (
              <div className='space-y-2'>
                <Label>Email address</Label>
                <Input
                  {...field}
                  autoFocus
                  placeholder='name@example.com'
                  type='email'
                />
              </div>
            )}
          />
          <Controller
            control={form.control}
            name='role'
            render={({ field }) => (
              <div className='space-y-2'>
                <Label>Role</Label>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='member'>Member</SelectItem>
                    <SelectItem value='admin'>Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          />
          <div className='space-y-2'>
            <Label>
              Hourly rate
              {defaultMemberRate > 0 && (
                <span className='ml-1 font-normal text-muted-foreground'>
                  (default: {(defaultMemberRate / 100).toFixed(2)})
                </span>
              )}
            </Label>
            <RateInput
              allowEmpty
              currency={currency || undefined}
              frequencies={['hourly']}
              frequency='hourly'
              onCurrencyChange={(c) => form.setValue('currency', c)}
              onFrequencyChange={() => {
                // hourly-only in this flow
              }}
              onValueChange={(v) => form.setValue('rate', v)}
              placeholder={
                defaultMemberRate > 0
                  ? (defaultMemberRate / 100).toFixed(2)
                  : '0.00'
              }
              useFrequencyShorthand
              value={rate}
            />
          </div>
          <Controller
            control={form.control}
            name='setAsOrgDefault'
            render={({ field }) => (
              <div className='flex items-center gap-2'>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
                <Label className='cursor-pointer font-normal'>
                  Set this as the workspace wide default rate
                </Label>
              </div>
            )}
          />
          <div className='flex justify-end gap-2'>
            <Button
              onClick={() => onOpenChange(false)}
              type='button'
              variant='outline'
            >
              Cancel
            </Button>
            <Button disabled={!email?.trim()} loading={isPending} type='submit'>
              <Mail className='size-4' />
              Send Invite
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
