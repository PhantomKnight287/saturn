'use client'

import { ArrowRight, Star } from 'lucide-react'
import Link from 'next/link'

import { SaturnLogo } from '@/components/icons/saturn-logo'
import { buttonVariants } from '@/components/ui/button'
import { useSession } from '@/lib/auth-client'

function formatStars(n: number) {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`
  }
  return n.toString()
}

export function LandingNav({ githubStars }: { githubStars: number | null }) {
  const { data: session } = useSession()

  return (
    <nav className='sticky top-0 z-50 border-border/50 border-b bg-background/80 backdrop-blur-xl'>
      <div className='mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6'>
        <Link className='flex items-center gap-2' href='/'>
          <SaturnLogo className='size-6 text-foreground' />
          <span className='font-semibold text-lg tracking-tight'>Saturn</span>
        </Link>
        <div className='flex items-center gap-1 sm:gap-2'>
          <a
            className='group mr-1 hidden items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1 text-foreground/80 text-xs transition-colors hover:border-border hover:text-foreground sm:inline-flex'
            href='https://github.com/phantomknight287/saturn'
            rel='noreferrer noopener'
            target='_blank'
          >
            <Star className='size-3 text-muted-foreground group-hover:text-foreground' />
            <span className='font-medium'>Star</span>
            {githubStars !== null && (
              <span className='border-border/60 border-l pl-1.5 font-mono text-muted-foreground tabular-nums'>
                {formatStars(githubStars)}
              </span>
            )}
          </a>
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
