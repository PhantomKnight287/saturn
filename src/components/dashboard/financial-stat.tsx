import { cn } from '@/lib/utils'
import { formatCurrency } from './format-currency'

interface FinancialStatProps {
  count: number
  icon: React.ComponentType<{ className?: string }>
  label: string
  tone?: string
  totals: Record<string, number>
  unit: string
}

export function FinancialStat({
  icon: Icon,
  label,
  totals,
  count,
  unit,
  tone,
}: FinancialStatProps) {
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
  const [primary, ...rest] = sorted

  return (
    <div>
      <div className='flex items-center gap-1.5 text-muted-foreground text-xs'>
        <Icon className='size-3.5' />
        {label}
      </div>
      <div
        className={cn(
          'mt-1.5 font-semibold text-xl tabular-nums',
          !primary && 'text-muted-foreground',
          tone
        )}
      >
        {primary ? formatCurrency(primary[1], primary[0]) : '—'}
      </div>
      <p className='mt-0.5 text-muted-foreground text-xs'>
        {count > 0 ? `${count} ${count === 1 ? unit : `${unit}s`}` : '\u00A0'}
      </p>
      {rest.length > 0 && (
        <p className='mt-0.5 truncate text-muted-foreground text-xs'>
          + {rest.map(([c, v]) => formatCurrency(v, c)).join(' · ')}
        </p>
      )}
    </div>
  )
}
