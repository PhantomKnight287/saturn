import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createMetadata } from '@/lib/metadata'
import { getSession } from '@/server/auth'
import OnboardingPageClient from './page.client'

export const metadata: Metadata = createMetadata({
  title: 'Create workspace',
  description: 'Set up a new Saturn workspace to start managing your work.',
  openGraph: {
    images: ['/api/og?page=Onboarding'],
  },
  twitter: {
    images: ['/api/og?page=Onboarding'],
  },
})

export default async function Onboarding() {
  const session = await getSession()
  if (!session) {
    redirect('/auth/sign-in?redirectTo=/onboarding')
  }
  return (
    <div className='flex flex-1 flex-col items-center justify-center gap-4'>
      <OnboardingPageClient />
    </div>
  )
}
