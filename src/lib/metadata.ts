import type { Metadata } from 'next'
import { env } from '@/env'
import { APP_DEFAULT_TITLE } from './constants'

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    alternates: {
      canonical: '/',
      ...override.alternates,
    },
    robots: {
      index: true,
      follow: true,
      ...(typeof override.robots === 'object' && override.robots !== null
        ? override.robots
        : {}),
    },
    icons: {
      icon: '/icon.svg',
      shortcut: '/icon.svg',
      apple: '/icon.svg',
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
