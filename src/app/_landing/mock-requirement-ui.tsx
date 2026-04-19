import { ClipboardList } from 'lucide-react'
import Image from 'next/image'

export function MockRequirementUI() {
  return (
    <div className='overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10'>
      <div className='flex items-center justify-between border-border/60 border-b bg-muted/30 px-5 py-3'>
        <div className='flex items-center gap-2'>
          <ClipboardList className='size-4 text-primary' />
          <span className='font-semibold text-foreground text-sm'>
            Homepage Redesign — Requirements
          </span>
        </div>
        <span className='rounded-full bg-amber-500/15 px-2 py-0.5 text-center font-medium text-[10px] text-amber-600 dark:text-amber-400'>
          Awaiting signature
        </span>
      </div>
      <div className='p-5'>
        <div className='space-y-3 text-foreground/70 text-sm'>
          <div>
            <div className='mb-1 font-semibold text-foreground'>
              1. Hero Section
            </div>
            <p className='text-muted-foreground text-xs'>
              Full-width hero with animated headline, subtext, and a primary CTA
              linking to the sign-up page. Must support both light and dark
              mode.
            </p>
          </div>
          <div>
            <div className='mb-1 font-semibold text-foreground'>
              2. Feature Grid
            </div>
            <p className='text-muted-foreground text-xs'>
              3-column responsive grid showcasing the six core modules with
              icons, titles, and one-line descriptions.
            </p>
          </div>
          <div>
            <div className='mb-1 font-semibold text-foreground'>
              3. Pricing Table
            </div>
            <p className='text-muted-foreground text-xs'>
              Side-by-side comparison of Free and Pro tiers with feature
              breakdown and monthly/annual toggle.
            </p>
          </div>
        </div>
        <div className='mt-4 flex items-center gap-3 border-border/60 border-t pt-4'>
          <div className='flex -space-x-1.5'>
            <Image
              alt=''
              className='size-5 rounded-full border border-card'
              height={20}
              src='https://github.com/phantomknight287.png'
              width={20}
            />
            <Image
              alt=''
              className='size-5 rounded-full border border-card'
              height={20}
              src='https://github.com/loremus299.png'
              width={20}
            />
          </div>
          <span className='text-[11px] text-muted-foreground/70'>
            Sent to 2 recipients · 1 signature pending
          </span>
        </div>
      </div>
    </div>
  )
}
