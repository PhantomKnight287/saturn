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
import { CurrencySelect } from '@/components/ui/currency-selector'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  rateInput: z.string(),
  currency: z.string(),
  setAsOrgDefault: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  email: '',
  role: 'member',
  rateInput: '',
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

  const handleInvite = (data: FormValues) => {
    const parsedRate = data.rateInput
      ? Math.round(Number(data.rateInput) * 100)
      : undefined
    const resolvedCurrency = data.currency || undefined

    let finalRate = parsedRate
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
      hourlyRate: finalRate,
      currency: finalCurrency,
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
          <div className='grid grid-cols-2 gap-3'>
            <Controller
              control={form.control}
              name='rateInput'
              render={({ field }) => (
                <div className='space-y-2'>
                  <Label>
                    Hourly rate
                    {defaultMemberRate > 0 && (
                      <span className='ml-1 font-normal text-muted-foreground'>
                        (default: {(defaultMemberRate / 100).toFixed(2)})
                      </span>
                    )}
                  </Label>
                  <Input
                    {...field}
                    min='0'
                    placeholder={
                      defaultMemberRate > 0
                        ? (defaultMemberRate / 100).toFixed(2)
                        : '0.00'
                    }
                    step='0.01'
                    type='number'
                  />
                </div>
              )}
            />
            <Controller
              control={form.control}
              name='currency'
              render={({ field }) => (
                <div className='space-y-2'>
                  <Label>Currency</Label>
                  <CurrencySelect
                    name='currency'
                    onValueChange={field.onChange}
                    placeholder={defaultCurrency || 'Select'}
                    value={field.value}
                    variant='default'
                  />
                </div>
              )}
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
