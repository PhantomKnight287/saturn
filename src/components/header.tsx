'use client'

import Link from 'next/link'
import { SaturnLogo } from '@/components/icons/saturn-logo'
import { APP_NAME } from '@/lib/constants'
import { NavUser } from './nav-user'

export function Header() {
  return (
    <header className='sticky top-0 z-50 border-border/50 border-b bg-background/80 backdrop-blur-xl'>
      <div className='mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-safe-or-4 sm:px-safe-or-6'>
        <Link className='flex items-center gap-2' href='/'>
          <SaturnLogo className='size-6 text-foreground' />
          <span className='font-semibold text-lg tracking-tight'>
            {APP_NAME}
          </span>
        </Link>

        <NavUser />
      </div>
    </header>
  )
}
