import { ClipboardList } from 'lucide-react'
import Image from 'next/image'

export function MockRequirementUI() {
  return (
    <div className='overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1a1f] shadow-2xl shadow-violet-500/10'>
      <div className='flex items-center justify-between border-white/[0.06] border-b bg-white/[0.03] px-5 py-3'>
        <div className='flex items-center gap-2'>
          <ClipboardList className='size-4 text-violet-400' />
          <span className='font-semibold text-sm text-white/90'>
            Homepage Redesign — Requirements
          </span>
        </div>
        <span className='rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-[10px] text-amber-400'>
          Awaiting signature
        </span>
      </div>
      <div className='p-5'>
        <div className='space-y-3 text-sm text-white/70'>
          <div>
            <div className='mb-1 font-semibold text-white/90'>
              1. Hero Section
            </div>
            <p className='text-white/50 text-xs'>
              Full-width hero with animated headline, subtext, and a primary CTA
              linking to the sign-up page. Must support both light and dark
              mode.
            </p>
          </div>
          <div>
            <div className='mb-1 font-semibold text-white/90'>
              2. Feature Grid
            </div>
            <p className='text-white/50 text-xs'>
              3-column responsive grid showcasing the six core modules with
              icons, titles, and one-line descriptions.
            </p>
          </div>
          <div>
            <div className='mb-1 font-semibold text-white/90'>
              3. Pricing Table
            </div>
            <p className='text-white/50 text-xs'>
              Side-by-side comparison of Free and Pro tiers with feature
              breakdown and monthly/annual toggle.
            </p>
          </div>
        </div>
        <div className='mt-4 flex items-center gap-3 border-white/[0.06] border-t pt-4'>
          <div className='flex -space-x-1.5'>
            <Image
              alt=''
              className='size-5 rounded-full border border-[#1a1a1f]'
              height={20}
              src='https://github.com/phantomknight287.png'
              width={20}
            />
            <Image
              alt=''
              className='size-5 rounded-full border border-[#1a1a1f]'
              height={20}
              src='https://github.com/loremus299.png'
              width={20}
            />
          </div>
          <span className='text-[11px] text-white/30'>
            Sent to 2 recipients · 1 signature pending
          </span>
        </div>
      </div>
    </div>
  )
}
