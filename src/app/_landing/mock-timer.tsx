import { Check, Play } from 'lucide-react'

export function MockTimer() {
  return (
    <div className='flex h-full flex-col justify-center'>
      <div className='flex items-center gap-2 text-muted-foreground text-xs'>
        <span className='inline-flex size-1.5 rounded-full bg-muted-foreground/50' />
        <span className='font-mono uppercase tracking-wider'>Paused</span>
        <span className='text-muted-foreground/50'>·</span>
        <span className='font-mono text-muted-foreground/80'>web-rdsn</span>
      </div>
      <div className='mt-3 font-semibold text-6xl text-foreground tabular-nums tracking-[-0.04em]'>
        01:24:07
      </div>
      <div className='mt-4 flex items-center gap-2'>
        <button
          className='inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-foreground/80 text-xs shadow-sm'
          disabled
          type='button'
        >
          <Play className='size-3' />
          Resume
        </button>
        <button
          className='inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 font-medium text-primary-foreground text-xs shadow-sm'
          disabled
          type='button'
        >
          <Check className='size-3' />
          Log time
        </button>
      </div>
    </div>
  )
}
