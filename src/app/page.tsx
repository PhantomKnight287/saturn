/** biome-ignore-all lint/correctness/useUniqueElementIds: Need em to score to the section in home page */

import type { Metadata } from 'next'
import { getGithubStars } from '@/cache/github'
import { createMetadata } from '@/lib/metadata'
import { LandingStructuredData } from './_landing/structured-data'
import LandingPageClient from './page.client'

export const metadata: Metadata = createMetadata({
  title: {
    absolute: 'Saturn: The All-in-One Operating System for Freelancers and Agencies',
  },
  description:
    'Manage your freelance business effortlessly with Saturn. Projects, timesheets, invoices, and client management all in one place. Start your free trial today!',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    images: ['/api/og?page=Saturn'],
  },
  twitter: {
    images: ['/api/og?page=Saturn'],
  },
})

export default async function LandingPage() {
  const githubStars = await getGithubStars('phantomknight287/saturn')
  return (
    <>
      <LandingStructuredData />
      <LandingPageClient githubStars={githubStars} />
    </>
  )
}
