import { allChangelogs } from 'content-collections'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createMetadata } from '@/lib/metadata'

export function generateStaticParams() {
  return allChangelogs.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({
  params,
}: PageProps<'/changelog/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const entry = allChangelogs.find((c) => c.slug === slug)
  if (!entry) {
    return createMetadata({ title: 'Changelog' })
  }
  const ogUrl = `/api/og?page=${encodeURIComponent(entry.title)}&subtitle=${encodeURIComponent(entry.description)}`
  return createMetadata({
    title: `${entry.title} — Changelog`,
    description: entry.description,
    openGraph: { images: ogUrl },
    twitter: { images: ogUrl },
  })
}

export default async function ChangelogEntryPage({
  params,
}: PageProps<'/changelog/[slug]'>) {
  const { slug } = await params
  const entry = allChangelogs.find((c) => c.slug === slug)
  if (!entry) {
    notFound()
  }

  const sorted = [...allChangelogs].sort((a, b) => (a.date < b.date ? 1 : -1))
  const index = sorted.findIndex((c) => c.slug === slug)
  const prev = index < sorted.length - 1 ? sorted[index + 1] : null
  const next = index > 0 ? sorted[index - 1] : null

  const ogUrl = `/api/og?page=${encodeURIComponent(entry.title)}&subtitle=${encodeURIComponent(entry.description)}`

  return (
    <main className='mx-auto w-full max-w-3xl px-6 pt-12 pb-24'>
      <Link
        className='inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em] transition-colors hover:text-foreground'
        href='/changelogs'
      >
        <ArrowLeft className='size-3' /> All changelogs
      </Link>

      <header className='mt-10 mb-12 border-border/60 border-b pb-12'>
        <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
          / changelog
        </div>
        <div className='mt-3 flex items-center gap-3 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]'>
          <time dateTime={entry.date}>
            {format(new Date(entry.date), 'MMMM d, yyyy')}
          </time>
          {entry.version ? (
            <>
              <span className='h-1 w-1 rounded-full bg-muted-foreground/40' />
              <span>v{entry.version}</span>
            </>
          ) : null}
        </div>
        <h1 className='mt-5 font-semibold text-4xl text-foreground leading-[1] tracking-[-0.03em] sm:text-5xl'>
          {entry.title}
        </h1>
        <p className='mt-5 text-muted-foreground text-xl leading-relaxed'>
          {entry.description}
        </p>
      </header>

      <div className='relative mb-14 aspect-[1200/630] w-full overflow-hidden rounded-2xl border border-border/60 bg-card'>
        <Image
          alt={entry.title}
          className='object-cover'
          fill
          priority
          sizes='(max-width: 768px) 100vw, 768px'
          src={ogUrl}
          unoptimized
        />
      </div>

      <article
        className='prose prose-neutral dark:prose-invert prose-h2:mt-12 prose-h3:mt-10 max-w-none prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-headings:font-semibold prose-a:text-primary prose-code:text-sm prose-h2:text-2xl prose-h3:text-xl prose-p:text-base prose-p:text-foreground/80 prose-p:leading-relaxed prose-headings:tracking-[-0.02em] prose-a:no-underline prose-code:before:content-none prose-code:after:content-none prose-a:hover:underline'
        // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted local markdown
        dangerouslySetInnerHTML={{ __html: entry.html }}
      />

      {(prev || next) && (
        <nav className='mt-20 grid grid-cols-1 gap-3 border-border/60 border-t pt-10 sm:grid-cols-2'>
          {prev ? (
            <Link
              className='group flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-5 transition hover:border-primary/40'
              href={`/changelog/${prev.slug}`}
            >
              <span className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
                ← Previous
              </span>
              <span className='font-medium text-base text-foreground tracking-tight transition-colors group-hover:text-primary'>
                {prev.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              className='group flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-5 text-right transition hover:border-primary/40 sm:items-end'
              href={`/changelog/${next.slug}`}
            >
              <span className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
                Next →
              </span>
              <span className='font-medium text-base text-foreground tracking-tight transition-colors group-hover:text-primary'>
                {next.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  )
}
