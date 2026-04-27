import { allChangelogs } from 'content-collections'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button-variants'
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

  return (
    <main className='mx-auto max-w-3xl px-6 py-16'>
      <Link
        className={buttonVariants({
          variant: 'ghost',
          className: 'text-muted-foreground',
        })}
        href='/changelogs'
      >
        <ArrowLeft className='size-4' /> All updates
      </Link>

      <header className='mt-6 mb-10'>
        <div className='mb-3 flex items-center gap-3 text-muted-foreground text-sm'>
          <time dateTime={entry.date}>
            {format(new Date(entry.date), 'MMMM d, yyyy')}
          </time>
          {entry.version ? (
            <span className='rounded-full border border-border px-2 py-0.5 font-mono text-xs'>
              v{entry.version}
            </span>
          ) : null}
        </div>
        <h1 className='font-bold text-4xl tracking-tight'>{entry.title}</h1>
        <p className='mt-3 text-lg text-muted-foreground'>
          {entry.description}
        </p>
      </header>

      <article
        className='prose prose-neutral dark:prose-invert max-w-none'
        // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted local markdown
        dangerouslySetInnerHTML={{ __html: entry.html }}
      />
    </main>
  )
}
