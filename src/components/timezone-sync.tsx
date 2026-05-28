'use client'

import { useAction } from 'next-safe-action/hooks'
import { useEffect, useRef } from 'react'
import { updateTimezoneAction } from '@/lib/actions/timezone.action'
import { authClient } from '@/lib/auth-client'

/**
 * Invisibly keeps `users.timezone` in sync with the viewer's device zone. Runs
 * for any authenticated viewer (no-op when logged out) and writes only when the
 * detected zone differs from what's stored — so it captures the zone right
 * after sign-up and follows the user if they later change timezones.
 */
export function TimezoneSync() {
  const { data: session } = authClient.useSession()
  const { execute } = useAction(updateTimezoneAction)

  const userId = session?.user.id
  const stored = session?.user.timezone
  const lastSentTimezone = useRef<string | null>(null)

  useEffect(() => {
    if (!userId) {
      return
    }
    const sync = () => {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (
        detected &&
        detected !== stored &&
        detected !== lastSentTimezone.current
      ) {
        lastSentTimezone.current = detected
        execute({ timezone: detected })
      }
    }
    sync()
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        sync()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    const id = window.setInterval(sync, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(id)
    }
  }, [userId, stored, execute])

  return null
}
