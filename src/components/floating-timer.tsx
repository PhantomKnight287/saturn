'use client'

import { useRouter } from '@bprogress/next/app'
import { Check, Pause, Play } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  elapsedMinutesFromMs,
  formatElapsedMs,
  getElapsedMs,
  useTimerStore,
} from '@/stores/timer-store'

export function FloatingTimer() {
  const { startedAt, accumulatedMs, context, pause, resume, stop } =
    useTimerStore((s) => s)
  const router = useRouter()
  const pathname = usePathname()
  const [now, setNow] = useState(() => Date.now())

  const isActive = startedAt !== null || accumulatedMs > 0
  const isRunning = startedAt !== null

  useEffect(() => {
    if (!isRunning) {
      return
    }
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [isRunning])

  if (!(isActive && context)) {
    return null
  }

  const elapsedMs = getElapsedMs(startedAt, accumulatedMs, now)
  const timesheetsPath = `/${context.orgSlug}/${context.projectSlug}/timesheets`
  const isOnTimesheetsPage = pathname === timesheetsPath

  const handleLog = () => {
    const minutes = elapsedMinutesFromMs(elapsedMs)
    stop()
    if (isOnTimesheetsPage) {
      window.dispatchEvent(
        new CustomEvent('timer:log', { detail: { minutes } })
      )
    } else {
      router.push(`${timesheetsPath}?logMinutes=${minutes}`)
    }
  }

  return (
    <div className='fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-lg border bg-background px-3 py-2 shadow-lg'>
      <div className='flex flex-col'>
        <span className='text-muted-foreground text-xs'>
          {context.projectName}
          {isRunning ? '' : ' · Paused'}
        </span>
        <span className='font-mono font-semibold text-sm tabular-nums'>
          {formatElapsedMs(elapsedMs)}
        </span>
      </div>
      {isRunning ? (
        <Button onClick={pause} size='sm' variant='outline'>
          <Pause className='size-4' />
          Pause
        </Button>
      ) : (
        <>
          <Button onClick={resume} size='sm' variant='outline'>
            <Play className='size-4' />
            Resume
          </Button>
          <Button onClick={handleLog} size='sm'>
            <Check className='size-4' />
            Log Time
          </Button>
        </>
      )}
    </div>
  )
}
