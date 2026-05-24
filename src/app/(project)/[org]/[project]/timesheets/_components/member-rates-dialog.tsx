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
import { billingFrequencyEnum } from '@/server/db/schema'
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

function formatRate(thousandths: number): string {
  return (thousandths / 1000).toFixed(3)
}

type BillingFrequency = (typeof billingFrequencyEnum.enumValues)[number]

const FREQUENCY_LABELS: Record<BillingFrequency, string> = {
  hourly: '/h',
  weekly: '/wk',
  biweekly: '/2wk',
  monthly: '/mo',
}

function formatRateWithFrequency(
  thousandths: number | null,
  currency: string,
  frequency: BillingFrequency | null
): string {
  const rate = thousandths == null ? 0 : formatRate(thousandths)
  return `${currency} ${rate}${FREQUENCY_LABELS[frequency ?? 'hourly']}`
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
      payRate: '',
      payCurrency: defaultCurrency ?? 'USD',
      payFrequency: 'hourly',
      billingRate: '',
      billingCurrency: defaultCurrency ?? 'USD',
      billingFrequency: 'hourly',
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
        payRate: '',
        payCurrency: defaultCurrency ?? 'USD',
        payFrequency: 'hourly',
        billingRate: '',
        billingCurrency: defaultCurrency ?? 'USD',
        billingFrequency: 'hourly',
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
    const payThousandths = Math.round(Number.parseFloat(values.payRate) * 1000)
    if (Number.isNaN(payThousandths) || payThousandths <= 0) {
      toast.error('Enter a valid pay rate')
      return
    }

    // Billing rate is optional; when blank it falls back to the pay rate.
    let billingThousandths: number | undefined
    if (values.billingRate.trim() !== '') {
      billingThousandths = Math.round(
        Number.parseFloat(values.billingRate) * 1000
      )
      if (Number.isNaN(billingThousandths) || billingThousandths <= 0) {
        toast.error('Enter a valid billing rate')
        return
      }
    }

    setRateAction.execute({
      memberId: values.memberId,
      projectId: values.isProjectSpecific ? projectId : null,
      payRate: payThousandths,
      payCurrency: values.payCurrency,
      payFrequency: values.payFrequency,
      billingRate: billingThousandths,
      billingCurrency: values.billingCurrency,
      billingFrequency: values.billingFrequency,
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
      rateForm.setValue('payRate', formatRate(current.payRate))
      rateForm.setValue('payCurrency', current.payCurrency)
      rateForm.setValue('payFrequency', current.payFrequency ?? 'hourly')
      rateForm.setValue(
        'billingRate',
        current.billingRate == null ? '' : formatRate(current.billingRate)
      )
      rateForm.setValue('billingCurrency', current.billingCurrency)
      rateForm.setValue('billingFrequency', current.billingFrequency ?? 'hourly')
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
                              Pay{' '}
                              {formatRateWithFrequency(
                                current.payRate,
                                current.payCurrency,
                                current.payFrequency
                              )}
                            </Badge>
                            <Badge className='text-xs' variant='outline'>
                              Bill{' '}
                              {formatRateWithFrequency(
                                current.billingRate ?? current.payRate,
                                current.billingCurrency,
                                current.billingFrequency
                              )}
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
                                  ).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span className='text-xs'>
                                  Pay{' '}
                                  {formatRateWithFrequency(
                                    rate.payRate,
                                    rate.payCurrency,
                                    rate.payFrequency
                                  )}{' '}
                                  · Bill{' '}
                                  {formatRateWithFrequency(
                                    rate.billingRate ?? rate.payRate,
                                    rate.billingCurrency,
                                    rate.billingFrequency
                                  )}
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

              <div className='space-y-2'>
                <Label className='text-muted-foreground text-xs'>
                  Pay rate (what the member is paid)
                </Label>
                <div className='grid grid-cols-3 gap-3'>
                  <div className='space-y-2'>
                    <Label htmlFor={`${ids}-pay-rate`}>Rate</Label>
                    <Input
                      id={`${ids}-pay-rate`}
                      min='0'
                      placeholder='0.000'
                      step='0.001'
                      type='number'
                      {...rateForm.register('payRate')}
                    />
                    {rateForm.formState.errors.payRate && (
                      <p className='text-destructive text-xs'>
                        {rateForm.formState.errors.payRate.message}
                      </p>
                    )}
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor={`${ids}-pay-currency`}>Currency</Label>
                    <CurrencySelect
                      name={`${ids}-pay-currency`}
                      onCurrencySelect={(e) =>
                        rateForm.setValue('payCurrency', e.code, {
                          shouldValidate: true,
                        })
                      }
                      value={rateForm.watch('payCurrency')}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor={`${ids}-pay-frequency`}>Frequency</Label>
                    <Select
                      onValueChange={(v) =>
                        rateForm.setValue(
                          'payFrequency',
                          v as BillingFrequency,
                          { shouldValidate: true }
                        )
                      }
                      value={rateForm.watch('payFrequency')}
                    >
                      <SelectTrigger
                        className='w-full'
                        id={`${ids}-pay-frequency`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {billingFrequencyEnum.enumValues.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className='space-y-2'>
                <Label className='text-muted-foreground text-xs'>
                  Billing rate (what the client is charged) — leave blank to
                  match pay
                </Label>
                <div className='grid grid-cols-3 gap-3'>
                  <div className='space-y-2'>
                    <Label htmlFor={`${ids}-bill-rate`}>Rate</Label>
                    <Input
                      id={`${ids}-bill-rate`}
                      min='0'
                      placeholder='0.000'
                      step='0.001'
                      type='number'
                      {...rateForm.register('billingRate')}
                    />
                    {rateForm.formState.errors.billingRate && (
                      <p className='text-destructive text-xs'>
                        {rateForm.formState.errors.billingRate.message}
                      </p>
                    )}
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor={`${ids}-bill-currency`}>Currency</Label>
                    <CurrencySelect
                      name={`${ids}-bill-currency`}
                      onCurrencySelect={(e) =>
                        rateForm.setValue('billingCurrency', e.code, {
                          shouldValidate: true,
                        })
                      }
                      value={rateForm.watch('billingCurrency')}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor={`${ids}-bill-frequency`}>Frequency</Label>
                    <Select
                      onValueChange={(v) =>
                        rateForm.setValue(
                          'billingFrequency',
                          v as BillingFrequency,
                          { shouldValidate: true }
                        )
                      }
                      value={rateForm.watch('billingFrequency')}
                    >
                      <SelectTrigger
                        className='w-full'
                        id={`${ids}-bill-frequency`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {billingFrequencyEnum.enumValues.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
