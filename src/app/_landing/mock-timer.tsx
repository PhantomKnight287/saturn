import { Square } from 'lucide-react'

export function MockTimer() {
  return (
    <div className='flex h-full flex-col justify-end'>
      <div className='flex items-center gap-2 text-muted-foreground text-xs'>
        <span className='relative flex size-1.5'>
          <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75' />
          <span className='relative inline-flex size-1.5 rounded-full bg-primary' />
        </span>
        <span className='font-mono uppercase tracking-wider'>Recording</span>
        <span className='text-muted-foreground/50'>·</span>
        <span className='font-mono text-muted-foreground/80'>web-rdsn</span>
      </div>
      <div className='mt-3 font-semibold text-6xl text-foreground tabular-nums tracking-[-0.04em]'>
        01:24:07
      </div>
      <div className='mt-4 flex items-center gap-2'>
        <button
          className='inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-foreground/80 text-xs shadow-sm'
          disabled
          type='button'
        >
          <Square className='size-3 fill-current' />
          Stop & log
        </button>
      </div>
    </div>
  )
}
