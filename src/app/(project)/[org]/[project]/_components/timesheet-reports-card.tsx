import { CircleDot } from 'lucide-react'
import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RouteImpl } from '@/types'
import TimesheetStatusBadge from '../timesheets/_components/timesheet-status-badge'

interface Report {
  id: string
  status: Parameters<typeof TimesheetStatusBadge>[0]['status']
  title: string
  totalMinutes: number
}

export function TimesheetReportsCard({
  reports,
  basePath,
}: {
  reports: Report[]
  basePath: string
}) {
  return (
    <Card>
      <CardHeader className='flex-row items-center justify-between'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <CircleDot className='size-4 text-muted-foreground' />
          Timesheet Reports
        </CardTitle>
        <Link
          className='text-muted-foreground text-xs hover:text-foreground'
          href={`${basePath}/timesheets` as RouteImpl}
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className='space-y-2'>
        {reports.slice(0, 5).map((r) => (
          <div
            className='flex items-center justify-between rounded-lg border border-border p-3'
            key={r.id}
          >
            <div className='min-w-0'>
              <span className='truncate font-medium text-sm'>{r.title}</span>
              <p className='text-muted-foreground text-xs'>
                {Math.floor(r.totalMinutes / 60)}h {r.totalMinutes % 60}m
              </p>
            </div>
            <TimesheetStatusBadge status={r.status} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
