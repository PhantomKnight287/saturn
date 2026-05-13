import { allChangelogs } from 'content-collections'
import { format } from 'date-fns'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createMetadata } from '@/lib/metadata'

export const metadata: Metadata = createMetadata({
  title: 'All Changelogs',
  description: 'Every release, improvement, and fix shipped to Saturn.',
  openGraph: {
    images: `/api/og?page=${encodeURIComponent('Changelog')}&subtitle=${encodeURIComponent('Every update to Saturn')}`,
  },
  twitter: {
    images: `/api/og?page=${encodeURIComponent('Changelog')}&subtitle=${encodeURIComponent('Every update to Saturn')}`,
  },
})

export default function ChangelogsGridPage() {
  const entries = [...allChangelogs].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <main className='mx-auto w-full max-w-6xl px-6 pt-16 pb-24 sm:pt-20'>
      <header className='mb-14'>
        <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
          / changelogs
        </div>
        <h1 className='mt-3 font-semibold text-4xl text-foreground tracking-[-0.03em] sm:text-5xl'>
          Every release, shipped.
        </h1>
        <p className='mt-4 max-w-xl text-lg text-muted-foreground'>
          Every improvement, fix, and feature shipped to Saturn.
        </p>
      </header>

      <ul className='grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3'>
        {entries.map((entry) => {
          const ogUrl = `/api/og?page=${encodeURIComponent(entry.title)}&subtitle=${encodeURIComponent(entry.description)}`
          return (
            <li key={entry.slug}>
              <Link className='group block' href={`/changelog/${entry.slug}`}>
                <div className='relative aspect-[1200/630] w-full overflow-hidden rounded-xl border border-border/60 bg-card'>
                  <Image
                    alt={entry.title}
                    className='object-cover'
                    fill
                    sizes='(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw'
                    src={ogUrl}
                    unoptimized
                  />
                  <div
                    aria-hidden
                    className='pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent'
                  />
                  <div className='absolute bottom-3 left-3 flex items-center gap-2 font-mono text-[10px] text-white/90 uppercase tracking-[0.14em]'>
                    <time dateTime={entry.date}>
                      {format(new Date(entry.date), 'MMM d, yyyy')}
                    </time>
                    {entry.version ? (
                      <>
                        <span className='h-1 w-1 rounded-full bg-white/50' />
                        <span>v{entry.version}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className='mt-4'>
                  <h2 className='font-medium text-foreground text-lg tracking-tight transition-colors group-hover:text-primary'>
                    {entry.title}
                  </h2>
                  <p className='mt-1.5 line-clamp-2 text-muted-foreground text-sm leading-relaxed'>
                    {entry.description}
                  </p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
