import { AuthView } from 'better-auth-ui'
import { authViewPaths } from 'better-auth-ui/server'

export const dynamicParams = false

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }))
}

export default async function AuthPage({ params }: PageProps<'/auth/[path]'>) {
  const { path } = await params

  return (
    <main className='container flex grow flex-col items-center justify-center self-center p-4 md:p-6'>
      <AuthView pathname={path} />
    </main>
  )
}
