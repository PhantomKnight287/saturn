'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CurrencySelect } from '@/components/ui/currency-selector'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { setMemberRateAction, setProjectBudgetAction } from '../actions'
import {
  type MemberRateFormValues,
  memberRateFormSchema,
  type ProjectBudgetFormValues,
  projectBudgetFormSchema,
} from '../common'
import type { MemberRate, ProjectMember } from '../types'

interface MemberRatesDialogProps {
  defaultCurrency?: string
  existingRates: MemberRate[]
  onOpenChange: (open: boolean) => void
  open: boolean
  projectId: string
  projectMembers: ProjectMember[]
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

function getCurrentRate(
  rates: MemberRate[],
  memberId: string
): MemberRate | undefined {
  const today = new Date()
  return rates.find(
    (r) => r.memberId === memberId && new Date(r.effectiveFrom) <= today
  )
}

export function MemberRatesDialog({
  open,
  onOpenChange,
  projectMembers,
  projectId,
  existingRates,
  defaultCurrency,
}: MemberRatesDialogProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null)

  const ids = useId()

  const rateForm = useForm<MemberRateFormValues>({
    resolver: zodResolver(memberRateFormSchema),
    defaultValues: {
      memberId: '',
      hourlyRate: '',
      currency: defaultCurrency ?? 'USD',
      effectiveFrom: new Date().toISOString().split('T').at(0)!,
      isProjectSpecific: true,
    },
  })

  const budgetForm = useForm<ProjectBudgetFormValues>({
    resolver: zodResolver(projectBudgetFormSchema),
    defaultValues: {
      budgetHours: '',
      alertThreshold: 80,
    },
  })

  const setRateAction = useAction(setMemberRateAction, {
    onSuccess: () => {
      toast.success('Rate saved')
      rateForm.reset({
        memberId: '',
        hourlyRate: '',
        currency: 'USD',
        effectiveFrom: new Date().toISOString().split('T').at(0)!,
        isProjectSpecific: true,
      })
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to save rate')
    },
  })

  const setBudgetAction = useAction(setProjectBudgetAction, {
    onSuccess: () => {
      toast.success('Budget updated')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to update budget')
    },
  })

  function handleSaveRate(values: MemberRateFormValues) {
    const rateCents = Math.round(Number.parseFloat(values.hourlyRate) * 100)
    if (Number.isNaN(rateCents) || rateCents <= 0) {
      toast.error('Enter a valid hourly rate')
      return
    }

    setRateAction.execute({
      memberId: values.memberId,
      projectId: values.isProjectSpecific ? projectId : null,
      hourlyRate: rateCents,
      currency: values.currency,
      effectiveFrom: values.effectiveFrom,
    })
  }

  function handleSaveBudget(values: ProjectBudgetFormValues) {
    const totalMinutes = Math.round(Number.parseFloat(values.budgetHours) * 60)

    if (Number.isNaN(totalMinutes) || totalMinutes <= 0) {
      toast.error('Enter a valid budget in hours')
      return
    }

    setBudgetAction.execute({
      projectId,
      budgetMinutes: totalMinutes,
      alertThreshold: values.alertThreshold,
    })
  }

  function handleMemberSelect(memberId: string) {
    rateForm.setValue('memberId', memberId, { shouldValidate: true })
    const current = getCurrentRate(existingRates, memberId)
    if (current) {
      rateForm.setValue('hourlyRate', formatCents(current.hourlyRate))
      rateForm.setValue('currency', current.currency)
      rateForm.setValue('isProjectSpecific', !!current.projectId)
    }
  }

