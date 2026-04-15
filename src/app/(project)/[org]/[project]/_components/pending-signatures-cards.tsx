import { ClipboardList, FileText } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RouteImpl } from '@/types'

interface Requirement {
  id: string
  slug: string
  title: string
}
interface Proposal {
  id: string
  slug: string
  title: string
}

export function RequirementsAwaitingSignatureCard({
  requirements,
  basePath,
}: {
  requirements: Requirement[]
  basePath: string
}) {
  return (
    <Card>
      <CardHeader className='flex-row items-center justify-between'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <ClipboardList className='size-4 text-muted-foreground' />
          Awaiting Signature
        </CardTitle>
        <Link
          className='text-muted-foreground text-xs hover:text-foreground'
          href={`${basePath}/requirements` as RouteImpl}
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className='space-y-2'>
        {requirements.slice(0, 5).map((r) => (
          <Link
            className='flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50'
            href={`${basePath}/requirements/${r.slug}` as RouteImpl}
            key={r.id}
          >
            <span className='truncate font-medium text-sm'>{r.title}</span>
            <Badge variant='outline'>Sent for sign</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

export function ProposalsPendingCard({
  proposals,
  basePath,
}: {
  proposals: Proposal[]
  basePath: string
}) {
  return (
    <Card>
      <CardHeader className='flex-row items-center justify-between'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <FileText className='size-4 text-muted-foreground' />
          Proposals Pending
        </CardTitle>
        <Link
          className='text-muted-foreground text-xs hover:text-foreground'
          href={`${basePath}/proposals` as RouteImpl}
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className='space-y-2'>
        {proposals.slice(0, 5).map((p) => (
          <Link
            className='flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50'
            href={`${basePath}/proposals/${p.slug}` as RouteImpl}
            key={p.id}
          >
            <span className='truncate font-medium text-sm'>{p.title}</span>
            <Badge variant='outline'>Awaiting signature</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
