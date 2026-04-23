import { MessageSquare } from 'lucide-react'
import Image from 'next/image'

export function MockRequirementCard() {
  return (
    <div className='relative h-full overflow-hidden rounded-xl border border-border/70 bg-background'>
      <div className='flex items-center justify-between border-border/60 border-b px-4 py-2.5'>
        <span className='font-medium text-foreground/90 text-xs'>
          Homepage Redesign
        </span>
        <span className='inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-600 uppercase tracking-wider dark:text-amber-400'>
          Awaiting signature
        </span>
      </div>
      <div className='space-y-3 px-4 py-4'>
        <div>
          <div className='font-medium text-foreground text-sm'>
            1. Hero section
          </div>
          <p className='mt-0.5 text-[12px] text-muted-foreground leading-relaxed'>
            Full-width hero with animated headline and primary CTA. Must support
            light and dark mode.
          </p>
        </div>
        <div className='relative rounded-md border border-border/60 bg-muted/30 p-2.5'>
          <div className='flex items-start gap-2'>
            <Image
              alt=''
              className='size-5 shrink-0 rounded-full'
              height={20}
              src='https://github.com/loremus299.png'
              width={20}
            />
            <div className='flex-1'>
              <div className='flex items-center gap-1.5'>
                <span className='font-medium text-foreground/90 text-xs'>
                  Client
                </span>
                <MessageSquare className='size-3 text-muted-foreground/60'>
                  <title>Comment</title>
                </MessageSquare>
              </div>
              <p className='mt-0.5 text-[11px] text-muted-foreground leading-relaxed'>
                Can we match the brand purple on the CTA?
              </p>
            </div>
          </div>
        </div>
        <div>
          <div className='font-medium text-foreground text-sm'>
            2. Feature grid
          </div>
          <p className='mt-0.5 line-clamp-2 text-[12px] text-muted-foreground leading-relaxed'>
            Three-column responsive grid showcasing the core modules with icons
            and short descriptions.
          </p>
        </div>
      </div>
    </div>
  )
}
