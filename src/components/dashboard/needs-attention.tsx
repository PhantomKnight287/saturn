import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RouteImpl } from '@/types'

export function NeedsAttentionCard({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Card className='border-amber-500/30 bg-amber-500/5'>
      <CardHeader>
        <CardTitle className='text-base'>Needs Attention</CardTitle>
      </CardHeader>
      <CardContent className='space-y-2'>{children}</CardContent>
    </Card>
  )
}

interface ActionItemLinkProps {
  count: number
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  variant?: 'default' | 'destructive' | 'outline'
}

export function ActionItemLink({
  label,
  count,
  href,
  icon: Icon,
  variant = 'default',
}: ActionItemLinkProps) {
  return (
    <Link
      className='flex items-center justify-between rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/50'
      href={href as RouteImpl}
    >
      <div className='flex items-center gap-3'>
        <Icon className='size-4 text-muted-foreground' />
        <span className='text-sm'>{label}</span>
      </div>
      <div className='flex items-center gap-2'>
        <Badge variant={variant}>{count}</Badge>
        <ArrowRight className='size-4 text-muted-foreground' />
      </div>
    </Link>
  )
}
