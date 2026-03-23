'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatMinutes } from '../common'
import type { BudgetStatus } from '../types'

interface BudgetIndicatorProps {
  budgetStatus: BudgetStatus
}

export function BudgetIndicator({ budgetStatus }: BudgetIndicatorProps) {
  const { budget, totalApprovedMinutes, percentageUsed } = budgetStatus
  const capped = Math.min(percentageUsed, 100)

  const barColor =
    percentageUsed >= budget.alertThreshold
      ? 'bg-destructive'
      : percentageUsed >= 60
        ? 'bg-muted-foreground'
        : 'bg-primary'

  const textColor =
    percentageUsed >= budget.alertThreshold
      ? 'text-destructive'
      : 'text-muted-foreground'

  const label =
    percentageUsed >= 100
      ? 'Budget exceeded'
      : `${formatMinutes(totalApprovedMinutes)} / ${formatMinutes(budget.budgetMinutes)}`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className='flex items-center gap-2'>
          <span className={cn('whitespace-nowrap text-xs', textColor)}>
            Budget {percentageUsed}%
          </span>
          <div className='h-1.5 w-24 overflow-hidden rounded-full bg-secondary'>
            <div
              className={cn('h-full rounded-full transition-all', barColor)}
              style={{ width: `${capped}%` }}
            />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side='bottom'>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}