  // Group rates by member for the current rates display
  const memberRateMap = new Map<string, MemberRate[]>()
  for (const rate of existingRates) {
    if (!memberRateMap.has(rate.memberId)) {
      memberRateMap.set(rate.memberId, [])
    }
    memberRateMap.get(rate.memberId)!.push(rate)
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Rates & Budget</DialogTitle>
          <DialogDescription>
            Set hourly rates for members and configure the project budget.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue='rates'>
          <TabsList className='w-full'>
            <TabsTrigger className='flex-1' value='rates'>
              Member Rates
            </TabsTrigger>
            <TabsTrigger className='flex-1' value='budget'>
              Budget
            </TabsTrigger>
          </TabsList>

          <TabsContent className='space-y-4' value='rates'>
            {memberRateMap.size > 0 && (
              <div className='space-y-2'>
                <Label className='text-muted-foreground text-xs'>
                  Current rates
                </Label>
                <div className='max-h-48 space-y-1 overflow-y-auto'>
                  {[...memberRateMap.entries()].map(([memberId, rates]) => {
                    const current = getCurrentRate(existingRates, memberId)
                    if (!current) {
                      return null
                    }
                    const hasHistory = rates.length > 1
                    const isExpanded = expandedMember === memberId

                    return (
                      <div key={memberId}>
                        <button
                          aria-expanded={hasHistory ? isExpanded : undefined}
                          aria-label={`Rate history for ${current.memberName ?? current.memberEmail}`}
                          className='flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-left hover:bg-muted/50'
                          onClick={() =>
                            hasHistory
                              ? setExpandedMember(isExpanded ? null : memberId)
                              : undefined
                          }
                          type='button'
                        >
                          <div className='flex items-center gap-2'>
                            {hasHistory &&
                              (isExpanded ? (
                                <ChevronDown className='size-3 text-muted-foreground' />
                              ) : (
                                <ChevronRight className='size-3 text-muted-foreground' />
                              ))}
                            <span className='text-sm'>
                              {current.memberName ?? current.memberEmail}
                            </span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Badge className='text-xs' variant='outline'>
                              {current.currency}{' '}
                              {formatCents(current.hourlyRate)}/h
                            </Badge>
                            {current.projectId && (
                              <Badge className='text-xs' variant='secondary'>
                                Project
                              </Badge>
                            )}
                          </div>
                        </button>
                        {isExpanded &&
                          rates
                            .filter((r) => r.id !== current.id)
                            .map((rate) => (
                              <div
                                className='ml-7 flex items-center justify-between border-l px-3 py-1 text-muted-foreground'
                                key={rate.id}
                              >
                                <span className='text-xs'>
                                  From{' '}
                                  {new Date(
                                    rate.effectiveFrom
                                  ).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span className='text-xs'>
                                  {rate.currency} {formatCents(rate.hourlyRate)}
                                  /h
                                  {rate.projectId ? ' (project)' : ' (org)'}
                                </span>
                              </div>
                            ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <form
              className='space-y-3'
              onSubmit={rateForm.handleSubmit(handleSaveRate)}
            >
              <div className='space-y-2'>
                <Label htmlFor={`${ids}-member`}>Member</Label>
                <Select
                  onValueChange={handleMemberSelect}
                  value={rateForm.watch('memberId')}
                >
                  <SelectTrigger className='w-full' id={`${ids}-member`}>
                    <SelectValue placeholder='Select member' />
                  </SelectTrigger>
                  <SelectContent>
                    {projectMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name ?? m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rateForm.formState.errors.memberId && (
                  <p className='text-destructive text-xs'>
                    {rateForm.formState.errors.memberId.message}
                  </p>
                )}
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-2'>
                  <Label htmlFor={`${ids}-rate`}>Hourly Rate</Label>
                  <div className='relative'>
                    <Input
                      id={`${ids}-rate`}
                      min='0'
                      placeholder='0.00'
                      step='0.01'
                      type='number'
                      {...rateForm.register('hourlyRate')}
                    />
                  </div>
                  {rateForm.formState.errors.hourlyRate && (
                    <p className='text-destructive text-xs'>
                      {rateForm.formState.errors.hourlyRate.message}
                    </p>
                  )}
                </div>
                <div className='space-y-2'>
                  <Label htmlFor={`${ids}-currency`}>Currency</Label>
                  <CurrencySelect
                    name={`${ids}-currency`}
                    onCurrencySelect={(e) =>
                      rateForm.setValue('currency', e.code, {
                        shouldValidate: true,
                      })
                    }
                    value={rateForm.watch('currency')}
                  />
                  {rateForm.formState.errors.currency && (
                    <p className='text-destructive text-xs'>
                      {rateForm.formState.errors.currency.message}
                    </p>
                  )}
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor={`${ids}-from`}>Effective From</Label>
                <Input
                  id={`${ids}-from`}
                  type='date'
                  {...rateForm.register('effectiveFrom')}
                />
                {rateForm.formState.errors.effectiveFrom && (
                  <p className='text-destructive text-xs'>
                    {rateForm.formState.errors.effectiveFrom.message}
                  </p>
                )}
                <p className='text-muted-foreground text-xs'>
                  Setting the same effective date as an existing rate will
                  update it rather than creating a new one.
                </p>
              </div>

              <div className='flex items-center gap-2'>
                <input
                  id={`${ids}-project`}
                  type='checkbox'
                  {...rateForm.register('isProjectSpecific')}
                  className='size-4 rounded border'
                />
                <Label
                  className='cursor-pointer font-normal'
                  htmlFor={`${ids}-project`}
                >
                  Project-specific rate (overrides org default)
                </Label>
              </div>

              <DialogFooter>
                <Button loading={setRateAction.isPending} type='submit'>
                  Save Rate
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent className='space-y-4' value='budget'>
            <form
              className='space-y-3'
              onSubmit={budgetForm.handleSubmit(handleSaveBudget)}
            >
              <div className='space-y-2'>
                <Label htmlFor={`${ids}-budget`}>Budget (hours)</Label>
                <Input
                  id={`${ids}-budget`}
                  min='0'
                  placeholder='e.g. 200'
                  step='0.5'
                  type='number'
                  {...budgetForm.register('budgetHours')}
                />
                {budgetForm.formState.errors.budgetHours && (
                  <p className='text-destructive text-xs'>
                    {budgetForm.formState.errors.budgetHours.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor={`${ids}-threshold`}>Alert threshold (%)</Label>
                <Input
                  id={`${ids}-threshold`}
                  max='100'
                  min='1'
                  type='number'
                  {...budgetForm.register('alertThreshold', {
                    valueAsNumber: true,
                  })}
                />
                {budgetForm.formState.errors.alertThreshold && (
                  <p className='text-destructive text-xs'>
                    {budgetForm.formState.errors.alertThreshold.message}
                  </p>
                )}
                <p className='text-muted-foreground text-xs'>
                  You&apos;ll be notified when this percentage of the budget is
                  used.
                </p>
              </div>

              <DialogFooter>
                <Button loading={setBudgetAction.isPending} type='submit'>
                  Save Budget
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
