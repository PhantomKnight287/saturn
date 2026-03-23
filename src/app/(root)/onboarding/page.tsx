import { redirect } from 'next/navigation'
import { getSession } from '@/server/auth'
import OnboardingPageClient from './page.client'

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
