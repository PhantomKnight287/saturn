'use client'

import { CreditCard, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { proPlanFeatures } from '@/app/_landing/data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { authClient, useSession } from '@/lib/auth-client'

interface SubscriptionState {
  currentPeriodEnd?: string
  productName?: string
  status: 'loading' | 'free' | 'active'
}

export function BillingCard() {
  const session = useSession()
  const [subscription, setSubscription] = useState<SubscriptionState>({
    status: 'loading',
  })
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    authClient.customer.subscriptions
      .list({
        query: {
          limit: 1,
          active: true,
          referenceId: session.data?.user.id,
        },
      })
      .then(
        ({
          data,
        }: {
          data: {
            result: {
              items: { currentPeriodEnd?: string; productName?: string }[]
            }
          } | null
        }) => {
          const sub = data?.result?.items?.[0]
          if (sub) {
            setSubscription({
              status: 'active',
              currentPeriodEnd: sub.currentPeriodEnd,
              productName: sub.productName,
            })
          } else {
            setSubscription({ status: 'free' })
          }
        }
      )
      .catch(() => {
        setSubscription({ status: 'free' })
      })
  }, [session.data?.user.id])

  const handleUpgrade = useCallback(async () => {
    setCheckoutLoading(true)
    try {
      await authClient.checkout({
        slug: 'pro-plan',
        referenceId: session.data?.user.id,
      })
    } catch {
      toast.error('Failed to start checkout')
      setCheckoutLoading(false)
    }
  }, [session.data?.user.id])

  const handleManageBilling = useCallback(async () => {
    try {
      await authClient.customer.portal()
    } catch {
      toast.error('Failed to open billing portal')
    }
  }, [])

  if (subscription.status === 'loading') {
    return null
  }

  return (
    <Card
      className={
        subscription.status === 'free'
          ? 'border-primary/30 bg-linear-to-br from-primary/5 to-transparent'
          : ''
      }
    >
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='space-y-1'>
            <CardTitle className='flex items-center gap-2'>
              Plan & Billing
              {subscription.status === 'active' ? (
                <Badge
                  className='border-teal-300 bg-teal-100 text-teal-800 dark:border-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                  variant='outline'
                >
                  Pro
                </Badge>
              ) : (
                <Badge variant='outline'>Free</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {subscription.status === 'active'
                ? 'Your workspace is on the Pro plan.'
                : 'Upgrade to Pro to unlock premium features for your workspace.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {subscription.status === 'active' ? (
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='rounded-lg border p-3'>
                <p className='text-muted-foreground text-sm'>Current Plan</p>
                <p className='font-medium text-lg'>
                  {subscription.productName ?? 'Pro'}
                </p>
              </div>
              {subscription.currentPeriodEnd && (
                <div className='rounded-lg border p-3'>
                  <p className='text-muted-foreground text-sm'>Renews On</p>
                  <p className='font-medium text-lg'>
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                      'en-US',
                      {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      }
                    )}
                  </p>
                </div>
              )}
            </div>
            <Button
              onClick={handleManageBilling}
              type='button'
              variant='outline'
            >
              <CreditCard className='size-4' />
              Manage Billing
            </Button>
          </div>
        ) : (
          <div className='space-y-4'>
            <ul className='space-y-2 text-muted-foreground text-sm'>
              {proPlanFeatures.map((e) => (
                <li className='flex items-center gap-2' key={e}>
                  <Sparkles className='size-4 text-primary' />
                  {e}
                </li>
              ))}
            </ul>
            <Button
              loading={checkoutLoading}
              onClick={handleUpgrade}
              type='button'
            >
              <Sparkles className='size-4' />
              Upgrade to Pro
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
