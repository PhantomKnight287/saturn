/** biome-ignore-all lint/correctness/useUniqueElementIds: Need em to score to the section in home page */

import type { Metadata } from 'next'
import { getGithubStars } from '@/cache/github'
import { createMetadata } from '@/lib/metadata'
import LandingPageClient from './page.client'

export const metadata: Metadata = createMetadata({
  description:
    'Saturn brings projects, timesheets, invoices, and client management into one place — the operating system for your freelance business.',
  openGraph: {
    images: ['/api/og?page=Saturn'],
  },
  twitter: {
    images: ['/api/og?page=Saturn'],
  },
})

export default async function LandingPage() {
  const githubStars = await getGithubStars('phantomknight287/saturn')
  return <LandingPageClient githubStars={githubStars} />
}
