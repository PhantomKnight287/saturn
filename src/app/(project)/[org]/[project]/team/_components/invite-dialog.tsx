'use client'

import { useRouter } from '@bprogress/next/app'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Mail, Search } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useId, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { authClient } from '@/lib/auth-client'
import {
  addExistingMemberToProjectAction,
  linkInvitationToProjectAction,
} from '../actions'
import type { OrgMember, ProjectMember } from '../types'

const formSchema = z.object({
  email: z.string(),
  role: z.enum(['member', 'admin', 'client']),
  rate: z.number().optional(),
  currency: z.string(),
  setAsOrgDefault: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

export default function InviteDialog({
  open,
  onOpenChange,
  role,
  organizationId,
  projectId,
  label,
  orgMembers,
  projectMembers,
  defaultMemberRate,
  defaultCurrency,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: 'member' | 'admin' | 'client'
  organizationId: string
  projectId: string
  label: string
  orgMembers?: OrgMember[]
  projectMembers?: ProjectMember[]
  defaultMemberRate?: number
  defaultCurrency?: string
}) {
  const router = useRouter()
  const setOrgDefaultId = useId()
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const showRoleSelect = role !== 'client'
  const showRateFields = role !== 'client'

  const defaultValues = useMemo<FormValues>(
    () => ({
      email: '',
      role,
      rate: undefined,
      currency: '',
      setAsOrgDefault: false,
    }),
    [role]
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const email = form.watch('email')
  const rate = form.watch('rate')
  const currency = form.watch('currency')

  const { execute: executeLinkInvitation } = useAction(
    linkInvitationToProjectAction
  )

  const { executeAsync: executeAddExisting } = useAction(
    addExistingMemberToProjectAction
  )

  // Filter org members: exclude those already on the project
  const projectMemberIds = useMemo(
    () => new Set((projectMembers ?? []).map((m) => m.memberId)),
    [projectMembers]
  )

  const availableMembers = useMemo(() => {
    if (!orgMembers) {
      return []
    }
    return orgMembers.filter(
      (m) =>
        !projectMemberIds.has(m.memberId) &&
        (search === '' ||
          m.userName.toLowerCase().includes(search.toLowerCase()) ||
          m.userEmail.toLowerCase().includes(search.toLowerCase()))
    )
  }, [orgMembers, projectMemberIds, search])

  const resolveRate = (data: FormValues) => {
    const resolvedCurrency = data.currency || undefined

    let finalRate = data.rate
    let finalCurrency = resolvedCurrency

    if (finalRate === undefined || !finalCurrency) {
      if (defaultMemberRate && defaultMemberRate > 0 && defaultCurrency) {
        finalRate = finalRate ?? defaultMemberRate
        finalCurrency = finalCurrency ?? defaultCurrency
      } else {
        toast.error(
          'No base rate set. Enter a rate or set an workspace wide default in Settings.'
        )
        return null
      }
    }

    return { payRate: finalRate, payCurrency: finalCurrency }
  }

  const handleSelectMember = (member: OrgMember) => {
    setSelectedMember(member)
    form.setValue('email', member.userEmail)
  }

  const resetAndClose = () => {
    form.reset(defaultValues)
    setSearch('')
    setSelectedMember(null)
    setShowEmailForm(false)
    onOpenChange(false)
    router.refresh()
  }

  const handleAddSelected = async (data: FormValues) => {
    if (!selectedMember) {
      return
    }

    let rateData: { payRate: number; payCurrency: string } | undefined
    if (showRateFields) {
      const resolved = resolveRate(data)
      if (!resolved) {
        return
      }
      rateData = resolved
    }

    setIsInviting(true)
    try {
      const result = await executeAddExisting({
        email: selectedMember.userEmail,
        projectId,
        organizationId,
        type: role === 'client' ? 'client' : 'member',
        ...rateData,
        setAsOrgDefault: data.setAsOrgDefault,
      })
      if (result?.serverError) {
        toast.error(result.serverError)
      } else {
        toast.success(`${selectedMember.userName} added to project`)
        resetAndClose()
      }
    } catch {
      toast.error('Failed to add member')
    } finally {
      setIsInviting(false)
    }
  }

  const handleInviteByEmail = async (data: FormValues) => {
    const trimmedEmail = data.email.trim()
    if (!trimmedEmail) {
      return
    }

    let rateData: { payRate: number; payCurrency: string } | undefined
    if (showRateFields) {
      const resolved = resolveRate(data)
      if (!resolved) {
        return
      }
      rateData = resolved
    }

    setIsInviting(true)
    try {
      const result = await authClient.organization.inviteMember({
        email: trimmedEmail,
        role: data.role as 'member' | 'admin',
        organizationId,
      })
      if (result.error) {
        const msg = result.error.message ?? ''
        if (msg.toLowerCase().includes('already')) {
          const addResult = await executeAddExisting({
            email: trimmedEmail,
            projectId,
            organizationId,
            type: role === 'client' ? 'client' : 'member',
            ...rateData,
            setAsOrgDefault: data.setAsOrgDefault,
          })
          if (addResult?.serverError) {
            toast.error(addResult.serverError)
          } else {
            toast.success(`${trimmedEmail} added to project`)
            resetAndClose()
          }
        } else {
          toast.error(msg || 'Failed to send invitation')
        }
      } else {
        const invitationId = result.data?.id
        if (invitationId) {
          executeLinkInvitation({
            invitationId,
            projectId,
            type: role === 'client' ? 'client' : 'member',
          })
        }
        toast.success(`Invitation sent to ${trimmedEmail}`)
        resetAndClose()
      }
    } catch {
      toast.error('Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const showOrgList = role !== 'client' && orgMembers && orgMembers.length > 0

  const rateAndDefaultFields = (
    <>
      <div className='space-y-2'>
        <Label>
          Hourly rate
          {defaultMemberRate !== undefined &&
            defaultMemberRate !== null &&
            defaultMemberRate > 0 && (
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
            defaultMemberRate && defaultMemberRate > 0
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
              id={setOrgDefaultId}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            <Label
              className='cursor-pointer font-normal'
              htmlFor={setOrgDefaultId}
            >
              Set this as the workspace wide default rate
            </Label>
          </div>
        )}
      />
    </>
  )

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {selectedMember
              ? `Add ${selectedMember.userName}`
              : `Invite ${label}`}
          </DialogTitle>
          <DialogDescription>
            {showOrgList && !selectedMember
              ? 'Select an existing workspace member or invite someone new by email.'
              : `They'll join the workspace and be assigned to this project.`}
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          {showOrgList && !selectedMember && !showEmailForm ? (
            <>
              <div className='relative'>
                <Search className='absolute top-2.5 left-3 size-4 text-muted-foreground' />
                <Input
                  autoFocus
                  className='pl-9'
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search members or type an email...'
                  value={search}
                />
              </div>

              {availableMembers.length > 0 && (
                <div className='max-h-48 overflow-y-auto'>
                  <div className='space-y-1'>
                    {availableMembers.map((m) => (
                      <button
                        className='group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent'
                        key={m.memberId}
                        onClick={() => handleSelectMember(m)}
                        type='button'
                      >
                        <Checkbox
                          aria-hidden
                          checked={false}
                          className='pointer-events-none shrink-0 group-hover:border-primary'
                          tabIndex={-1}
                        />
                        <Avatar className='size-7'>
                          <AvatarImage
                            alt={m.userName}
                            src={m.userImage ?? ''}
                          />
                          <AvatarFallback className='text-xs'>
                            {m.userName.substring(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-1.5'>
                            <span className='truncate font-medium text-sm'>
                              {m.userName}
                            </span>
                            <Badge
                              className='shrink-0 text-xs capitalize'
                              variant='outline'
                            >
                              {m.role}
                            </Badge>
                          </div>
                          <div className='truncate text-muted-foreground text-xs'>
                            {m.userEmail}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {availableMembers.length === 0 && search && (
                <div className='space-y-3 rounded-md border border-dashed p-4 text-center'>
                  <p className='text-muted-foreground text-sm'>
                    No matching members found
                  </p>
                  {search.includes('@') && (
                    <Button
                      onClick={() => {
                        form.setValue('email', search)
                        setSelectedMember(null)
                        setSearch('')
                        setShowEmailForm(true)
                      }}
                      variant='outline'
                    >
                      <Mail className='size-4' />
                      Invite {search} by email
                    </Button>
                  )}
                </div>
              )}

              {!search && (
                <div className='pt-1'>
                  <Button
                    className='w-full'
                    onClick={() => {
                      setSelectedMember(null)
                      form.setValue('email', '')
                      setSearch('')
                      setShowEmailForm(true)
                    }}
                    variant='outline'
                  >
                    <Mail className='size-4' />
                    Invite someone new by email
                  </Button>
                </div>
              )}
            </>
          ) : selectedMember ? (
            /* Selected org member - show rate fields + confirm */
            <form
              className='space-y-4'
              onSubmit={form.handleSubmit(handleAddSelected)}
            >
              <div className='flex items-center gap-3 rounded-md border bg-muted/50 p-3'>
                <Avatar className='size-9'>
                  <AvatarImage
                    alt={selectedMember.userName}
                    src={selectedMember.userImage ?? ''}
                  />
                  <AvatarFallback>
                    {selectedMember.userName.substring(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className='min-w-0 flex-1'>
                  <div className='font-medium text-sm'>
                    {selectedMember.userName}
                  </div>
                  <div className='truncate text-muted-foreground text-xs'>
                    {selectedMember.userEmail}
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setSelectedMember(null)
                    form.setValue('email', '')
                    setSearch('')
                  }}
                  type='button'
                  variant='ghost'
                >
                  Change
                </Button>
              </div>

              {showRateFields && rateAndDefaultFields}

              <div className='flex justify-end gap-2'>
                <Button
                  onClick={() => onOpenChange(false)}
                  type='button'
                  variant='outline'
                >
                  Cancel
                </Button>
                <Button loading={isInviting} type='submit'>
                  <Check className='size-4' />
                  Add to Project
                </Button>
              </div>
            </form>
          ) : (
            /* Email-only flow (clients or fallback) */
            <form
              className='space-y-4'
              onSubmit={form.handleSubmit(handleInviteByEmail)}
            >
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
              {showRoleSelect && (
                <Controller
                  control={form.control}
                  name='role'
                  render={({ field }) => (
                    <div className='space-y-2'>
                      <Label>Role</Label>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
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
              )}
              {showRateFields && rateAndDefaultFields}
              <div className='flex justify-end gap-2'>
                {showOrgList && (
                  <Button
                    className='mr-auto'
                    onClick={() => {
                      setSearch('')
                      form.setValue('email', '')
                      setShowEmailForm(false)
                    }}
                    type='button'
                    variant={'outline'}
                  >
                    Back
                  </Button>
                )}
                <Button
                  onClick={() => onOpenChange(false)}
                  type='button'
                  variant='outline'
                >
                  Cancel
                </Button>
                <Button
                  disabled={!email?.trim()}
                  loading={isInviting}
                  type='submit'
                >
                  <Mail className='size-4' />
                  Send Invite
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
