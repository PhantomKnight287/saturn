import { AuthView } from 'better-auth-ui'
import { authViewPaths } from 'better-auth-ui/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createMetadata } from '@/lib/metadata'

export const dynamicParams = false

export const metadata: Metadata = createMetadata({
  title: 'Sign in',
  description: 'Sign in to your Saturn workspace.',
  openGraph: {
    images: ['/api/og?page=Sign%20in'],
  },
  twitter: {
    images: ['/api/og?page=Sign%20in'],
  },
})

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }))
}

export default async function AuthPage({ params }: PageProps<'/auth/[path]'>) {
  const { path } = await params

  return (
    <main className='container flex grow flex-col items-center justify-center self-center p-4 md:p-6'>
      <AuthView
        cardFooter={
          <p className='text-center text-muted-foreground text-xs'>
            By continuing, you agree to our{' '}
            <Link
              className='underline underline-offset-4 hover:text-foreground'
              href='/terms'
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              className='underline underline-offset-4 hover:text-foreground'
              href='/privacy'
            >
              Privacy Policy
            </Link>
            .
          </p>
        }
        pathname={path}
      />
    </main>
  )
}
