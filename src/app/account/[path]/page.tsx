import { AccountView } from 'better-auth-ui'
import { accountViewPaths } from 'better-auth-ui/server'

export const dynamicParams = false

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
