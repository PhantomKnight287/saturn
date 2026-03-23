import { Databuddy } from '@databuddy/sdk/react'
import type { Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import '@/styles/globals.css'
import {
  APP_DEFAULT_TITLE,
  APP_DESCRIPTION,
  APP_TITLE_TEMPLATE,
} from '@/lib/constants'
import { baseUrl, createMetadata } from '@/lib/metadata'
import { Providers } from './providers'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata = createMetadata({
  title: {
    template: APP_TITLE_TEMPLATE,
    default: APP_DEFAULT_TITLE,
  },
  description: APP_DESCRIPTION,
  metadataBase: baseUrl,
})

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
    { media: '(prefers-color-scheme: light)', color: '#fff' },
  ],
  initialScale: 1,
  viewportFit: 'cover',
  width: 'device-width',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-svh flex-col antialiased`}
      >
        <Providers>{children}</Providers>
        <Databuddy
          clientId='f825ca92-af36-4b2b-8c19-e9337cf65427'
          trackErrors={true}
          trackInteractions={true}
          trackOutgoingLinks={true}
          trackScrollDepth={true}
          trackWebVitals={true}
        />
      </body>
    </html>
  )
}
