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
  const entries = [...allChangelogs].sort((a, b) =>
    a.date < b.date ? 1 : -1
  )

  return (
    <main className='mx-auto max-w-7xl px-6 py-16'>
      <header className='mb-12'>
        <h1 className='font-bold text-4xl tracking-tight'>All Changelogs</h1>
        <p className='mt-3 text-muted-foreground'>
          Every release shipped to Saturn, in one place.
        </p>
      </header>

      <ul className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {entries.map((entry) => {
          const ogUrl = `/api/og?page=${encodeURIComponent(entry.title)}&subtitle=${encodeURIComponent(entry.description)}`
          return (
            <li key={entry.slug}>
              <Link
                className='group block overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40 hover:shadow-lg'
                href={`/changelog/${entry.slug}`}
              >
                <div className='relative aspect-[1200/630] w-full overflow-hidden bg-muted'>
                  <Image
                    alt={entry.title}
                    className='object-cover transition group-hover:scale-[1.02]'
                    fill
                    sizes='(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw'
                    src={ogUrl}
                    unoptimized
                  />
                </div>
                <div className='p-5'>
                  <div className='mb-2 flex items-center gap-2 text-muted-foreground text-xs'>
                    <time dateTime={entry.date}>
                      {format(new Date(entry.date), 'MMM d, yyyy')}
                    </time>
                    {entry.version ? (
                      <span className='rounded-full border border-border px-2 py-0.5 font-mono'>
                        v{entry.version}
                      </span>
                    ) : null}
                  </div>
                  <h2 className='font-semibold text-lg tracking-tight'>
                    {entry.title}
                  </h2>
                  <p className='mt-2 line-clamp-2 text-muted-foreground text-sm'>
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
