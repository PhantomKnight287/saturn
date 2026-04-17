'use client'

import { GitHubIcon, UserButton } from 'better-auth-ui'
import Link from 'next/link'
import { APP_NAME, logo } from '@/lib/constants'
import { ModeToggle } from './mode-toggle'
import { Button } from './ui/button'

export function Header() {
  return (
    <header className='sticky top-0 z-50 flex h-12 justify-between border-b bg-background/60 px-safe-or-4 backdrop-blur md:h-14 md:px-safe-or-6'>
      <Link className='flex items-center gap-2 font-bold' href='/'>
        {logo}
        {APP_NAME}
      </Link>

      <div className='flex items-center gap-2'>
        <Button
          asChild
          className='size-8 rounded-full'
          size='icon'
          variant='outline'
        >
          <Link
            href='https://github.com/techwithanirudh/better-auth-nextjs-starter'
            rel='noopener noreferrer'
            target='_blank'
          >
            <GitHubIcon />
          </Link>
        </Button>

        <ModeToggle />
        <UserButton align='end' size='icon' />
      </div>
    </header>
  )
}
