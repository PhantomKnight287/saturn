import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { getSession } from '@/server/auth'

export default async function Dashboard() {
  const session = await getSession()
  if (!session) {
    redirect('/auth/sign-in?redirectTo=/dashboard')
  }
  const organizations = await authClient.organization.list({
    fetchOptions: { headers: await headers() },
  })
  if (!organizations.data || organizations.data.length === 0) {
    redirect('/onboarding')
  }
  redirect(`/${organizations.data[0]!.slug}`)
  return null
}
