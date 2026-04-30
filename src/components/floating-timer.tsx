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
    <div className='fixed right-4 bottom-4 z-50 flex flex-col gap-3 rounded-xl border border-border/70 bg-card/95 p-3 shadow-xl backdrop-blur'>
      <div className='flex items-center gap-2 text-muted-foreground text-xs'>
        {isRunning ? (
          <span className='relative flex size-1.5'>
            <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75' />
            <span className='relative inline-flex size-1.5 rounded-full bg-primary' />
          </span>
        ) : (
          <span className='inline-flex size-1.5 rounded-full bg-muted-foreground/50' />
        )}
        <span className='font-mono uppercase tracking-wider'>
          {isRunning ? 'Recording' : 'Paused'}
        </span>
        <span className='text-muted-foreground/50'>·</span>
        <span className='max-w-[12rem] truncate font-mono text-muted-foreground/80'>
          {context.projectName}
        </span>
      </div>
      <div className='font-semibold text-3xl text-foreground tabular-nums tracking-[-0.04em]'>
        {formatElapsedMs(elapsedMs)}
      </div>
      <div className='flex items-center gap-2'>
        {isRunning ? (
          <Button className='flex-1' onClick={pause} variant='outline'>
            <Pause className='size-3.5' />
            Pause
          </Button>
        ) : (
          <>
            <Button className='flex-1' onClick={resume} variant='outline'>
              <Play className='size-3.5' />
              Resume
            </Button>
            <Button className='flex-1' onClick={handleLog}>
              <Check className='size-3.5' />
              Log time
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
