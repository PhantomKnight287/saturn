import { Polar } from '@polar-sh/sdk'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { env } from '@/env'
import { cn } from '@/lib/utils'
import { getSession } from '@/server/auth'

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getSession()
  if (!session) {
    redirect('/auth/sign-in')
  }

  const { checkout_id: checkoutId } = await searchParams
  if (!checkoutId || typeof checkoutId !== 'string') {
    redirect('/')
  }

  const polar = new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN,
    server: env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  })

  const checkout = await polar.checkouts
    .get({ id: checkoutId })
    .catch(() => null)

  if (!checkout || checkout.status !== 'succeeded') {
    return (
      <main className='container flex flex-1 flex-col items-center justify-center p-4 md:p-6'>
        <Card className='w-full max-w-sm'>
          <CardHeader>
            <CardTitle>
              Checkout {checkout ? 'Incomplete' : 'Not Found'}
            </CardTitle>
            <CardDescription>
              {checkout
                ? `Your checkout is currently ${checkout.status}. Please try again or contact support.`
                : "We couldn't find this checkout session. It may have expired."}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link
              className={cn(buttonVariants({ variant: 'outline' }))}
              href='/'
            >
              Go Home
            </Link>
          </CardFooter>
        </Card>
      </main>
    )
  }

  const productName = checkout.product?.name ?? 'Pro'
  const amount = checkout.totalAmount ?? 0
  const currency = checkout.currency ?? 'usd'

  const formattedAmount = (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency,
  })

  return (
    <main className='flex w-full flex-1 flex-col items-center justify-center p-4 md:p-6'>
      <Card className='w-full max-w-sm'>
        <CardHeader>
          <CardTitle>Welcome to {productName}!</CardTitle>
          <CardDescription>
            Your payment was successful. Premium features are now active for
            your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className='space-y-3 text-sm'>
            <div className='flex items-center justify-between'>
              <dt className='text-muted-foreground'>Plan</dt>
              <dd className='font-medium'>{productName}</dd>
            </div>
            <div className='flex items-center justify-between'>
              <dt className='text-muted-foreground'>Amount</dt>
              <dd className='font-medium'>{formattedAmount}</dd>
            </div>
            <div className='flex items-center justify-between'>
              <dt className='text-muted-foreground'>Status</dt>
              <dd className='font-medium text-teal-600 dark:text-teal-400'>
                Active
              </dd>
            </div>
            {checkout.customerEmail && (
              <div className='flex items-center justify-between'>
                <dt className='text-muted-foreground'>Receipt sent to</dt>
                <dd className='font-medium'>{checkout.customerEmail}</dd>
              </div>
            )}
          </dl>
        </CardContent>
        <CardFooter>
          <Link className={cn(buttonVariants())} href='/dashboard'>
            Go to Dashboard
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}
