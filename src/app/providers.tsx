'use client'

import { ProgressProvider } from '@bprogress/next/app'
import { AuthUIProvider } from 'better-auth-ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { TailwindIndicator } from '@/components/tailwind-indicator'
import { SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { authClient } from '@/lib/auth-client'

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter()

  return (
    <ThemeProvider
      attribute='class'
      defaultTheme='system'
      disableTransitionOnChange
      enableSystem
    >
      <TooltipProvider>
        <SidebarProvider className='w-full'>
          <AuthUIProvider
            authClient={authClient}
            Link={Link}
            navigate={(href) =>
              router.push(href as unknown as Parameters<typeof router.push>[0])
            }
            onSessionChange={() => {
              router.refresh()
            }}
            replace={(href) =>
              router.replace(
                href as unknown as Parameters<typeof router.replace>[0]
              )
            }
            social={{
              providers: ['github'],
            }}
          >
            <ProgressProvider
              color='var(--color-primary)'
              delay={1000}
              height='2px'
              options={{
                showSpinner: false,
              }}
              shallowRouting
              startOnLoad
              stopDelay={1000}
            >
              {children}
              <Toaster position='top-center' />
              <TailwindIndicator />
            </ProgressProvider>
          </AuthUIProvider>
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
