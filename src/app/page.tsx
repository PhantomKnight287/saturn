'use client'

import { UserAvatar } from 'better-auth-ui'
import { Loader2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useSession } from '@/lib/auth-client'

export default function Home() {
  const { data: session, isPending: isLoading } = useSession()
  const user = session?.user

  if (!(isLoading || user)) {
    return redirect('/auth/sign-in?redirectTo=/')
  }

  return (
    <main className='flex min-h-[calc(100dvh-3.5rem)] w-full items-center justify-center px-6 py-10'>
      {isLoading && (
        <div className='flex items-center gap-3 text-muted-foreground text-sm'>
          <Loader2 className='size-4 animate-spin' />
          Loading...
        </div>
      )}

      {!isLoading && user && (
        <Card className='w-full max-w-sm shrink-0 rounded-3xl'>
          <CardHeader className='items-center text-center'>
            <div className='flex justify-center'>
              <UserAvatar size='lg' user={user} />
            </div>
            <CardTitle className='mt-2 max-w-full truncate text-2xl'>
              {user.name ?? 'Unnamed user'}
            </CardTitle>
            <CardDescription className='max-w-full truncate' title={user.email}>
              {user.email}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </main>
  )
}
