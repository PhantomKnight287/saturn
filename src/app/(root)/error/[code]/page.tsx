import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button-variants'
import { createMetadata } from '@/lib/metadata'

const ERROR_CODES = {
  '400': {
    title: 'Bad request',
    accent: 'something was off.',
    message: 'The request was malformed or invalid.',
  },
  '401': {
    title: 'Unauthorized',
    accent: 'sign in to continue.',
    message: 'You need to sign in to view this page.',
  },
  '403': {
    title: 'Forbidden',
    accent: "you can't go in there.",
    message: 'You do not have permission to view this page.',
  },
  '404': {
    title: 'Not found',
    accent: 'nothing lives here.',
    message: "The page you're looking for doesn't exist.",
  },
  '408': {
    title: 'Request timeout',
    accent: 'we ran out of time.',
    message: 'The request took too long to complete.',
  },
  '410': {
    title: 'Gone',
    accent: 'this is no longer here.',
    message: 'This resource is no longer available.',
  },
  '429': {
    title: 'Too many requests',
    accent: 'slow down a moment.',
    message: 'You are being rate limited. Please try again later.',
  },
  '500': {
    title: 'Internal server error',
    accent: 'something broke on our end.',
    message: 'Something went wrong on our end.',
  },
  '502': {
    title: 'Bad gateway',
    accent: 'the wires got crossed.',
    message: 'The server received an invalid response.',
  },
  '503': {
    title: 'Service unavailable',
    accent: 'be back in a moment.',
    message: 'The service is temporarily unavailable.',
  },
  '504': {
    title: 'Gateway timeout',
    accent: 'the upstream is napping.',
    message: 'The upstream server took too long to respond.',
  },
} as const

export const dynamicParams = true

export function generateStaticParams() {
  return Object.keys(ERROR_CODES).map((code) => ({ code }))
}

export const metadata: Metadata = createMetadata({
  title: 'Error',
  description: 'Something went wrong.',
})

export default async function ErrorCodePage({
  params,
  searchParams,
}: PageProps<'/error/[code]'>) {
  const { code } = await params
  const sp = await searchParams
  const messageParam = sp.message
  const message = typeof messageParam === 'string' ? messageParam : undefined

  const known = ERROR_CODES[code as keyof typeof ERROR_CODES]
  const title = known?.title ?? 'Error'
  const accent = known?.accent ?? 'something went sideways.'
  const description = message ?? known?.message ?? 'Something went wrong.'

  return (
    <main className='relative flex w-full flex-1 items-center justify-center overflow-hidden bg-background px-6 py-24 text-foreground'>
      <div
        aria-hidden
        className='pointer-events-none absolute top-1/2 left-1/2 -z-10 h-72 w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl'
      />
      <div className='relative mx-auto w-full max-w-2xl'>
        <div className='inline-flex items-center gap-2 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
          <span className='h-px w-6 bg-muted-foreground/40' />
          Error / {code}
        </div>
        <h1 className='mt-6 font-semibold text-5xl text-foreground leading-[0.98] tracking-[-0.04em] sm:text-6xl'>
          {title}.
          <br />
          <span className='text-muted-foreground/80 italic'>{accent}</span>
        </h1>
        <p className='mt-8 max-w-xl text-lg text-muted-foreground leading-relaxed'>
          {description}
        </p>
        <div className='mt-10 flex items-center gap-3'>
          <Link className={buttonVariants({ size: 'lg' })} href='/dashboard'>
            Back to dashboard
            <ArrowRight className='size-4' />
          </Link>
          <Link
            className='inline-flex items-center gap-1.5 text-foreground/80 text-sm hover:text-foreground'
            href='/'
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
