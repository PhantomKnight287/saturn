import { AccountView } from 'better-auth-ui'
import { accountViewPaths } from 'better-auth-ui/server'
import type { Metadata } from 'next'
import { createMetadata } from '@/lib/metadata'

export const dynamicParams = false

export const metadata: Metadata = createMetadata({
  title: 'Account',
  description: 'Manage your Saturn account, security, and connected sessions.',
  openGraph: {
    images: ['/api/og?page=Account'],
  },
  twitter: {
    images: ['/api/og?page=Account'],
  },
})

export function generateStaticParams() {
  return Object.values(accountViewPaths).map((path) => ({
    path,
  }))
}

export default async function AccountPage({
  params,
}: PageProps<'/auth/[path]'>) {
  const { path } = await params

  return (
    <main className='container self-center p-4 md:p-6'>
      <AccountView
        classNames={{
          sidebar: {
            base: 'sticky top-20',
          },
        }}
        pathname={path}
      />
    </main>
  )
}
