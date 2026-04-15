import type { Metadata } from 'next'
import { env } from '@/env'
import { APP_DEFAULT_TITLE } from './constants'

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    icons: {
      icon: '/wordmark/logo_for_mark.png',
      shortcut: '/wordmark/logo_for_mark.png',
      apple: '/wordmark/logo_for_mark.png',
    },
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: baseUrl.toString(),
      images: '/opengraph-image.png',
      siteName: APP_DEFAULT_TITLE,
      ...override.openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      creator: '@gurpalsingh287',
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      images: '/twitter-image.png',
      ...override.twitter,
    },
  }
}

export const baseUrl =
  env.NODE_ENV === 'development' || !env.NEXT_PUBLIC_BASE_URL
    ? new URL('http://localhost:3000')
    : new URL(env.NEXT_PUBLIC_BASE_URL)
