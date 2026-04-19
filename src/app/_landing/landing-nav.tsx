'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { SaturnLogo } from '@/components/icons/saturn-logo'
import { buttonVariants } from '@/components/ui/button'
import { useSession } from '@/lib/auth-client'

export function LandingNav() {
  const { data: session } = useSession()

  return (
    <nav className='sticky top-0 z-50 border-border/50 border-b bg-background/80 backdrop-blur-xl'>
      <div className='mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6'>
        <Link className='flex items-center gap-2' href='/'>
          <SaturnLogo className='size-6 text-foreground' />
          <span className='font-semibold text-lg tracking-tight'>Saturn</span>
        </Link>
        <div className='flex items-center gap-1 sm:gap-2'>
          {session?.user ? (
            <Link className={buttonVariants({ size: 'sm' })} href='/dashboard'>
              Dashboard
              <ArrowRight className='size-3.5' />
            </Link>
          ) : (
            <>
              <Link
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'hidden sm:inline-flex',
                })}
                href='#pricing'
              >
                Pricing
              </Link>
              <Link
                className={buttonVariants({ size: 'sm' })}
                href='/auth/sign-up'
              >
                Get started
                <ArrowRight className='size-3.5' />
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
