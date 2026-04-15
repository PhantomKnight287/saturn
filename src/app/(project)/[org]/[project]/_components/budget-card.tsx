import { Clock } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface BudgetStatus {
  budget: { budgetMinutes: number }
  percentageUsed: number
  totalApprovedMinutes: number
}

export function BudgetCard({ budget }: { budget: BudgetStatus }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-base'>
          <Clock className='size-4 text-muted-foreground' />
          Budget
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          <div className='flex items-baseline justify-between'>
            <span className='font-semibold text-2xl'>
              {budget.percentageUsed}%
            </span>
            <span className='text-muted-foreground text-sm'>used</span>
          </div>
          <div className='h-2 overflow-hidden rounded-full bg-secondary'>
            <div
              className={cn(
                'h-full rounded-full transition-all',
                budget.percentageUsed >= 90
                  ? 'bg-destructive'
                  : budget.percentageUsed >= 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              )}
              style={{
                width: `${Math.min(budget.percentageUsed, 100)}%`,
              }}
            />
          </div>
          <p className='text-muted-foreground text-xs'>
            {Math.floor(budget.totalApprovedMinutes / 60)}h{' '}
            {budget.totalApprovedMinutes % 60}m of{' '}
            {Math.floor(budget.budget.budgetMinutes / 60)}h budget
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
