'use client'

import { Clock, DollarSign, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TimeEntry } from '../types'

interface TimeSummaryCardProps {
  entries: TimeEntry[]
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatMinutesAsHours(minutes: number): string {
  return (minutes / 60).toFixed(1)
}

export function TimeSummaryCard({ entries }: TimeSummaryCardProps) {
  const monday = getMonday(new Date())
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)

  const thisWeekEntries = entries.filter((e) => {
    const d = new Date(e.date)
    return d >= monday && d <= sunday
  })

  const totalMinutes = thisWeekEntries.reduce(
    (sum, e) => sum + e.durationMinutes,
    0
  )
  const billableMinutes = thisWeekEntries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + e.durationMinutes, 0)

  const reqCounts: Record<string, { title: string; minutes: number }> = {}
  for (const entry of thisWeekEntries) {
    const key = entry.requirementTitle ?? 'General'
    if (!reqCounts[key]) {
      reqCounts[key] = { title: key, minutes: 0 }
    }
    reqCounts[key].minutes += entry.durationMinutes
  }

  const topRequirement = Object.values(reqCounts)
    .sort((a, b) => b.minutes - a.minutes)
    .at(0)

  return (
    <Card className='sm:col-span-2 lg:col-span-1'>
      <CardHeader className='pb-2'>
        <CardTitle className='font-medium text-sm'>This Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          <div className='flex items-center gap-3'>
            <div className='flex size-9 items-center justify-center rounded-md bg-primary/10'>
              <Clock className='size-4 text-primary' />
            </div>
            <div>
              <p className='font-bold text-2xl'>
                {formatMinutesAsHours(totalMinutes)}h
              </p>
              <p className='text-muted-foreground text-xs'>Total hours</p>
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <div className='flex size-9 items-center justify-center rounded-md bg-green-500/10'>
              <DollarSign className='size-4 text-green-600' />
            </div>
            <div>
              <p className='font-semibold text-lg'>
                {formatMinutesAsHours(billableMinutes)}h
              </p>
              <p className='text-muted-foreground text-xs'>Billable hours</p>
            </div>
          </div>

          {topRequirement && (
            <div className='flex items-center gap-3'>
              <div className='flex size-9 items-center justify-center rounded-md bg-blue-500/10'>
                <TrendingUp className='size-4 text-blue-600' />
              </div>
              <div className='min-w-0'>
                <p className='truncate font-medium text-sm'>
                  {topRequirement.title}
                </p>
                <p className='text-muted-foreground text-xs'>
                  Top requirement ·{' '}
                  {formatMinutesAsHours(topRequirement.minutes)}h
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
