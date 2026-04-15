import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { RouteImpl } from '@/types'

interface StatCardProps {
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
}: StatCardProps) {
  const content = (
    <Card
      className={cn(
        'gap-0 p-4',
        href && 'transition-colors hover:border-primary/50'
      )}
    >
      <div className='flex items-center gap-2 text-muted-foreground'>
        <Icon className='size-4' />
        <span className='text-sm'>{label}</span>
      </div>
      <div className='mt-2 font-semibold text-2xl'>{value}</div>
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
