import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { RouteImpl } from '@/types'

export type StatAccent = 'sky' | 'violet' | 'amber' | 'teal' | 'rose' | 'slate'

const accentStyles: Record<StatAccent, string> = {
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  violet:
    'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
}

interface StatCardProps {
  accent?: StatAccent
  href?: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  sublabel?: string
  value: string | number
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  href,
  accent = 'slate',
}: StatCardProps) {
  const content = (
    <Card
      className={cn(
        'group/stat gap-0 p-4',
        href &&
          'transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm'
      )}
    >
      <div className='flex items-center gap-2'>
        <span
          className={cn(
            'flex size-7 items-center justify-center rounded-md',
            accentStyles[accent]
          )}
        >
          <Icon className='size-4' />
        </span>
        <span className='text-muted-foreground text-sm'>{label}</span>
      </div>
      <div className='mt-3 font-semibold text-2xl tracking-tight'>{value}</div>
      <p className='mt-1 text-muted-foreground text-xs'>
        {sublabel ?? '\u00A0'}
      </p>
    </Card>
  )

  if (href) {
    return <Link href={href as RouteImpl}>{content}</Link>
  }

  return content
}
